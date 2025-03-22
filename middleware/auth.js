const { admin } = require('../config/firebase');
const User = require('../models/User');

/**
 * Middleware to verify JWT token from Firebase
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization token provided' });
    }
    
    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Set the user object in the request for use in controllers
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        ...decodedToken
      };
      
      // Find or create user record in the database
      let user = await User.findOne({ firebaseUid: decodedToken.uid });
      
      if (!user) {
        console.log('Creating new user record for:', decodedToken.uid);
        user = new User({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split('@')[0]
        });
        await user.save();
      }
      
      // Attach database user to request
      req.dbUser = user;
      
      next();
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error during authentication' });
  }
};

/**
 * Middleware to check if user has admin role
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Check if the user exists and has admin role in our database
    const user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin role required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: 'Server error during admin check' });
  }
};

module.exports = {
  verifyToken,
  isAdmin
}; 