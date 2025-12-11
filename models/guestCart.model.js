// models/guestCart.model.js
const mongoose = require("mongoose");

const guestItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true }, // visible quantity in unit
  unit: { type: String, required: true },
  quantityBase: { type: Number, required: true }, // base units (g/ml/pcs)
  priceAtAdd: { type: Number, required: true }, // snapshot price
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const guestCartSchema = new mongoose.Schema({
  guestCartId: { type: String, required: true, unique: true }, // UUID
  items: [guestItemSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } // optional TTL usage (30 days)
});

// optional TTL index if you want automatic expiry (set expiresAt when creating)
guestCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GuestCart = mongoose.model("GuestCart", guestCartSchema);
module.exports = GuestCart;
