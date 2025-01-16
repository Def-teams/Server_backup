const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const emailUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
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
    default: 'email'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 비밀번호 해싱 미들웨어
emailUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 검증 메서드
emailUserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        console.log('Comparing passwords:', {
            candidate: candidatePassword,
            stored: this.password
        });
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        console.log('Password match result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Password comparison error:', error);
        throw error;
    }
};

const EmailUser = mongoose.model('EmailUser', emailUserSchema);
module.exports = EmailUser; 