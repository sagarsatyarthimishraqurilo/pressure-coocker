// controllers/categoryController.js
const Category = require('../models/categoryModels');
const Product = require('../models/productModels');
const cloudinary = require('../utils/cloudinary');
const mongoose = require('mongoose');

// helper to upload single buffer file (returns { url, publicId })
const uploadBufferToCloudinary = async (buffer, folder = 'categories') => {
  const res = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
  return { url: res.secure_url, publicId: res.public_id };
};

// CREATE category (admin)
const createCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "name and slug are required" });
    }

    const exists = await Category.findOne({ $or: [{ name }, { slug }] });
    if (exists) return res.status(400).json({ success: false, message: "Category name or slug already exists" });

    const cat = new Category({ name, slug, description });

    // files come from multer.fields: req.files.image, req.files.icon
    if (req.files && req.files.image && req.files.image[0]) {
      const up = await uploadBufferToCloudinary(req.files.image[0].buffer, 'categories/image');
      cat.imageUrl = up.url;
      cat.imagePublicId = up.publicId;
    }
    if (req.files && req.files.icon && req.files.icon[0]) {
      const up2 = await uploadBufferToCloudinary(req.files.icon[0].buffer, 'categories/icon');
      cat.iconUrl = up2.url;
      cat.iconPublicId = up2.publicId;
    }

    await cat.save();
    return res.status(201).json({ success: true, category: cat });
  } catch (err) {
    console.error("createCategory", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// LIST categories (public) — optimized for dropdown (return id, name, slug, iconUrl)
const listCategories = async (req, res) => {
  try {
    // optional query param ?activeOnly=true
    const activeOnly = req.query.activeOnly === 'true';
    const filter = activeOnly ? { active: true } : {};
    const cats = await Category.find(filter).select("_id name slug iconUrl imageUrl description").sort({ name: 1 });
    return res.status(200).json({ success: true, items: cats });
  } catch (err) {
    console.error("listCategories", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET single category
const getCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }
    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, category: cat });
  } catch (err) {
    console.error("getCategory", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE category (admin) - supports replacing image/icon
const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }
    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

    const { name, slug, description, active } = req.body;
    if (name) cat.name = name;
    if (slug) cat.slug = slug;
    if (description !== undefined) cat.description = description;
    if (active !== undefined) cat.active = !!active;

    // Replace images if new provided
    if (req.files && req.files.image && req.files.image[0]) {
      // delete old image from cloudinary (if exists)
      if (cat.imagePublicId) {
        try { await cloudinary.uploader.destroy(cat.imagePublicId); } catch (e) { console.warn(e); }
      }
      const up = await uploadBufferToCloudinary(req.files.image[0].buffer, 'categories/image');
      cat.imageUrl = up.url;
      cat.imagePublicId = up.publicId;
    }
    if (req.files && req.files.icon && req.files.icon[0]) {
      if (cat.iconPublicId) {
        try { await cloudinary.uploader.destroy(cat.iconPublicId); } catch (e) { console.warn(e); }
      }
      const up2 = await uploadBufferToCloudinary(req.files.icon[0].buffer, 'categories/icon');
      cat.iconUrl = up2.url;
      cat.iconPublicId = up2.publicId;
    }

    await cat.save();
    return res.status(200).json({ success: true, category: cat });
  } catch (err) {
    console.error("updateCategory", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE category (admin) — with reassign logic
// Accept body: { reassignToCategoryId: "<id>" } (optional). If provided, products moved to that category.
// If not provided, products will have category set to null.
const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { reassignToCategoryId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }
    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

    // validate reassignToCategoryId if provided
    if (reassignToCategoryId) {
      if (!mongoose.Types.ObjectId.isValid(reassignToCategoryId)) {
        return res.status(400).json({ success: false, message: "Invalid reassignToCategoryId" });
      }
      const reCat = await Category.findById(reassignToCategoryId);
      if (!reCat) return res.status(400).json({ success: false, message: "Target category for reassignment not found" });
    }

    // Reassign products (soft update)
    const newCategoryValue = reassignToCategoryId ? mongoose.Types.ObjectId(reassignToCategoryId) : null;
    await Product.updateMany({ category: cat._id }, { $set: { category: newCategoryValue } });

    // Remove category images from cloudinary (optional: we can keep them)
    if (cat.imagePublicId) {
      try { await cloudinary.uploader.destroy(cat.imagePublicId); } catch (e) { console.warn(e); }
    }
    if (cat.iconPublicId) {
      try { await cloudinary.uploader.destroy(cat.iconPublicId); } catch (e) { console.warn(e); }
    }

    // Delete category doc
    await Category.findByIdAndDelete(cat._id);

    return res.status(200).json({ success: true, message: "Category deleted and products reassigned" });
  } catch (err) {
    console.error("deleteCategory", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory
};
