// // controllers/productController.js
// const Product = require('../models/productModels');
// const cloudinary = require('../utils/cloudinary');
// const mongoose = require('mongoose');

// // helper: upload buffers array -> image objects
// const uploadFilesToCloudinary = async (files) => {
//     const images = [];
//     for (const file of files) {
//         const uploadResult = await new Promise((resolve, reject) => {
//             const stream = cloudinary.uploader.upload_stream({ folder: "products" }, (error, result) => {
//                 if (error) return reject(error);
//                 resolve(result);
//             });
//             stream.end(file.buffer);
//         });
//         images.push({ url: uploadResult.secure_url, publicId: uploadResult.public_id });
//     }
//     return images;
// };

// // Create product (vendor)
// const createProduct = async (req, res) => {
//     try {
//         const vendor = req.user;
//         if (!vendor) return res.status(401).json({ success: false, message: "Unauthorized" });
//         if (vendor.role !== 'vendor') return res.status(403).json({ success: false, message: "Only vendors can create products" });
//         if (vendor.isBlocked) return res.status(403).json({ success: false, message: "Vendor account blocked" });

//         const { productName, productDescription, productPrice = 0, categoryId = null, brand = "", stock = 0 } = req.body;

//         if (!productName || !productDescription) {
//             return res.status(400).json({ success: false, message: "productName and productDescription are required" });
//         }

//         const images = (req.files && req.files.length) ? await uploadFilesToCloudinary(req.files) : [];

//         const newProduct = await Product.create({
//             userId: vendor._id,
//             productName,
//             productDescription,
//             productImage: images,
//             productPrice: Number(productPrice),
//             category: categoryId ? new mongoose.Types.ObjectId(categoryId) : null,
//             brand,
//             stock: Number(stock),
//             isActive: true
//         });

//         return res.status(201).json({ success: true, product: newProduct });
//     } catch (err) {
//         console.error("createProduct", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// // Get product by id (public)
// const getProductById = async (req, res) => {
//     try {
//         const { productId } = req.params;
//         const product = await Product.findById(productId).populate('userId', 'firstName lastName email role isBlocked');
//         if (!product || !product.isActive) {
//             return res.status(404).json({ success: false, message: "Product not found" });
//         }
//         if (product.userId && product.userId.isBlocked) {
//             return res.status(404).json({ success: false, message: "Product not found" });
//         }
//         return res.status(200).json({ success: true, product });
//     } catch (err) {
//         console.error("getProductById", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// // List products (public) - excludes products from blocked vendors and inactive products
// const listProducts = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page || '1');
//         const limit = parseInt(req.query.limit || '20');
//         const q = req.query.q || null;
//         // accept category via query param or route param
//         const category = req.query.category || req.params.categoryId || null;
//         const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
//         const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;

//         const match = { isActive: true };

//         if (category) match.category = new mongoose.Types.ObjectId(category);
//         if (minPrice !== null || maxPrice !== null) {
//             match.productPrice = {};
//             if (minPrice !== null) match.productPrice.$gte = minPrice;
//             if (maxPrice !== null) match.productPrice.$lte = maxPrice;
//         }
//         if (q) match.$text = { $search: q };

//         const agg = [
//             { $match: match },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "userId",
//                     foreignField: "_id",
//                     as: "vendor"
//                 }
//             },
//             { $unwind: "$vendor" },
//             { $match: { "vendor.isBlocked": { $ne: true }, "vendor.role": "vendor" } },
//             {
//                 $project: {
//                     "vendor.password": 0,
//                     "vendor.token": 0,
//                     "vendor.otp": 0,
//                     "vendor.otpExpiry": 0
//                 }
//             },
//             { $sort: { createdAt: -1 } },
//             { $skip: (page - 1) * limit },
//             { $limit: limit }
//         ];

