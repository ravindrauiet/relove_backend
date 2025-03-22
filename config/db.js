const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000 // Increase timeout if needed
    });
    console.log('MongoDB Connected...');
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Log more detailed error information
    if (error.name === 'MongooseServerSelectionError') {
      console.error('Server selection timed out. Network or firewall issue likely.');
    }
    process.exit(1);
  }
};

module.exports = connectDB; 