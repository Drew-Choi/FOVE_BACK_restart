/* eslint-disable camelcase */
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const session = require('express-session');
const cookieParser = require('cookie-parser');

// 익스프레스 열기
const app = express();

// db연결
require('./mongooseConnect');
const User = require('./models/user');

// 포트설정
const { PORT } = process.env;

// CORS 허용포트 설정
app.use(
  cors({
    origin: 'http://localhost:3000',
  }),
);

// 특정 미들웨어에 세션 통신을 위한 허용
app.use('/toss/data', (req, res, next) => {
  // CORS 설정
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use('/shipping/search', (req, res, next) => {
  // CORS 설정
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// bodyparser 를 위한 코드 2줄
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 쿠키파서 설정
app.use(cookieParser());

// 세션설정
app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 2000,
      httpOnly: true,
    },
  }),
);

// ------------------- 라우터 -------------------
const cartRouter = require('./routes/cart');
const adminRouter = require('./routes/admin');
const productRouter = require('./routes/product');
const storeRouter = require('./routes/store');
const boardRouter = require('./routes/board');
const noticeRouter = require('./routes/notice');
const mypageRouter = require('./routes/mypage');
const order_listRouter = require('./routes/order_list');
const tossRouter = require('./routes/toss');
const kakaoRouter = require('./routes/kakao');
const shippingRouter = require('./routes/shipping');
// const orderRouter = require('./routes/order');

app.use('/cart', cartRouter);
app.use('/admin', adminRouter);
app.use('/product', productRouter);
app.use('/store', storeRouter);
app.use('/uploads', express.static('uploads'));
app.use('/board', boardRouter);
app.use('/notice', noticeRouter);
app.use('/mypage', mypageRouter);
app.use('/order_list', order_listRouter);
app.use('/toss', tossRouter);
app.use('/kakao', kakaoRouter);
app.use('/shipping', shippingRouter);
// app.use('/order', orderRouter);

// ------------------- 미들웨어 -------------------

// env중요키 서버요청
app.get('/dott', async (req, res) => {
  const { key } = req.query;
  const value = process.env[key];

  if (value) {
    res.status(200).json({ key: value });
  } else {
    res.status(400).json({ message: 'Invalid key' });
  }
});

// 로그인 유지 미들웨어
app.post('/islogin', (req, res) => {
  try {
    const { JWT_ACCESS_SECRET } = process.env;
    jwt.verify(req.body.token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 기한 만료. 로그아웃.' });

      // 토큰 검증 성공
      const duplicatedUser = await User.findOne({ id: decoded.id });
      if (duplicatedUser) {
        res.status(200).json({
          nickName: duplicatedUser.name,
          points: duplicatedUser.points,
          isAdmin: duplicatedUser.isAdmin,
          isLogin: duplicatedUser.isActive,
          message: '토큰 검증 완료',
        });
      } else {
        res.status(400).json({ message: '회원이 아닙니다.' });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
});
// ---------------------------------------------

// ------------------- DB 연결 -------------------
app.listen(PORT, () => {
  console.log(`${PORT}번 포트에서 서버가 실행 중입니다.`);
});
