// routes/categoryRoutes.js
const router = require('express').Router();
const categoryController = require('../controllers/categoryController');
const { isAuthenticated, isAdmin } = require('../middleware/isAuthenticated');
const { fieldsUpload } = require('../middleware/multer');

// Public: list and get single (for dropdowns / forms)
router.get('/list', categoryController.listCategories);
router.get('/:categoryId', categoryController.getCategory);

// Admin: create / update / delete
router.post('/create', isAuthenticated, isAdmin, fieldsUpload, categoryController.createCategory);
router.put('/:categoryId', isAuthenticated, isAdmin, fieldsUpload, categoryController.updateCategory);
router.delete('/:categoryId', isAuthenticated, isAdmin, categoryController.deleteCategory);

module.exports = router;
