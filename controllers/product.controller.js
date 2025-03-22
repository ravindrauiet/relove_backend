const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const fs = require('fs');
const path = require('path');
const { analyzeImage } = require('../utils/imageAnalysis');
const { validateProductData } = require('../utils/validators');

/**
 * Get all products
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = async (req, res) => {
  try {
    const { 
      category, 
      condition, 
      priceMin, 
      priceMax,
      sort = 'newest',
      page = 1,
      limit = 12,
      seller,
      search
    } = req.query;
    
    // Build query
    const query = {};
    
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (seller) query.seller = seller;
    
    // Price filter
    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin) query.price.$gte = Number(priceMin);
      if (priceMax) query.price.$lte = Number(priceMax);
    }
    
    // Search query (using text index)
    if (search) {
      query.$text = { $search: search };
    }
    
    // Sorting options
    let sortOption = {};
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'price_low':
        sortOption = { price: 1 };
        break;
      case 'price_high':
        sortOption = { price: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query with pagination
    const products = await Product.find(query)
      .populate({
        path: 'seller',
        select: 'name'
      })
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count for pagination
    const total = await Product.countDocuments(query);
    
    res.status(200).json({
      products,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'seller',
        select: 'name profilePicture'
      })
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'name profilePicture'
        }
      });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Increment view count
    product.views += 1;
    await product.save();
    
    res.status(200).json(product);
  } catch (error) {
    console.error('Get product error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a product
 * @route   POST /api/products
 * @access  Private
 */
exports.createProduct = async (req, res) => {
  try {
    // Handle file uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Process and save images
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }
    
    console.log('Request body for product creation:', req.body);
    
    // Create the product data - ensure location is handled as string
    const productData = {
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      condition: req.body.condition,
      images: imageUrls,
      brand: req.body.brand || '',
      color: req.body.color || '',
      size: req.body.size || '',
      location: req.body.location || '', // Store as string directly
      seller: req.dbUser.id
    };
    
    console.log('Product data prepared:', productData);
    
    // Create the product
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

/**
 * Update a product
 * @route   PUT /api/products/:id
 * @access  Private
 */
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user is the seller
    if (product.seller.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }
    
    // Handle image uploads
    let productImages = product.images;
    if (req.files && req.files.length > 0) {
      // Delete old images if needed
      if (req.body.deleteImages === 'true') {
        product.images.forEach(img => {
          const imagePath = path.join(__dirname, '..', img);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
        productImages = req.files.map(file => `/uploads/${file.filename}`);
      } else {
        // Add new images to existing ones
        const newImages = req.files.map(file => `/uploads/${file.filename}`);
        productImages = [...product.images, ...newImages];
      }
    } else if (req.body.images) {
      // Handle base64/URL images
      if (Array.isArray(req.body.images)) {
        productImages = req.body.images;
      } else {
        productImages = [req.body.images];
      }
    }
    
    // Update the product
    const updateData = {
      ...req.body,
      images: productImages
    };
    
    // Cast numeric values
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.originalPrice) updateData.originalPrice = Number(updateData.originalPrice);
    
    product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(product);
  } catch (error) {
    console.error('Update product error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user is the seller or admin
    if (product.seller.toString() !== req.dbUser._id.toString() && 
        req.dbUser.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    
    // Delete product images
    product.images.forEach(img => {
      const imagePath = path.join(__dirname, '..', img);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });
    
    // Remove product from user's listings
    await User.findByIdAndUpdate(product.seller, {
      $pull: { listings: product._id }
    });
    
    await product.remove();
    
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Search products
 * @route   GET /api/products/search
 * @access  Public
 */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const products = await Product.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get product categories
 * @route   GET /api/products/categories
 * @access  Public
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.status(200).json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Analyze product image
 * @route   POST /api/products/analyze-image
 * @access  Private
 */
exports.analyzeProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }
    
    const imagePath = req.file.path;
    const analysisResult = await analyzeImage(imagePath);
    
    res.status(200).json(analysisResult);
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ message: 'Error analyzing image', error: error.message });
  }
};

/**
 * Get related products
 * @route   GET /api/products/:id/related
 * @access  Public
 */
exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Find products with same category, exclude current product
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category
    })
    .limit(6)
    .sort({ createdAt: -1 });
    
    res.status(200).json(relatedProducts);
  } catch (error) {
    console.error('Get related products error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get product reviews
 * @route   GET /api/products/:id/reviews
 * @access  Public
 */
exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.id })
      .populate({
        path: 'user',
        select: 'name profilePicture'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add a review to a product
 * @route   POST /api/products/:id/reviews
 * @access  Private
 */
exports.addReview = async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: req.params.id,
      user: req.dbUser._id
    });
    
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }
    
    // Create new review
    const review = new Review({
      product: req.params.id,
      user: req.dbUser._id,
      rating: Number(rating),
      title,
      comment
    });
    
    await review.save();
    
    // Populate user info and return review
    const populatedReview = await Review.findById(review._id)
      .populate({
        path: 'user',
        select: 'name profilePicture'
      });
    
    res.status(201).json(populatedReview);
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 