//         const items = await Product.aggregate(agg);
//         return res.status(200).json({ success: true, page, limit, items });
//     } catch (err) {
//         console.error("listProducts", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// // New: listProductsByCategory (route /category/:categoryId)
// const listProductsByCategory = async (req, res) => {
//     try {
//         // reuse listProducts by letting it read req.params.categoryId
//         return listProducts(req, res);
//     } catch (err) {
//         console.error("listProductsByCategory", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// // New: listProductsByVendor (route /vendor/:vendorId) - public
// const listProductsByVendor = async (req, res) => {
//     try {
//         const vendorId = req.params.vendorId;
//         if (!mongoose.Types.ObjectId.isValid(vendorId)) {
//             return res.status(400).json({ success: false, message: "Invalid vendor id" });
//         }

//         // Only list active products and exclude blocked vendors
//         const vendor = await require('../models/user.models').findById(vendorId);
//         if (!vendor || vendor.role !== 'vendor' || vendor.isBlocked) {
//             return res.status(404).json({ success: false, message: "Vendor not found or blocked" });
//         }

//         const page = parseInt(req.query.page || '1');
//         const limit = parseInt(req.query.limit || '20');

//         const agg = [
//             { $match: { userId: new mongoose.Types.ObjectId(vendorId), isActive: true } },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "userId",
//                     foreignField: "_id",
//                     as: "vendor"
//                 }
//             },
//             { $unwind: "$vendor" },
//             {
//                 $project: {
//                     "vendor.password": 0,
//                     "vendor.token": 0,
//                     "vendor.otp": 0,
//                     "vendor.otpExpiry": 0
//                 }
//             },
//             { $sort: { createdAt: -1 } },
//             { $skip: (page - 1) * limit },
//             { $limit: limit }
//         ];

//         const items = await Product.aggregate(agg);
//         return res.status(200).json({ success: true, page, limit, items });
//     } catch (err) {
//         console.error("listProductsByVendor", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// // New: listMyProducts (route /my) — vendor's own products (requires isAuthenticated + isVendor)
// const listMyProducts = async (req, res) => {
//     try {
//         const vendor = req.user;
//         const page = parseInt(req.query.page || '1');
//         const limit = parseInt(req.query.limit || '50');

//         const agg = [
//             { $match: { userId:new mongoose.Types.ObjectId(vendor._id) } },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "userId",
//                     foreignField: "_id",
//                     as: "vendor"
//                 }
//             },
//             { $unwind: "$vendor" },
//             {
//                 $project: {
//                     "vendor.password": 0,
//                     "vendor.token": 0,
//                     "vendor.otp": 0,
//                     "vendor.otpExpiry": 0
//                 }
//             },
//             { $sort: { createdAt: -1 } },
//             { $skip: (page - 1) * limit },
//             { $limit: limit }
//         ];

//         const items = await Product.aggregate(agg);
//         return res.status(200).json({ success: true, page, limit, items });
//     } catch (err) {
//         console.error("listMyProducts", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };


// // Update product (owner or admin). Supports: update fields, add new images, remove images by publicId
// const updateProduct = async (req, res) => {
//     try {
//         const actor = req.user;
//         const { productId } = req.params;
//         const { productName, productDescription, productPrice, categoryId, brand, stock, removeImagePublicIds } = req.body;

//         const product = await Product.findById(productId);
//         if (!product) return res.status(404).json({ success: false, message: "Product not found" });

//         if (actor.role !== 'admin' && product.userId.toString() !== actor._id.toString()) {
//             return res.status(403).json({ success: false, message: "Not authorized to update this product" });
//         }

//         // Remove images if requested (do not delete DB doc yet until cloudinary deletion succeed)
//         if (removeImagePublicIds) {
//             const idsToRemove = Array.isArray(removeImagePublicIds) ? removeImagePublicIds : JSON.parse(removeImagePublicIds || '[]');
//             if (idsToRemove.length) {
//                 for (const publicId of idsToRemove) {
//                     try {
//                         await cloudinary.uploader.destroy(publicId);
//                     } catch (err) {
//                         console.warn("Failed to delete image from cloudinary:", publicId, err);
//                     }
//                 }
//                 // remove from product.productImage array
//                 product.productImage = product.productImage.filter(img => !idsToRemove.includes(img.publicId));
//             }
//         }

