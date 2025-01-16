const mongoose = require('mongoose');

const naverUserSchema = new mongoose.Schema({
  naverId: {
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
    default: 'naver'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const NaverUser = mongoose.model('NaverUser', naverUserSchema);
module.exports = NaverUser; 