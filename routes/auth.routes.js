const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.post('/verify-token', authController.verifyToken);

// Protected routes
router.get('/me', verifyToken, authController.getCurrentUser);

module.exports = router; 