//         // Add new uploaded images
//         if (req.files && req.files.length) {
//             const newImages = await uploadFilesToCloudinary(req.files);
//             product.productImage = product.productImage.concat(newImages);
//         }

//         // Update other fields
//         if (productName) product.productName = productName;
//         if (productDescription) product.productDescription = productDescription;
//         if (productPrice !== undefined) product.productPrice = Number(productPrice);
//         if (categoryId !== undefined) product.category = categoryId ? new mongoose.Types.ObjectId(categoryId) : null;
//         if (brand !== undefined) product.brand = brand;
//         if (stock !== undefined) product.stock = Number(stock);

//         await product.save();
//         return res.status(200).json({ success: true, product });
//     } catch (err) {
//         console.error("updateProduct", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// // Soft-delete product (admin or owner)
// const deleteProduct = async (req, res) => {
//     try {
//         const actor = req.user;
//         const { productId } = req.params;
//         const product = await Product.findById(productId);
//         if (!product) return res.status(404).json({ success: false, message: "Product not found" });

//         if (actor.role !== 'admin' && product.userId.toString() !== actor._id.toString()) {
//             return res.status(403).json({ success: false, message: "Not authorized to delete this product" });
//         }

//         // Soft delete: set isActive=false so orders remain readable if they reference productId or snapshot
//         product.isActive = false;
//         await product.save();

//         return res.status(200).json({ success: true, message: "Product deactivated (soft-deleted)" });
//     } catch (err) {
//         console.error("deleteProduct", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// // Adjust stock (admin or vendor owner). body: { delta: number } (positive or negative)
// const adjustStock = async (req, res) => {
//     try {
//         const actor = req.user;
//         const { productId } = req.params;
//         const { delta } = req.body;
//         if (delta === undefined) return res.status(400).json({ success: false, message: "delta is required" });
//         const product = await Product.findById(productId);
//         if (!product) return res.status(404).json({ success: false, message: "Product not found" });

//         if (actor.role !== 'admin' && product.userId.toString() !== actor._id.toString()) {
//             return res.status(403).json({ success: false, message: "Not authorized to adjust stock" });
//         }

//         const newStock = product.stock + Number(delta);
//         if (newStock < 0) return res.status(400).json({ success: false, message: "Insufficient stock" });

//         // Atomic update
//         const updated = await Product.findOneAndUpdate(
//             { _id: productId },
//             { $inc: { stock: Number(delta) } },
//             { new: true }
//         );

//         return res.status(200).json({ success: true, product: updated });
//     } catch (err) {
//         console.error("adjustStock", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// // Decrement stock only if enough available (useful for order integration). Body: { quantity: number }
// const decrementStockIfAvailable = async (req, res) => {
//     try {
//         const { productId } = req.params;
//         const { quantity = 1 } = req.body;
//         if (quantity <= 0) return res.status(400).json({ success: false, message: "quantity must be >= 1" });

//         // Atomic conditional update
//         const updated = await Product.findOneAndUpdate(
//             { _id: productId, stock: { $gte: Number(quantity) } },
//             { $inc: { stock: -Number(quantity) } },
//             { new: true }
//         );

//         if (!updated) {
//             return res.status(400).json({ success: false, message: "Insufficient stock" });
//         }

//         return res.status(200).json({ success: true, product: updated });
//     } catch (err) {
//         console.error("decrementStockIfAvailable", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// module.exports = {
//     createProduct,
//     getProductById,
//     listProducts,
//     updateProduct,
//     deleteProduct,
//     adjustStock,
//     decrementStockIfAvailable,
//     listProductsByCategory,
//     listProductsByVendor,
//     listMyProducts
// };


// controllers/productController.js
const Product = require('../models/productModels'); // make sure file name matches
const cloudinary = require('../utils/cloudinary');
const mongoose = require('mongoose');
const { isValidUnit, getUnitInfo, toBase, fromBase } = require('../utils/units');
const User = require('../models/user.models'); // used for vendor lookups if needed

// helper: upload buffers array -> image objects
const uploadFilesToCloudinary = async (files) => {
  const images = [];
  for (const file of files) {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: "products" }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      stream.end(file.buffer);
    });
    images.push({ url: uploadResult.secure_url, publicId: uploadResult.public_id });
  }
  return images;
};

