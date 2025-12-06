const {register, verify} = require('../controllers/userController');

const router = require('express').Router();

router.post('/register', register);
router.post('/verify', verify)

module.exports = router;
