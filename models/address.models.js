const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  fullName: { type: String, required: true },
  phone: { type: String, required: true },

  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },

  latitude: { type: Number },
  longitude: { type: Number },

  addressType: { type: String, enum: ["home", "work", "other"], default: "home" },
  isDefault: { type: Boolean, default: false },

}, { timestamps: true });

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
