const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const offerController = require('../controllers/offer.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

// Public routes
router.get('/', productController.getProducts);
router.get('/search', productController.searchProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);
router.get('/:id/related', productController.getRelatedProducts);
router.get('/:id/reviews', productController.getProductReviews);

// Protected routes
router.use(verifyToken);

// Product CRUD operations (using multiUpload for multiple images)
router.post('/', uploadMiddleware.multiUpload, productController.createProduct);
router.put('/:id', uploadMiddleware.multiUpload, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Review operations
router.post('/:id/reviews', productController.addReview);

// Image analysis
router.post('/analyze-image', uploadMiddleware.multiUpload, productController.analyzeProductImage);

// Offer operations
router.post('/:productId/offers', offerController.makeOffer);
router.get('/:productId/offers', offerController.getProductOffers);

// Add this route to test image analysis
router.post('/test-analysis', uploadMiddleware.multiUpload, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files uploaded' });
    }
    
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    console.log('Test analysis - image URLs:', imageUrls);
    
    // Import the image analysis utility
    const { analyzeProductImages } = require('../utils/imageAnalysis');
    
    // Analyze the images
    const analysisResults = await analyzeProductImages(imageUrls);
    
    // Return the results
    res.status(200).json({
      success: true,
      message: 'Image analysis completed',
      results: analysisResults,
      images: imageUrls
    });
  } catch (error) {
    console.error('Test analysis error:', error);
    res.status(500).json({ message: 'Error analyzing images', error: error.message });
  }
});

// Add this test route
router.post('/test-upload', verifyToken, uploadMiddleware.multiUpload, (req, res) => {
  try {
    const files = req.files || [];
    const body = req.body;
    
    console.log('Test upload - files received:', files.map(f => ({
      name: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path
    })));
    
    console.log('Test upload - body:', body);
    
    res.status(200).json({
      success: true,
      message: 'Upload test successful',
      filesReceived: files.length,
      fileDetails: files.map(f => ({
        name: f.originalname,
        type: f.mimetype,
        size: f.size
      })),
      bodyFields: Object.keys(body)
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({ message: 'Error in test upload', error: error.message });
  }
});

module.exports = router;
