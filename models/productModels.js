// models/product.model.js
const mongoose = require("mongoose");

const productImageSchema = new mongoose.Schema({
    url: String,
    publicId: String
}, { _id: false });

const productSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // vendor id
    productName: { type: String, required: true },
    productDescription: { type: String, required: true },
    productImage: [productImageSchema],
    productPrice: { type: Number, required: true, default: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    brand: { type: String },
    // New unit/stock fields
    stockBase: { type: Number, default: 0 }, // stored in base units (g, ml, pcs)
    displayUnit: { type: String, default: "pcs" }, // e.g. "kg", "g", "l", "ml", "pcs"
    unitType: { type: String, enum: ["weight", "volume", "count"], default: "count" },

    isActive: { type: Boolean, default: true }, // hide product without deleting
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

productSchema.index({ productName: "text", productDescription: "text" });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
