const mongoose = require('mongoose');

const kakaoUserSchema = new mongoose.Schema({
  kakaoId: {
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
    default: 'kakao'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const KakaoUser = mongoose.model('KakaoUser', kakaoUserSchema);
module.exports = KakaoUser; 