const admin = require('firebase-admin');

const initializeFirebaseAdmin = () => {
  try {
    // Check if service account credentials are provided
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Parse the service account JSON string
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      console.log('Firebase Admin SDK initialized with service account JSON');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Alternative setup using individual environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      console.log('Firebase Admin SDK initialized with environment variables');
    } else {
      throw new Error('Firebase credentials not provided');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
};

module.exports = { admin, initializeFirebaseAdmin }; 