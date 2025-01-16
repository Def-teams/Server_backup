const mongoose = require('mongoose');

const clothesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  imageUrl: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['상의', '하의', '아우터', '신발', '액세서리']
  },
  subCategory: {
    type: String,
    required: true
  },
  size: [{
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE']
  }],
  color: [{
    type: String,
    required: true
  }],
  style: [{
    type: String,
    enum: ['캐주얼', '포멀', '스포티', '스트릿', '빈티지', '미니멀']
  }],
  gender: {
    type: String,
    enum: ['남성', '여성', '유니섹스'],
    required: true
  },
  stock: {
    type: Map,
    of: {
      color: String,
      size: String,
      quantity: Number
    }
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel'
  }],
  userModel: {
    type: String,
    required: true,
    enum: ['EmailUser', 'GoogleUser', 'KakaoUser', 'NaverUser']
  },
  isNew: {
    type: Boolean,
    default: true
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  discount: {
    isOnSale: {
      type: Boolean,
      default: false
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    startDate: Date,
    endDate: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 업데이트 시 updatedAt 자동 갱신
clothesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 가상 필드: 할인가 계산
clothesSchema.virtual('discountedPrice').get(function() {
  if (this.discount.isOnSale) {
    return Math.round(this.price * (1 - this.discount.percentage / 100));
  }
  return this.price;
});

// 인덱스 설정
clothesSchema.index({ category: 1, subCategory: 1 });
clothesSchema.index({ isTrending: 1 });
clothesSchema.index({ 'discount.isOnSale': 1 });
clothesSchema.index({ likes: -1 });

const Clothes = mongoose.model('Clothes', clothesSchema);
module.exports = Clothes; 