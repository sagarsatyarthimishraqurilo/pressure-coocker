const router = require('express').Router();
const { register, deleteUserById } = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/isAuthenticated');

//Admin Register API
router.post("/register", register);
router.delete("/delete/:userId", isAuthenticated, isAdmin, deleteUserById)

module.exports = router