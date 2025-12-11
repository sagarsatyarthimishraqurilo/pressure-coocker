// routes/guestCartRoutes.js
const router = require("express").Router();
const guestCtrl = require("../controllers/guestCartController");

// Public endpoints (no auth)
router.post("/", guestCtrl.createGuestCart); // create guest cart
router.get("/:guestCartId", guestCtrl.getGuestCart);
router.post("/:guestCartId/item", guestCtrl.addItem);

module.exports = router;
