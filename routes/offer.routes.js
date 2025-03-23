const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offer.controller');
const { verifyToken } = require('../middleware/auth');

// Get offer by ID
router.get('/:offerId', verifyToken, offerController.getOfferById);

// Respond to an offer (accept, reject, or counter)
router.put('/:offerId', verifyToken, offerController.respondToOffer);

// Respond to a counter offer (accept or reject)
router.put('/:offerId/counter-response', verifyToken, offerController.respondToCounterOffer);

module.exports = router; 