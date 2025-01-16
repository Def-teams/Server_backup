const mongoose = require('mongoose');

const googleUserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: String,
  accessToken: String,
  refreshToken: String,
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  preferences: {
    favoriteColor: String,
    clothingSize: String,
    preferredStyle: String
  },
  likedClothes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clothes'
  }],
  provider: {
    type: String,
    default: 'google'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const GoogleUser = mongoose.model('GoogleUser', googleUserSchema);
module.exports = GoogleUser; 