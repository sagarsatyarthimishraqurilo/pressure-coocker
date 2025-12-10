const router = require('express').Router();
const register = require('../controllers/vendorController')

router.post('/register', register);

module.exports = router;