const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OfferSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  offerPrice: {
    type: Number,
    required: true,
    min: [1, 'Offer price must be at least 1']
  },
  message: {
    type: String,
    trim: true,
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'countered', 'expired'],
    default: 'pending'
  },
  counterOffer: {
    price: Number,
    message: String
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration is 48 hours after creation
      const now = new Date();
      return new Date(now.setHours(now.getHours() + 48));
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Offer', OfferSchema); 