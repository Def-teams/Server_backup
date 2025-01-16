const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const KakaoStrategy = require('passport-kakao').Strategy;
const NaverStrategy = require('passport-naver-v2').Strategy;
const GoogleUser = require('../models/GoogleUser');
const KakaoUser = require('../models/KakaoUser');
const NaverUser = require('../models/NaverUser');

// 세션에 사용자 정보 저장
passport.serializeUser((user, done) => {
  done(null, {
    id: user._id,
    provider: user.provider
  });
});

// 세션에서 사용자 정보 복원
passport.deserializeUser(async (data, done) => {
  try {
    let UserModel;
    switch (data.provider) {
      case 'google':
        UserModel = GoogleUser;
        break;
      case 'kakao':
        UserModel = KakaoUser;
        break;
      case 'naver':
        UserModel = NaverUser;
        break;
      default:
        return done(new Error('Unknown provider'));
    }

    const user = await UserModel.findById(data.id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google 전략 설정
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_SIGNUP_ID,
    clientSecret: process.env.GOOGLE_SIGNUP_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URI,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      let user = await GoogleUser.findOne({ googleId: profile.id });
      
      if (!user) {
        user = await GoogleUser.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          provider: 'google',
          accessToken,
          refreshToken,
          isProfileComplete: false
        });
      } else {
        // 토큰 업데이트
        user.accessToken = accessToken;
        if (refreshToken) user.refreshToken = refreshToken;
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Kakao 전략 설정
passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
    callbackURL: process.env.KAKAO_CALLBACK_URI,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      let user = await KakaoUser.findOne({ kakaoId: profile.id });
      
      if (!user) {
        user = await KakaoUser.create({
          kakaoId: profile.id,
          email: profile._json.kakao_account.email,
          name: profile.displayName,
          provider: 'kakao',
          accessToken,
          refreshToken,
          isProfileComplete: false
        });
      } else {
        user.accessToken = accessToken;
        if (refreshToken) user.refreshToken = refreshToken;
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Naver 전략 설정
passport.use(new NaverStrategy({
    clientID: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: process.env.NAVER_CALLBACK_URI,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      let user = await NaverUser.findOne({ naverId: profile.id });
      
      if (!user) {
        user = await NaverUser.create({
          naverId: profile.id,
          email: profile.email,
          name: profile.name,
          provider: 'naver',
          accessToken,
          refreshToken,
          isProfileComplete: false
        });
      } else {
        user.accessToken = accessToken;
        if (refreshToken) user.refreshToken = refreshToken;
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// 에러 핸들링
passport.use('error', (error, req, res, next) => {
  console.error('Passport Error:', error);
  res.redirect('/auth/login');
});

module.exports = passport; 