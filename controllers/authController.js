const EmailUser = require('../models/EmailUser');
const GoogleUser = require('../models/GoogleUser');
const KakaoUser = require('../models/KakaoUser');
const NaverUser = require('../models/NaverUser');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

// OAuth2 클라이언트 설정
const emailOauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 이메일 로그인 관련 컨트롤러
exports.getLogin = (req, res) => {
  res.render('auth/login', { error: '', success: '' });
};

exports.postEmailLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await EmailUser.findOne({ email });
    if (!user) {
      return res.render('auth/login', { 
        error: '등록되지 않은 이메일입니다.', 
        success: '' 
      });
    }

    if (!user.isVerified) {
      return res.render('auth/login', { 
        error: '이메일 인증이 필요합니다.', 
        success: '' 
      });
    }

    const isMatch = await user.comparePassword(password);
    console.log('Password comparison:', { 
      input: password,
      stored: user.password,
      isMatch 
    });

    if (!isMatch) {
      return res.render('auth/login', {
        error: '비밀번호가 일치하지 않습니다.',
        success: ''
      });
    }

    req.session.user = user;
    req.session.provider = 'email';

    if (!user.isProfileComplete) {
      return res.redirect('/auth/preferences');
    }
    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      error: '로그인 중 오류가 발생했습니다.',
      success: ''
    });
  }
};

// 회원가입 관련 컨트롤러
exports.getSignup = (req, res) => {
  res.render('auth/signup', { error: '' });
};

exports.postSignup = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await EmailUser.findOne({ email });
    if (existingUser) {
      return res.render('auth/signup', { error: '이미 등록된 이메일입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = new EmailUser({
      email,
      password: hashedPassword,
      verificationToken
    });

    await user.save();
    await sendVerificationEmail(email, verificationToken);

    res.render('auth/login', {
      success: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
      error: ''
    });
  } catch (error) {
    res.render('auth/signup', { error: '회원가입 중 오류가 발생했습니다.' });
  }
};

// 이메일 인증 컨트롤러
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const user = await EmailUser.findOne({ verificationToken: token });
    if (!user) {
      return res.render('auth/verify-email', { error: '유효하지 않은 토큰입니다.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.render('auth/login', {
      success: '이메일 인증이 완료되었습니다. 로그인해주세요.',
      error: ''
    });
  } catch (error) {
    res.render('auth/verify-email', { error: '인증 중 오류가 발생했습니다.' });
  }
};

// 소셜 로그인 콜백 처리
exports.socialLoginCallback = async (req, res) => {
  try {
    if (!req.user.isProfileComplete) {
      return res.redirect('/auth/preferences');
    }
    res.redirect('/');
  } catch (error) {
    res.redirect('/auth/login');
  }
};

// 사용자 설정 관련 컨트롤러
exports.getPreferences = (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  res.render('auth/preferences', { error: '', success: '' });
};

exports.postPreferences = async (req, res) => {
  const { favoriteColor, clothingSize, preferredStyle } = req.body;
  try {
    const provider = req.session.provider;
    let UserModel;
    
    switch(provider) {
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
        UserModel = EmailUser;
    }

    const user = await UserModel.findById(req.session.user._id);
    user.preferences = { favoriteColor, clothingSize, preferredStyle };
    user.isProfileComplete = true;
    await user.save();

    req.session.user = user;
    res.redirect('/');
  } catch (error) {
    res.render('auth/preferences', {
      error: '설정 저장 중 오류가 발생했습니다.',
      success: ''
    });
  }
};

exports.getResetPassword = (req, res) => {
  res.render('auth/reset-password', { error: '', success: '' });
};

// 인증코드 생성 함수
const generateVerificationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

exports.postResetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await EmailUser.findOne({ email });
        
        if (!user) {
            return res.render('auth/reset-password', {
                error: '등록되지 않은 이메일입니다.',
                success: ''
            });
        }

        const verificationCode = generateVerificationCode();
        user.resetPasswordToken = verificationCode;
        user.resetPasswordExpires = Date.now() + 3600000; // 1시간
        await user.save();

        await sendPasswordResetEmail(email, verificationCode);
        
        res.render('auth/verify-code', {
            email,
            error: '',
            success: '인증코드가 이메일로 전송되었습니다.'
        });
    } catch (error) {
        res.render('auth/reset-password', {
            error: '이메일 전송 중 오류가 발생했습니다.',
            success: ''
        });
    }
};

exports.postVerifyCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await EmailUser.findOne({ email, resetPasswordToken: code });

        if (!user || user.resetPasswordExpires < Date.now()) {
            return res.render('auth/verify-code', {
                email,
                error: '유효하지 않거나 만료된 인증코드입니다.',
                success: ''
            });
        }

        // 인증 성공 시 토큰을 전달
        res.render('auth/new-password', {
            token: user.resetPasswordToken,
            error: '',
            success: '인증이 완료되었습니다. 새 비밀번호를 설정하세요.'
        });
    } catch (error) {
        res.render('auth/verify-code', {
            email: req.body.email,
            error: '인증 중 오류가 발생했습니다.',
            success: ''
        });
    }
};

