const User = require('../models/User');
const Product = require('../models/Product');
const Offer = require('../models/Offer');
const fs = require('fs');
const path = require('path');

/**
 * Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.dbUser._id)
      .select('-__v');
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.dbUser._id;
    const { name, phone, address } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = JSON.parse(address);
    
    // Handle profile picture upload
    if (req.file) {
      // If there's already a profile picture, delete the old one
      const user = await User.findById(userId);
      if (user.profilePicture) {
        const oldPicturePath = path.join(__dirname, '..', user.profilePicture);
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
        }
      }
      
      updateData.profilePicture = `/uploads/${req.file.filename}`;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-__v');
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user favorites
 * @route   GET /api/users/favorites
 * @access  Private
 */
exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.dbUser._id)
      .populate({
        path: 'favorites',
        select: 'title price images condition category brand'
      });
    
    res.status(200).json(user.favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add product to favorites
 * @route   POST /api/users/favorites/:productId
 * @access  Private
 */
exports.addToFavorites = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const user = await User.findById(req.dbUser._id);
    await user.addToFavorites(productId);
    
    const updatedUser = await User.findById(req.dbUser._id)
      .populate({
        path: 'favorites',
        select: 'title price images condition category brand'
      });
    
    res.status(200).json(updatedUser.favorites);
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove product from favorites
 * @route   DELETE /api/users/favorites/:productId
 * @access  Private
 */
exports.removeFromFavorites = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const user = await User.findById(req.dbUser._id);
    await user.removeFromFavorites(productId);
    
    const updatedUser = await User.findById(req.dbUser._id)
      .populate({
        path: 'favorites',
        select: 'title price images condition category brand'
      });
    
    res.status(200).json(updatedUser.favorites);
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user cart
 * @route   GET /api/users/cart
 * @access  Private
 */
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.dbUser._id)
      .populate({
        path: 'cart.product',
        select: 'title price images condition category brand seller'
      });
    
    // Calculate total
    const total = user.cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    res.status(200).json({
      items: user.cart,
      total
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add product to cart
 * @route   POST /api/users/cart/:productId
 * @access  Private
 */
exports.addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity = 1 } = req.body;
    
    // Check if product exists and is available
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (!product.isAvailable) {
      return res.status(400).json({ message: 'Product is not available' });
    }
    
    const user = await User.findById(req.dbUser._id);
    await user.addToCart(productId, parseInt(quantity));
    
    // Get updated cart with populated product details
    const updatedUser = await User.findById(req.dbUser._id)
      .populate({
        path: 'cart.product',
        select: 'title price images condition category brand seller'
      });
    
    // Calculate total
    const total = updatedUser.cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    res.status(200).json({
      items: updatedUser.cart,
      total
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update cart item quantity
 * @route   PUT /api/users/cart/:productId
 * @access  Private
 */
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }
    
    const user = await User.findById(req.dbUser._id);
    await user.updateCartItem(productId, parseInt(quantity));
    
    // Get updated cart with populated product details
    const updatedUser = await User.findById(req.dbUser._id)
      .populate({
        path: 'cart.product',
        select: 'title price images condition category brand seller'
      });
    
    // Calculate total
    const total = updatedUser.cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    res.status(200).json({
      items: updatedUser.cart,
      total
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    
    if (error.message === 'Item not found in cart') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove product from cart
 * @route   DELETE /api/users/cart/:productId
 * @access  Private
 */
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const user = await User.findById(req.dbUser._id);
    await user.removeFromCart(productId);
    
    // Get updated cart with populated product details
    const updatedUser = await User.findById(req.dbUser._id)
      .populate({
        path: 'cart.product',
        select: 'title price images condition category brand seller'
      });
    
    // Calculate total
    const total = updatedUser.cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    res.status(200).json({
      items: updatedUser.cart,
      total
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Clear cart
 * @route   PUT /api/users/cart/clear
 * @access  Private
 */
exports.clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.dbUser._id);
    await user.clearCart();
    
    res.status(200).json({
      items: [],
      total: 0
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user's product listings
 * @route   GET /api/users/listings
 * @access  Private
 */
exports.getUserListings = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.dbUser._id })
      .select('title price images condition category createdAt isAvailable views')
      .sort({ createdAt: -1 });
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get received offers
 * @route   GET /api/users/offers/received
 * @access  Private
 */
exports.getReceivedOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ seller: req.dbUser._id })
      .populate({
        path: 'product',
        select: 'title price images'
      })
      .populate({
        path: 'buyer',
        select: 'name profilePicture'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(offers);
  } catch (error) {
    console.error('Get received offers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get sent offers
 * @route   GET /api/users/offers/sent
 * @access  Private
 */
exports.getSentOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ buyer: req.dbUser._id })
      .populate({
        path: 'product',
        select: 'title price images'
      })
      .populate({
        path: 'seller',
        select: 'name profilePicture'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(offers);
  } catch (error) {
    console.error('Get sent offers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all users (admin only)
 * @route   GET /api/users
 * @access  Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.status(200).json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user by ID (admin only)
 * @route   GET /api/users/:id
 * @access  Admin
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user (admin only)
 * @route   PUT /api/users/:id
 * @access  Admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.remove();
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
}; 