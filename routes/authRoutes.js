const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// 컨트롤러 함수들을 임포트
const {
    renderGoogleLogin,
    renderKakaoLogin,
    renderNaverLogin,
    googleLoginCallback,
    kakaoLoginCallback,
    naverLoginCallback,
    googleProfile,
    kakaoProfile,
    naverProfile,
    deleteAccount,
    logout,
    getLogin,
    postEmailLogin,
    getSignup,
    postSignup,
    postResetPassword,
    getNewPassword,
    postNewPassword,
    postVerifyCode,
    verifyEmail,
    getForgotPassword
} = require('../controllers/authController');

// 디버깅: 컨트롤러 함수들이 제대로 임포트되었는지 확인
const controllerFunctions = {
    renderGoogleLogin,
    renderKakaoLogin,
    renderNaverLogin,
    googleLoginCallback,
    kakaoLoginCallback,
    naverLoginCallback,
    googleProfile,
    kakaoProfile,
    naverProfile,
    deleteAccount,
    logout,
    getLogin,
    postEmailLogin,
    getSignup,
    postSignup,
    postResetPassword,
    getNewPassword,
    postNewPassword,
    postVerifyCode,
    verifyEmail,
    getForgotPassword
};

// 정의되지 않은 컨트롤러 함수 확인
const undefinedControllers = Object.entries(controllerFunctions)
    .filter(([name, func]) => !func)
    .map(([name]) => name);

if (undefinedControllers.length > 0) {
    console.error('미정의된 컨트롤러 함수들:', undefinedControllers);
    console.log('전체 컨트롤러 객체:', controllerFunctions);
    throw new Error(`다음 컨트롤러 함수들이 정의되지 않았습니다: ${undefinedControllers.join(', ')}`);
}

// 라우트 정의 전에 각 미들웨어 함수 존재 확인
if (!ensureAuthenticated) {
    console.error('ensureAuthenticated 미들웨어가 정의되지 않았습니다.');
    throw new Error('필수 미들웨어가 누락되었습니다.');
}

// 소셜 로그인 라우트
router.get('/google', renderGoogleLogin);
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/auth/login/callback' }),
    googleLoginCallback
);

router.get('/kakao', renderKakaoLogin);
router.get('/kakao/callback',
    passport.authenticate('kakao', { failureRedirect: '/auth/login/callback' }),
    kakaoLoginCallback
);

router.get('/naver', renderNaverLogin);
router.get('/naver/callback',
    passport.authenticate('naver', { failureRedirect: '/auth/login/callback' }),
    naverLoginCallback
);

// 프로필 라우트
router.get('/google-profile', ensureAuthenticated, (req, res, next) => {
    console.log('Google Profile 접근:', {
        session: req.session,
        user: req.user,
        provider: req.session?.provider
    });
    if (req.session?.provider !== 'google') {
        return res.redirect('/auth/login/callback');
    }
    next();
}, googleProfile);

router.get('/kakao-profile', ensureAuthenticated, (req, res, next) => {
    console.log('Kakao Profile 접근:', {
        session: req.session,
        user: req.user,
        provider: req.session?.provider
    });
    if (req.session?.provider !== 'kakao') {
        return res.redirect('/auth/login/callback');
    }
    next();
}, kakaoProfile);

router.get('/naver-profile', ensureAuthenticated, (req, res, next) => {
    console.log('Naver Profile 접근:', {
        session: req.session,
        user: req.user,
        provider: req.session?.provider
    });
    if (req.session?.provider !== 'naver') {
        return res.redirect('/auth/login/callback');
    }
    next();
}, naverProfile);

// 계정 관리 라우트
router.post('/delete-account', ensureAuthenticated, (req, res, next) => {
    console.log('계정 삭제 요청:', {
        session: req.session,
        user: req.user,
        provider: req.session?.provider
    });
    next();
}, deleteAccount);

// 로그아웃 라우트
router.get('/logout', (req, res, next) => {
    console.log('로그아웃 요청:', {
        session: req.session,
        user: req.user,
        provider: req.session?.provider
    });
    next();
}, logout);

// 로그인 라우트
router.get('/login', (req, res) => {
    res.render('auth/login', { error: '', success: '' });
});
router.post('/login', postEmailLogin);

// 회원가입 라우트
router.get('/signup', (req, res) => {
    res.render('auth/signup', { error: '' });
});
router.post('/signup', postSignup);

// 비밀번호 찾기/재설정 라우트
router.get('/forgot-password', getForgotPassword);
router.get('/reset-password', (req, res) => {
    res.render('auth/reset-password', { error: '', success: '' });
});
router.post('/reset-password', postResetPassword);
router.post('/verify-code', postVerifyCode);
router.post('/new-password', postNewPassword);

// 이메일 인증 라우트
router.get('/verify-email/:token', verifyEmail);

// 에러 핸들링 미들웨어
router.use((err, req, res, next) => {
    console.error('라우트 에러:', err);
    res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

router.get('/new-password/:token', getNewPassword);

router.get('/preferences', (req, res) => {
    res.render('auth/preferences');
});

module.exports = router; 