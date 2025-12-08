const { register, verify, reVerify, login, logout, forgotPassword, ResetPassword, changePassowrd, getAllUser, getUserByID } = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middleware/isAuthenticated');

const router = require('express').Router();

router.post('/register', register);
router.post('/verify', verify);
router.post('/reverify', reVerify);
router.post('/login', login);
router.post('/logout', isAuthenticated, logout);
router.post('/forget-password', forgotPassword)
router.post('/verify-otp/:email', ResetPassword)
router.post('/change-password/:email', changePassowrd)
router.get('/all-user', isAuthenticated, isAdmin, getAllUser)
router.get('/get-user/:userId', getUserByID)

module.exports = router;
