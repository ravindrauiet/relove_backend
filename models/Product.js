const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price must be a positive number']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price must be a positive number']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['Clothing', 'Footwear', 'Accessory', 'Bag', 'Other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    required: [true, 'Product condition is required'],
    enum: ['New', 'Like New', 'Good', 'Fair']
  },
  size: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  pattern: {
    type: String,
    trim: true
  },
  style: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Men', 'Women', 'Unisex', 'Kids', '']
  },
  material: {
    type: String,
    trim: true
  },
  images: [{
    type: String,
    required: [true, 'At least one product image is required']
  }],
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller information is required']
  },
  location: {
    type: String,
    default: ''
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  shipping: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    free: {
      type: Boolean,
      default: false
    },
    cost: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for text search
ProductSchema.index(
  { 
    title: 'text', 
    description: 'text',
    brand: 'text',
    color: 'text',
    material: 'text',
    tags: 'text'
  },
  {
    weights: {
      title: 10,
      brand: 5,
      tags: 3,
      description: 1
    },
    name: 'TextIndex'
  }
);

// Create compound index for filtering
ProductSchema.index(
  { 
    category: 1, 
    price: 1, 
    condition: 1,
    createdAt: -1 
  }
);

// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function() {
  if (!this.originalPrice) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Virtual for reviews
ProductSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product'
});

// Virtual for offers
ProductSchema.virtual('offers', {
  ref: 'Offer',
  localField: '_id',
  foreignField: 'product'
});

module.exports = mongoose.model('Product', ProductSchema); 