// ----------------- CREATE -----------------
const createProduct = async (req, res) => {
  try {
    const vendor = req.user;
    if (!vendor) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (vendor.role !== 'vendor') return res.status(403).json({ success: false, message: "Only vendors can create products" });
    if (vendor.isBlocked) return res.status(403).json({ success: false, message: "Vendor account blocked" });

    const {
      productName,
      productDescription,
      productPrice = 0,
      categoryId = null,
      brand = "",
      stock = 0,
      displayUnit // optional: e.g. "kg", "g", "pcs"
    } = req.body;

    if (!productName || !productDescription) {
      return res.status(400).json({ success: false, message: "productName and productDescription are required" });
    }

    // Determine displayUnit (fallback to 'pcs' if missing)
    const unit = displayUnit || 'pcs';
    if (!isValidUnit(unit)) {
      return res.status(400).json({ success: false, message: `Invalid displayUnit '${unit}'` });
    }
    const unitType = getUnitInfo(unit).type;

    // Convert provided stock (in displayUnit) to base units
    const stockNum = Number(stock || 0);
    if (isNaN(stockNum) || stockNum < 0) {
      return res.status(400).json({ success: false, message: "stock must be a non-negative number" });
    }
    const stockBase = toBase(stockNum, unit); // stored in base units (g/ml/pcs)

    const images = (req.files && req.files.length) ? await uploadFilesToCloudinary(req.files) : [];

    const newProduct = await Product.create({
      userId: vendor._id,
      productName,
      productDescription,
      productImage: images,
      productPrice: Number(productPrice),
      category: categoryId ? new mongoose.Types.ObjectId(categoryId) : null,
      brand,
      stockBase,
      displayUnit: unit,
      unitType,
      isActive: true
    });

    // convert returned product to include human-friendly stock
    const productObj = newProduct.toObject();
    productObj.stock = fromBase(productObj.stockBase || 0, productObj.displayUnit || 'pcs');

    return res.status(201).json({ success: true, product: productObj });
  } catch (err) {
    console.error("createProduct", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- GET BY ID -----------------
const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const product = await Product.findById(productId).populate('userId', 'firstName lastName email role isBlocked');
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (product.userId && product.userId.isBlocked) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const productObj = product.toObject();
    try {
      productObj.stock = fromBase(productObj.stockBase || 0, productObj.displayUnit || 'pcs');
    } catch (e) {
      productObj.stock = productObj.stockBase || 0;
    }

    return res.status(200).json({ success: true, product: productObj });
  } catch (err) {
    console.error("getProductById", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- LIST (general) -----------------
const listProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const q = req.query.q || null;
    // accept category via query param or route param
    const category = req.query.category || req.params.categoryId || null;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;

    const match = { isActive: true };

    if (category) match.category = new mongoose.Types.ObjectId(category);
    if (minPrice !== null || maxPrice !== null) {
      match.productPrice = {};
      if (minPrice !== null) match.productPrice.$gte = minPrice;
      if (maxPrice !== null) match.productPrice.$lte = maxPrice;
    }
    if (q) match.$text = { $search: q };

    const agg = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "vendor"
        }
      },
      { $unwind: "$vendor" },
      { $match: { "vendor.isBlocked": { $ne: true }, "vendor.role": "vendor" } },
      {
        $project: {
          "vendor.password": 0,
          "vendor.token": 0,
          "vendor.otp": 0,
          "vendor.otpExpiry": 0
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const items = await Product.aggregate(agg);

    // map items to include human-readable stock (in displayUnit)
    const mapped = items.map(it => {
      try {
        it.stock = fromBase(it.stockBase || 0, it.displayUnit || 'pcs');
      } catch (e) {
        it.stock = it.stockBase || 0;
      }
      return it;
    });

    return res.status(200).json({ success: true, page, limit, items: mapped });
  } catch (err) {
    console.error("listProducts", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- LIST BY CATEGORY -----------------
const listProductsByCategory = async (req, res) => {
  try {
    // reuse listProducts (it reads req.params.categoryId)
    return listProducts(req, res);
  } catch (err) {
    console.error("listProductsByCategory", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- LIST BY VENDOR (public) -----------------
const listProductsByVendor = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: "Invalid vendor id" });
    }

    // Only list active products and exclude blocked vendors
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor' || vendor.isBlocked) {
      return res.status(404).json({ success: false, message: "Vendor not found or blocked" });
    }

    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');

    const agg = [
      { $match: { userId: new mongoose.Types.ObjectId(vendorId), isActive: true } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "vendor"
        }
      },
      { $unwind: "$vendor" },
      {
        $project: {
          "vendor.password": 0,
          "vendor.token": 0,
          "vendor.otp": 0,
          "vendor.otpExpiry": 0
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const items = await Product.aggregate(agg);
    const mapped = items.map(it => {
      try {
        it.stock = fromBase(it.stockBase || 0, it.displayUnit || 'pcs');
      } catch (e) {
        it.stock = it.stockBase || 0;
      }
      return it;
    });

    return res.status(200).json({ success: true, page, limit, items: mapped });
  } catch (err) {
    console.error("listProductsByVendor", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- LIST MY PRODUCTS (vendor) -----------------
const listMyProducts = async (req, res) => {
  try {
    const vendor = req.user;
    if (!vendor) return res.status(401).json({ success: false, message: "Unauthorized" });

    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '50');

    const agg = [
      { $match: { userId: new mongoose.Types.ObjectId(vendor._id) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "vendor"
        }
      },
      { $unwind: "$vendor" },
      {
        $project: {
          "vendor.password": 0,
          "vendor.token": 0,
          "vendor.otp": 0,
          "vendor.otpExpiry": 0
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const items = await Product.aggregate(agg);
    const mapped = items.map(it => {
      try {
        it.stock = fromBase(it.stockBase || 0, it.displayUnit || 'pcs');
      } catch (e) {
        it.stock = it.stockBase || 0;
      }
      return it;
    });

    return res.status(200).json({ success: true, page, limit, items: mapped });
  } catch (err) {
    console.error("listMyProducts", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- UPDATE -----------------
const updateProduct = async (req, res) => {
  try {
    const actor = req.user;
    const { productId } = req.params;
    const {
      productName,
      productDescription,
      productPrice,
      categoryId,
      brand,
      // new fields:
      stock, // number in provided displayUnit (or existing displayUnit)
      displayUnit, // optional: new displayUnit string
      removeImagePublicIds
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (actor.role !== 'admin' && product.userId.toString() !== actor._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this product" });
    }

    // Remove images if requested
    if (removeImagePublicIds) {
      const idsToRemove = Array.isArray(removeImagePublicIds) ? removeImagePublicIds : JSON.parse(removeImagePublicIds || '[]');
      if (idsToRemove.length) {
        for (const publicId of idsToRemove) {
          try { await cloudinary.uploader.destroy(publicId); } catch (e) { console.warn(e); }
        }
        product.productImage = product.productImage.filter(img => !idsToRemove.includes(img.publicId));
      }
    }

    // Add new uploaded images
    if (req.files && req.files.length) {
      const newImages = await uploadFilesToCloudinary(req.files);
      product.productImage = product.productImage.concat(newImages);
    }

    // Update other fields
    if (productName) product.productName = productName;
    if (productDescription) product.productDescription = productDescription;
    if (productPrice !== undefined) product.productPrice = Number(productPrice);
    if (categoryId !== undefined) product.category = categoryId ? new mongoose.Types.ObjectId(categoryId) : null;
    if (brand !== undefined) product.brand = brand;

    // Handle displayUnit and stock update together
    if (displayUnit) {
      if (!isValidUnit(displayUnit)) {
        return res.status(400).json({ success: false, message: `Invalid displayUnit '${displayUnit}'` });
      }
      product.displayUnit = displayUnit;
      product.unitType = getUnitInfo(displayUnit).type;
      // note: do NOT change stockBase when changing displayUnit (stockBase is in base units)
    }

    if (stock !== undefined) {
      const useUnit = displayUnit || product.displayUnit || 'pcs';
      if (!isValidUnit(useUnit)) return res.status(400).json({ success: false, message: `Invalid unit '${useUnit}'` });
      const stockNum = Number(stock);
      if (isNaN(stockNum) || stockNum < 0) return res.status(400).json({ success: false, message: "stock must be a non-negative number" });
      product.stockBase = toBase(stockNum, useUnit);
    }

    await product.save();

    const productObj = product.toObject();
    try { productObj.stock = fromBase(productObj.stockBase || 0, productObj.displayUnit || 'pcs'); } catch(e) { productObj.stock = productObj.stockBase || 0; }

    return res.status(200).json({ success: true, product: productObj });
  } catch (err) {
    console.error("updateProduct", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- SOFT DELETE -----------------
const deleteProduct = async (req, res) => {
  try {
    const actor = req.user;
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (actor.role !== 'admin' && product.userId.toString() !== actor._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this product" });
    }

    product.isActive = false;
    await product.save();

    return res.status(200).json({ success: true, message: "Product deactivated (soft-deleted)" });
  } catch (err) {
    console.error("deleteProduct", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- ADJUST STOCK (delta with unit) -----------------
const adjustStock = async (req, res) => {
  try {
    const actor = req.user;
    const { productId } = req.params;
    // Accept: { delta: number, unit?: string } where delta is in unit (if unit omitted, assume product.displayUnit)
    let { delta, unit } = req.body;
    if (delta === undefined) return res.status(400).json({ success: false, message: "delta is required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (actor.role !== 'admin' && product.userId.toString() !== actor._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to adjust stock" });
    }

    const useUnit = unit || product.displayUnit || 'pcs';
    if (!isValidUnit(useUnit)) return res.status(400).json({ success: false, message: `Invalid unit '${useUnit}'` });

    const deltaNum = Number(delta);
    if (isNaN(deltaNum)) return res.status(400).json({ success: false, message: "delta must be a number" });

    const deltaBase = toBase(deltaNum, useUnit);

    // check not go negative
    const cur = await Product.findById(productId).select('stockBase');
    const newStockBase = (cur.stockBase || 0) + deltaBase;
    if (newStockBase < 0) return res.status(400).json({ success: false, message: "Insufficient stock" });

    const updated = await Product.findOneAndUpdate(
      { _id: productId },
      { $inc: { stockBase: deltaBase } },
      { new: true }
    );

    const result = updated.toObject();
    try { result.stock = fromBase(result.stockBase || 0, result.displayUnit || 'pcs'); } catch(e) { result.stock = result.stockBase || 0; }

    return res.status(200).json({ success: true, product: result });
  } catch (err) {
    console.error("adjustStock", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------- DECREMENT STOCK (atomic for orders) -----------------
const decrementStockIfAvailable = async (req, res) => {
  try {
    const { productId } = req.params;
    let { quantity = 1, unit } = req.body; // quantity in 'unit' or in product.displayUnit if omitted
    quantity = Number(quantity);
    if (isNaN(quantity) || quantity <= 0) return res.status(400).json({ success: false, message: "quantity must be >= 1" });

    const product = await Product.findById(productId).select('stockBase displayUnit');
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const useUnit = unit || product.displayUnit || 'pcs';
    if (!isValidUnit(useUnit)) return res.status(400).json({ success: false, message: `Invalid unit '${useUnit}'` });

    const qtyBase = toBase(quantity, useUnit);

    const updated = await Product.findOneAndUpdate(
      { _id: productId, stockBase: { $gte: qtyBase } },
      { $inc: { stockBase: -qtyBase } },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    const result = updated.toObject();
    try { result.stock = fromBase(result.stockBase || 0, result.displayUnit || 'pcs'); } catch(e) { result.stock = result.stockBase || 0; }

    return res.status(200).json({ success: true, product: result });
  } catch (err) {
    console.error("decrementStockIfAvailable", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createProduct,
  getProductById,
  listProducts,
  listProductsByCategory,
  listProductsByVendor,
  listMyProducts,
  updateProduct,
  deleteProduct,
  adjustStock,
  decrementStockIfAvailable
};
