const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  favorites: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  cart: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  }],
  listings: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for user's full name
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Cart total calculation
UserSchema.methods.getCartTotal = function() {
  return this.cart.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);
};

// Methods to manage favorites
UserSchema.methods.addToFavorites = function(productId) {
  if (!this.favorites.includes(productId)) {
    this.favorites.push(productId);
  }
  return this.save();
};

UserSchema.methods.removeFromFavorites = function(productId) {
  this.favorites = this.favorites.filter(id => id.toString() !== productId.toString());
  return this.save();
};

// Methods to manage cart
UserSchema.methods.addToCart = function(productId, quantity = 1) {
  const cartItem = this.cart.find(item => item.product.toString() === productId.toString());
  if (cartItem) {
    cartItem.quantity += quantity;
  } else {
    this.cart.push({ product: productId, quantity });
  }
  return this.save();
};

UserSchema.methods.updateCartItem = function(productId, quantity) {
  const cartItem = this.cart.find(item => item.product.toString() === productId.toString());
  if (cartItem) {
    cartItem.quantity = quantity;
    return this.save();
  }
  return Promise.reject(new Error('Item not found in cart'));
};

UserSchema.methods.removeFromCart = function(productId) {
  this.cart = this.cart.filter(item => item.product.toString() !== productId.toString());
  return this.save();
};

UserSchema.methods.clearCart = function() {
  this.cart = [];
  return this.save();
};

module.exports = mongoose.model('User', UserSchema); 