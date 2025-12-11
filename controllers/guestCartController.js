// controllers/guestCartController.js
const cartService = require("../services/cartService");

// Create guest cart (returns guestCartId)
exports.createGuestCart = async (req, res) => {
  try {
    const id = await cartService.createGuestCart();
    return res.status(201).json({ success: true, guestCartId: id });
  } catch (err) {
    console.error("createGuestCart:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Add item to guest cart
exports.addItem = async (req, res) => {
  try {
    const { guestCartId } = req.params;
    const { productId, quantity, unit } = req.body;
    const gc = await cartService.addItemToGuestCart(guestCartId, productId, quantity, unit);
    return res.json({ success: true, guestCart: gc });
  } catch (err) {
    console.error("guest addItem:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// Get guest cart
exports.getGuestCart = async (req, res) => {
  try {
    const { guestCartId } = req.params;
    const GuestCart = require("../models/guestCart.model");
    const gc = await GuestCart.findOne({ guestCartId });
    return res.json({ success: true, guestCart: gc || { items: [] } });
  } catch (err) {
    console.error("getGuestCart:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
