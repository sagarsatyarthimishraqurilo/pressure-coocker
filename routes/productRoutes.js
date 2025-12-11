// // routes/productRoutes.js
// const router = require('express').Router();
// const productController = require('../controllers/productController');
// const { isAuthenticated, isVendor, isAdmin } = require('../middleware/isAuthenticated');
// const { multipleUpload } = require('../middleware/multer');

// router.post('/create', isAuthenticated, isVendor, multipleUpload, productController.createProduct);
// router.get('/list', productController.listProducts);
// router.get('/:productId', productController.getProductById);
// router.put('/:productId', isAuthenticated, multipleUpload, productController.updateProduct); // owner or admin allowed inside controller
// router.patch('/:productId/stock', isAuthenticated, productController.adjustStock); // owner or admin
// router.post('/:productId/decrement-stock', productController.decrementStockIfAvailable); // can be used by order service
// router.delete('/:productId', isAuthenticated, productController.deleteProduct);
// router.get('/category/:categoryId', productController.listProducts);

// module.exports = router;
// routes/productRoutes.js

const router = require('express').Router();
const productController = require('../controllers/productController');
const { isAuthenticated, isVendor } = require('../middleware/isAuthenticated');
const { multipleUpload } = require('../middleware/multer');

// Public listing and helpers
router.get('/list', productController.listProducts);
// Category-specific list (explicit route before :productId)
router.get('/category/:categoryId', productController.listProductsByCategory);

// Products by vendor (public) and vendor's own products
router.get('/vendor/:vendorId', productController.listProductsByVendor);
router.get('/my', isAuthenticated, isVendor, productController.listMyProducts);

// CRUD and misc (put param routes after specific ones)
router.post('/create', isAuthenticated, isVendor, multipleUpload, productController.createProduct);
router.get('/:productId', productController.getProductById);
router.put('/:productId', isAuthenticated, multipleUpload, productController.updateProduct); // owner or admin allowed inside controller
router.patch('/:productId/stock', isAuthenticated, productController.adjustStock); // owner or admin
router.post('/:productId/decrement-stock', productController.decrementStockIfAvailable); // can be used by order service
router.delete('/:productId', isAuthenticated, productController.deleteProduct);

module.exports = router;
