const Offer = require('../models/Offer');
const Product = require('../models/Product');
const User = require('../models/User');

/**
 * Make an offer on a product
 * @route   POST /api/products/:productId/offers
 * @access  Private
 */
exports.makeOffer = async (req, res) => {
  try {
    const { productId } = req.params;
    const { offerPrice, message } = req.body;
    
    if (!offerPrice) {
      return res.status(400).json({ message: 'Offer price is required' });
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if product is available
    if (!product.isAvailable) {
      return res.status(400).json({ message: 'Product is not available' });
    }
    
    // Prevent users from making offers on their own products
    if (product.seller.toString() === req.dbUser._id.toString()) {
      return res.status(400).json({ message: 'You cannot make an offer on your own product' });
    }
    
    // Check if user already has a pending offer on this product
    const existingOffer = await Offer.findOne({
      product: productId,
      buyer: req.dbUser._id,
      status: 'pending'
    });
    
    if (existingOffer) {
      return res.status(400).json({ message: 'You already have a pending offer on this product' });
    }
    
    // Create the offer
    const offer = new Offer({
      product: productId,
      buyer: req.dbUser._id,
      seller: product.seller,
      offerPrice: Number(offerPrice),
      message: message || ''
    });
    
    await offer.save();
    
    // Populate product and user info
    const populatedOffer = await Offer.findById(offer._id)
      .populate({
        path: 'product',
        select: 'title price images'
      })
      .populate({
        path: 'seller',
        select: 'name'
      })
      .populate({
        path: 'buyer',
        select: 'name'
      });
    
    res.status(201).json(populatedOffer);
  } catch (error) {
    console.error('Make offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get offers for a product (seller only)
 * @route   GET /api/products/:productId/offers
 * @access  Private
 */
exports.getProductOffers = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user is the seller
    if (product.seller.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view these offers' });
    }
    
    // Get offers
    const offers = await Offer.find({ product: productId })
      .populate({
        path: 'buyer',
        select: 'name profilePicture'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(offers);
  } catch (error) {
    console.error('Get product offers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Respond to an offer (accept, reject, or counter)
 * @route   PUT /api/offers/:offerId
 * @access  Private
 */
exports.respondToOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { action, counterPrice, counterMessage } = req.body;
    
    // Check if offer exists
    const offer = await Offer.findById(offerId)
      .populate({
        path: 'product',
        select: 'seller'
      });
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Check if user is the seller
    if (offer.product.seller.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this offer' });
    }
    
    // Process the action
    switch (action) {
      case 'accept':
        offer.status = 'accepted';
        break;
      case 'reject':
        offer.status = 'rejected';
        break;
      case 'counter':
        if (!counterPrice) {
          return res.status(400).json({ message: 'Counter offer price is required' });
        }
        offer.status = 'countered';
        offer.counterOffer = {
          price: Number(counterPrice),
          message: counterMessage || ''
        };
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    
    await offer.save();
    
    // Populate user info and return updated offer
    const updatedOffer = await Offer.findById(offerId)
      .populate({
        path: 'product',
        select: 'title price images'
      })
      .populate({
        path: 'buyer',
        select: 'name profilePicture'
      });
    
    res.status(200).json(updatedOffer);
  } catch (error) {
    console.error('Respond to offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Respond to a counter offer (accept or reject)
 * @route   PUT /api/offers/:offerId/counter-response
 * @access  Private
 */
exports.respondToCounterOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { action } = req.body;
    
    // Check if offer exists
    const offer = await Offer.findById(offerId);
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Check if user is the buyer
    if (offer.buyer.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this counter offer' });
    }
    
    // Check if offer has a counter offer
    if (offer.status !== 'countered') {
      return res.status(400).json({ message: 'This offer does not have a counter offer to respond to' });
    }
    
    // Process the action
    switch (action) {
      case 'accept':
        offer.status = 'accepted';
        break;
      case 'reject':
        offer.status = 'rejected';
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    
    await offer.save();
    
    // Populate product and user info
    const updatedOffer = await Offer.findById(offerId)
      .populate({
        path: 'product',
        select: 'title price images'
      })
      .populate({
        path: 'seller',
        select: 'name profilePicture'
      });
    
    res.status(200).json(updatedOffer);
  } catch (error) {
    console.error('Respond to counter offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get offer by ID
 * @route   GET /api/offers/:offerId
 * @access  Private
 */
exports.getOfferById = async (req, res) => {
  try {
    const { offerId } = req.params;
    
    const offer = await Offer.findById(offerId)
      .populate({
        path: 'product',
        select: 'title price images seller'
      })
      .populate({
        path: 'buyer',
        select: 'name profilePicture'
      })
      .populate({
        path: 'seller',
        select: 'name profilePicture'
      });
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Check if user is the buyer or seller
    if (offer.buyer._id.toString() !== req.dbUser._id.toString() && 
        offer.seller._id.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this offer' });
    }
    
    res.status(200).json(offer);
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 