exports.getResetPasswordConfirm = async (req, res) => {
  const { token } = req.params;
  try {
    const user = await EmailUser.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/reset-password', {
        error: '유효하지 않거나 만료된 토큰입니다.',
        success: ''
      });
    }

    res.render('auth/reset-password-confirm', { token, error: '' });
  } catch (error) {
    res.render('auth/reset-password', {
      error: '비밀번호 재설정 중 오류가 발생했습니다.',
      success: ''
    });
  }
};

exports.postResetPasswordConfirm = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  try {
    if (password !== confirmPassword) {
      return res.render('auth/reset-password-confirm', {
        token,
        error: '비밀번호가 일치하지 않습니다.'
      });
    }

    const user = await EmailUser.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/reset-password', {
        error: '유효하지 않거나 만료된 토큰입니다.',
        success: ''
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.render('auth/login', {
      success: '비밀번호가 성공적으로 재설정되었습니다.',
      error: ''
    });
  } catch (error) {
    res.render('auth/reset-password-confirm', {
      token,
      error: '비밀번호 재설정 중 오류가 발생했습니다.'
    });
  }
};

// 좋아요 기능 컨트롤러
exports.toggleLike = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }

  const { clothesId } = req.params;
  try {
    const provider = req.session.provider;
    let UserModel;
    
    switch(provider) {
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
        UserModel = EmailUser;
    }

    const user = await UserModel.findById(req.session.user._id);
    const likeIndex = user.likedClothes.indexOf(clothesId);

    if (likeIndex === -1) {
      user.likedClothes.push(clothesId);
    } else {
      user.likedClothes.splice(likeIndex, 1);
    }

    await user.save();
    req.session.user = user;

    res.json({
      success: true,
      liked: likeIndex === -1,
      message: likeIndex === -1 ? '좋아요 추가됨' : '좋아요 취소됨'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '좋아요 처리 중 오류가 발생했습니다.'
    });
  }
};

// 로그아웃 컨트롤러
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '로그아웃 중 오류가 발생했습니다.'
      });
    }
    res.clearCookie('connect.sid');
    res.clearCookie('autoLoginToken');
    res.redirect('/auth/login/callback');
  });
};

// Google 로그인 페이지 렌더링
exports.renderGoogleLogin = (req, res) => {
  res.render('Social/google/google');
};

// Google 콜백 페이지 렌더링
exports.renderGoogleCallback = (req, res) => {
  res.render('Social/google/callback');
};

// Kakao 로그인 페이지 렌더링
exports.renderKakaoLogin = (req, res) => {
  res.render('Social/kakao/kakao');
};

// Kakao 콜백 페이지 렌더링
exports.renderKakaoCallback = (req, res) => {
  res.render('Social/kakao/callback');
};

// Naver 로그인 페이지 렌더링
exports.renderNaverLogin = (req, res) => {
  res.render('Social/naver/naver');
};

// Naver 콜백 페이지 렌더링
exports.renderNaverCallback = (req, res) => {
  res.render('Social/naver/callback');
};

// 프로필 관련 컨트롤러
exports.googleProfile = async (req, res) => {
    try {
        if (!req.session.user || req.session.provider !== 'google') {
            return res.redirect('/auth/login/callback');
        }

        const user = await GoogleUser.findById(req.session.user._id);
        if (!user) {
            return res.redirect('/auth/login/callback');
        }

        res.render('Social/google/profile', {
            user,
            provider: 'google',
            success: req.query.success || null,
            error: null
        });
    } catch (error) {
        console.error('Google Profile Error:', error);
        res.redirect('/auth/login/callback');
    }
};

exports.kakaoProfile = async (req, res) => {
    try {
        if (!req.session.user || req.session.provider !== 'kakao') {
            return res.redirect('/auth/login/callback');
        }

        const user = await KakaoUser.findById(req.session.user._id);
        if (!user) {
            return res.redirect('/auth/login/callback');
        }

        res.render('Social/kakao/profile', {
            user,
            provider: 'kakao',
            success: req.query.success || null,
            error: null
        });
    } catch (error) {
        console.error('Kakao Profile Error:', error);
        res.redirect('/auth/login/callback');
    }
};

exports.naverProfile = async (req, res) => {
    try {
        if (!req.session.user || req.session.provider !== 'naver') {
            return res.redirect('/auth/login/callback');
        }

        const user = await NaverUser.findById(req.session.user._id);
        if (!user) {
            return res.redirect('/auth/login/callback');
        }

        res.render('Social/naver/profile', {
            user,
            provider: 'naver',
            success: req.query.success || null,
            error: null
        });
    } catch (error) {
        console.error('Naver Profile Error:', error);
        res.redirect('/auth/login/callback');
    }
};

