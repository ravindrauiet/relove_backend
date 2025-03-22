const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
// Destructure verifyToken and isAdmin from the auth module:
const { verifyToken, isAdmin } = require('../middleware/auth');
const {singleUpload} = require('../middleware/upload');

// Get current user profile
router.get('/me', verifyToken, userController.getCurrentUser);

// Update user profile with profile picture upload
router.put('/me', verifyToken, singleUpload, userController.updateProfile);

// Favorites/Wishlist
router.get('/favorites', verifyToken, userController.getFavorites);
router.post('/favorites/:productId', verifyToken, userController.addToFavorites);
router.delete('/favorites/:productId', verifyToken, userController.removeFromFavorites);

// Cart
router.get('/cart', verifyToken, userController.getCart);
router.post('/cart/:productId', verifyToken, userController.addToCart);
router.put('/cart/:productId', verifyToken, userController.updateCartItem);
router.delete('/cart/:productId', verifyToken, userController.removeFromCart);
router.put('/cart/clear', verifyToken, userController.clearCart);

// User listings
router.get('/listings', verifyToken, userController.getUserListings);

// Offers
router.get('/offers/received', verifyToken, userController.getReceivedOffers);
router.get('/offers/sent', verifyToken, userController.getSentOffers);

// Admin routes (verify token first, then check admin role)
router.get('/', verifyToken, isAdmin, userController.getAllUsers);
router.get('/:id', verifyToken, isAdmin, userController.getUserById);
router.put('/:id', verifyToken, isAdmin, userController.updateUser);
router.delete('/:id', verifyToken, isAdmin, userController.deleteUser);

module.exports = router;
