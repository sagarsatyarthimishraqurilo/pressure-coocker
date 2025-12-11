// services/cartService.js
const Cart = require("../models/cart.model");
const GuestCart = require("../models/guestCart.model");
const Product = require("../models/product.model");
const mongoose = require("mongoose");
const { toBase, fromBase, isValidUnit } = require("../utils/units");
const { v4: uuidv4 } = require("uuid");

/**
 * Create a new guest cart (returns guestCartId)
 */
async function createGuestCart() {
  const guestCartId = uuidv4();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const gc = await GuestCart.create({ guestCartId, items: [], expiresAt: expires });
  return gc.guestCartId;
}

/**
 * Add item to guest cart
 * body: { guestCartId, productId, quantity, unit }
 */
async function addItemToGuestCart(guestCartId, productId, quantity, unit) {
  if (!isValidUnit(unit)) throw new Error("Invalid unit");
  const product = await Product.findById(productId).select('stockBase productPrice isActive userId');
  if (!product || !product.isActive) throw new Error("Product not available");
  const qtyBase = toBase(Number(quantity), unit);
  if (Number(product.stockBase || 0) < qtyBase) throw new Error("Insufficient stock");
  let gc = await GuestCart.findOne({ guestCartId });
  if (!gc) {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    gc = await GuestCart.create({ guestCartId, items: [], expiresAt: expires });
  }
  const idx = gc.items.findIndex(i => i.productId.toString() === productId.toString());
  if (idx === -1) {
    gc.items.push({
      productId,
      quantity: Number(quantity),
      unit,
      quantityBase: qtyBase,
      priceAtAdd: Number(product.productPrice)
    });
  } else {
    gc.items[idx].quantityBase = Number(gc.items[idx].quantityBase || 0) + qtyBase;
    gc.items[idx].quantity = Number(gc.items[idx].quantity) + Number(quantity);
    gc.items[idx].priceAtAdd = Number(product.productPrice);
  }
  gc.updatedAt = new Date();
  await gc.save();
  return gc;
}

/**
 * Merge guest cart into user cart (auto-merge on login)
 * - sums base quantities
 * - caps at product.stockBase
 * - sets priceAtAdd to current product price
 * - removes guest cart after merge
 *
 * Returns: { cart, clipped: [{ productId, requestedBase, finalBase }] }
 */
async function mergeGuestCartIntoUserCart(userId, guestCartId) {
  const guestCart = await GuestCart.findOne({ guestCartId });
  if (!guestCart || !guestCart.items.length) {
    // nothing to merge
    const existingCart = await Cart.findOne({ userId });
    return { cart: existingCart || await Cart.create({ userId, items: [] }), clipped: [] };
  }

  // Ensure user cart exists
  let userCart = await Cart.findOne({ userId });
  if (!userCart) userCart = await Cart.create({ userId, items: [] });

  const clipped = [];

  // Convert user cart items to map by productId for fast lookup
  const map = new Map();
  for (const it of userCart.items) {
    map.set(it.productId.toString(), it);
  }

  // Process each guest item
  for (const gItem of guestCart.items) {
    const pid = gItem.productId.toString();
    const product = await Product.findById(pid).select('stockBase productPrice isActive displayUnit');
    if (!product || !product.isActive) {
      // skip unavailable product
      continue;
    }

    const requestedBase = Number(gItem.quantityBase || 0);
    const available = Number(product.stockBase || 0);

    if (map.has(pid)) {
      // existing item in user cart -> sum
      const uItem = map.get(pid);

      const existingBase = Number(uItem.quantityBase || 0);
      let finalBase = existingBase + requestedBase;
      if (finalBase > available) {
        finalBase = available;
        clipped.push({ productId: pid, requestedBase: existingBase + requestedBase, finalBase });
      }

      // update uItem
      uItem.quantityBase = finalBase;
      // compute visible quantity in product.displayUnit for UI convenience
      try {
        uItem.quantity = fromBase(uItem.quantityBase, uItem.unit || product.displayUnit || 'pcs');
      } catch (e) {
        uItem.quantity = uItem.quantityBase;
      }
      uItem.priceAtAdd = Number(product.productPrice);
    } else {
      // new item -> add (cap by available)
      let finalBase = requestedBase;
      if (finalBase > available) {
        finalBase = available;
        clipped.push({ productId: pid, requestedBase, finalBase });
      }

      const displayUnit = product.displayUnit || 'pcs';
      let visibleQty = finalBase;
      try {
        visibleQty = fromBase(finalBase, displayUnit);
      } catch (e) {
        visibleQty = finalBase;
      }

      userCart.items.push({
        productId: product._id,
        quantity: visibleQty,
        unit: displayUnit,
        quantityBase: finalBase,
        priceAtAdd: Number(product.productPrice),
        addedAt: new Date()
      });
    }
  }

  // Save user's cart
  await userCart.save();

  // Delete guest cart
  await GuestCart.deleteOne({ guestCartId });

  // Return merged cart and clipped items list
  return { cart: userCart, clipped };
}

module.exports = {
  createGuestCart,
  addItemToGuestCart,
  mergeGuestCartIntoUserCart
};