// 계정 관리 컨트롤러
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const provider = req.session.provider;
        
        let UserModel;
        switch (provider) {
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
                UserModel = EmailUser;
        }
        
        await UserModel.findByIdAndDelete(userId);
        
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '세션 종료 중 오류가 발생했습니다.'
                });
            }
            res.clearCookie('connect.sid');
            res.json({
                success: true,
                redirectUrl: '/auth/login/callback'
            });
        });
    } catch (error) {
        console.error('Delete Account Error:', error);
        res.status(500).json({
            success: false,
            message: '계정 삭제 중 오류가 발생했습니다.'
        });
    }
};

// Google 로그인 콜백
exports.googleLoginCallback = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleOauth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    let user = await GoogleUser.findOne({ googleId: payload.sub });

    if (!user) {
      user = await GoogleUser.create({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        provider: 'google'
      });
    }

    req.session.user = user;
    req.session.provider = 'google';

    console.log('Google Login Callback - Session:', req.session);

    res.json({
      success: true,
      redirectUrl: user.isProfileComplete ? '/' : '/auth/preferences'
    });
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(500).json({
      success: false,
      message: '구글 로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// Kakao 로그인 콜백
exports.kakaoLoginCallback = async (req, res) => {
  try {
    const { token } = req.body;
    const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { id, kakao_account } = response.data;
    let user = await KakaoUser.findOne({ kakaoId: id });

    if (!user) {
      user = await KakaoUser.create({
        kakaoId: id,
        email: kakao_account.email,
        name: kakao_account.profile.nickname,
        provider: 'kakao'
      });
    }

    req.session.user = user;
    req.session.provider = 'kakao';

    console.log('Kakao Login Callback - Session:', req.session);

    res.json({
      success: true,
      redirectUrl: user.isProfileComplete ? '/' : '/auth/preferences'
    });
  } catch (error) {
    console.error('Kakao Login Error:', error);
    res.status(500).json({
      success: false,
      message: '카카오 로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// Naver 로그인 콜백
exports.naverLoginCallback = async (req, res) => {
  try {
    const { token } = req.body;
    const response = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { id, email, name } = response.data.response;
    let user = await NaverUser.findOne({ naverId: id });

    if (!user) {
      user = await NaverUser.create({
        naverId: id,
        email,
        name,
        provider: 'naver'
      });
    }

    req.session.user = user;
    req.session.provider = 'naver';

    console.log('Naver Login Callback - Session:', req.session);

    res.json({
      success: true,
      redirectUrl: user.isProfileComplete ? '/' : '/auth/preferences'
    });
  } catch (error) {
    console.error('Naver Login Error:', error);
    res.status(500).json({
      success: false,
      message: '네이버 로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

exports.getNewPassword = async (req, res) => {
    const { token } = req.params;
    res.render('auth/new-password', { token });
};

exports.postNewPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            return res.render('auth/new-password', {
                token,
                error: '비밀번호가 일치하지 않습니다.'
            });
        }

        const user = await EmailUser.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('auth/reset-password', {
                error: '유효하지 않거나 만료된 토큰입니다.',
                success: ''
            });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.render('auth/login', {
            error: '',
            success: '비밀번호가 성공적으로 변경되었습니다. 로그인해주세요.'
        });
    } catch (error) {
        res.render('auth/new-password', {
            token,
            error: '비밀번호 변경 중 오류가 발생했습니다.'
        });
    }
};

exports.getForgotPassword = (req, res) => {
    res.render('auth/reset-password', { 
        error: '', 
        success: '' 
    });
};




// 모듈 내보내기
module.exports = {
    renderGoogleLogin: exports.renderGoogleLogin,
    renderKakaoLogin: exports.renderKakaoLogin,
    renderNaverLogin: exports.renderNaverLogin,
    googleLoginCallback: exports.googleLoginCallback,
    kakaoLoginCallback: exports.kakaoLoginCallback,
    naverLoginCallback: exports.naverLoginCallback,
    googleProfile: exports.googleProfile,
    kakaoProfile: exports.kakaoProfile,
    naverProfile: exports.naverProfile,
    deleteAccount: exports.deleteAccount,
    logout: exports.logout,
    getLogin: exports.getLogin,
    postEmailLogin: exports.postEmailLogin,
    getSignup: exports.getSignup,
    postSignup: exports.postSignup,
    postResetPassword: exports.postResetPassword,
    getNewPassword: exports.getNewPassword,
    postNewPassword: exports.postNewPassword,
    toggleLike: exports.toggleLike,
    postVerifyCode: exports.postVerifyCode,
    verifyEmail: exports.verifyEmail,
    getForgotPassword: exports.getForgotPassword,
}; 