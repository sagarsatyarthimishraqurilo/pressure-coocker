const router = require("express").Router();
const { isAuthenticated } = require("../middleware/isAuthenticated");
const controller = require("../controllers/addressController");

router.post("/add", isAuthenticated, controller.addAddress);
router.get("/list", isAuthenticated, controller.getMyAddresses);
router.put("/:addressId", isAuthenticated, controller.updateAddress);
router.delete("/:addressId", isAuthenticated, controller.deleteAddress);
router.patch("/:addressId/default", isAuthenticated, controller.setDefaultAddress);

module.exports = router;
