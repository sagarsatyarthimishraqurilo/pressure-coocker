// models/category.model.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },        // large image for category banner
    imagePublicId: { type: String, default: "" },   // cloudinary public id
    iconUrl: { type: String, default: "" },         // small icon used in listings
    iconPublicId: { type: String, default: "" },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
