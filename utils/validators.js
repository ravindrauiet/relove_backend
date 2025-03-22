const Joi = require('joi');

/**
 * Validate product data
 * @param {object} data - Product data to validate
 * @returns {object} Validation result
 */
exports.validateProductData = (data) => {
  // Handle location if it's a string or JSON string
  if (data.location) {
    if (typeof data.location === 'string') {
      try {
        // Try to parse as JSON first
        data.location = JSON.parse(data.location);
      } catch (e) {
        // If parsing fails, create a simple object
        data.location = { city: data.location };
      }
    }
  }

  const schema = Joi.object({
    title: Joi.string().required().min(3).max(100),
    description: Joi.string().required().min(10),
    price: Joi.number().required().min(0),
    category: Joi.string().required(),
    condition: Joi.string().required(),
    brand: Joi.string().allow('', null),
    color: Joi.string().allow('', null),
    size: Joi.string().allow('', null),
    location: Joi.string().allow('', null),
    images: Joi.array().items(Joi.string()),
    seller: Joi.string().required()
  });

  return schema.validate(data);
};

/**
 * Validate user profile data
 * @param {object} data - User profile data to validate
 * @returns {object} Validation result
 */
exports.validateUserData = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50),
    phone: Joi.string().pattern(/^\+?[0-9\s-()]{7,20}$/),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipCode: Joi.string(),
      country: Joi.string()
    })
  });

  return schema.validate(data);
};

/**
 * Validate offer data
 * @param {object} data - Offer data to validate
 * @returns {object} Validation result
 */
exports.validateOfferData = (data) => {
  const schema = Joi.object({
    offerPrice: Joi.number().required().min(1),
    message: Joi.string().max(500)
  });

  return schema.validate(data);
};

/**
 * Validate review data
 * @param {object} data - Review data to validate
 * @returns {object} Validation result
 */
exports.validateReviewData = (data) => {
  const schema = Joi.object({
    rating: Joi.number().required().min(1).max(5),
    title: Joi.string().max(100),
    comment: Joi.string().required().max(1000)
  });

  return schema.validate(data);
}; 