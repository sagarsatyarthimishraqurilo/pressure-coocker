const router = require('express').Router();
const {
    register,
    deleteUserById,
    setVendorBlockState,
    getUsersByRole,
    getVendorsWithProducts
} = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/isAuthenticated');

//Admin Register API
router.post("/register", register);
router.delete("/delete/:userId", isAuthenticated, isAdmin, deleteUserById)

// new endpoint: POST or PATCH
router.patch('/vendor/:vendorId/block', isAuthenticated, isAdmin, setVendorBlockState);

// New admin listing routes
router.get('/users/role/:role', isAuthenticated, isAdmin, getUsersByRole);
router.get('/vendors-with-products', isAuthenticated, isAdmin, getVendorsWithProducts);



module.exports = router