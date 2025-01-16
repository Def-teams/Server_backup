const jwt = require('jsonwebtoken');

// 인증 확인 미들웨어
exports.ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// API 인증 미들웨어
exports.ensureAuthenticatedAPI = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ 
    success: false, 
    message: '로그인이 필요합니다.' 
  });
};

// 프로필 완료 확인 미들웨어
exports.ensureProfileComplete = (req, res, next) => {
  if (req.session.user && req.session.user.isProfileComplete) {
    return next();
  }
  res.redirect('/auth/preferences');
};

// 소셜 로그인 사용자 확인 미들웨어
exports.checkSocialUser = (req, res, next) => {
  if (req.session.user && req.session.provider !== 'email') {
    return res.status(400).json({
      success: false,
      message: '소셜 로그인 사용자는 이 기능을 사용할 수 없습니다.'
    });
  }
  next();
};

// JWT 토큰 검증 미들웨어
exports.verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 없습니다.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }
};

// 에러 처리 미들웨어
exports.errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // 개발 환경에서만 자세한 에러 정보 전송
  const error = process.env.NODE_ENV === 'development' ? err : {};
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '서버 오류가 발생했습니다.',
    error
  });
};

// 로그인 상태 확인 미들웨어
exports.checkLoginStatus = (req, res, next) => {
  res.locals.isAuthenticated = req.session && req.session.user ? true : false;
  res.locals.currentUser = req.session ? req.session.user : null;
  next();
};

// 접근 권한 확인 미들웨어
exports.checkPermission = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }

  if (req.params.userId !== req.session.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: '접근 권한이 없습니다.'
    });
  }

  next();
};

module.exports = exports; 