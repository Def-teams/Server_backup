const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const Clothes = require('./models/Clothes');
require('dotenv').config();

const app = express();

// 미들웨어 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');

// 라우트 설정
const authRoutes = require('./routes/authRoutes');
const homeController = require('./controllers/homeController');

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB 연결 성공'))
  .catch((err) => console.error('MongoDB 연결 실패:', err));

// 홈 라우트 설정
app.get('/', async (req, res) => {
    try {
        const clothes = await Clothes.find()
            .sort({ createdAt: -1 })
            .limit(20);

        res.render('home', {
            user: req.session?.user || null,
            clothes: clothes || []
        });
    } catch (error) {
        console.error('Home page error:', error);
        res.render('home', {
            user: req.session?.user || null,
            clothes: []
        });
    }
});

// auth 라우트 설정
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행중입니다.`);
}); 