/* eslint-disable camelcase */
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const session = require('express-session');

// 익스프레스 열기
const app = express();

// db연결
require('./mongooseConnect');
const User = require('./models/user');

const { PORT } = process.env;

// CORS 허용포트 설정
app.use(
  cors({
    origin: 'http://localhost:3000',
  }),
);

// bodyparser 를 위한 코드 2줄
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 세션설정
app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
  }),
);

// ------CSP-----
// app.use((req, res, next) => {
//   res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'nonce-<my-nonce-value>'");
//   next();
// });

// ------------------- 라우터 -------------------
const cartRouter = require('./routes/cart');
const userRouter = require('./routes/user');
const loginRouter = require('./routes/login');
const adminRouter = require('./routes/admin');
const productRouter = require('./routes/product');
const storeRouter = require('./routes/store');
const registerRouter = require('./routes/register');
const boardRouter = require('./routes/board');
const noticeRouter = require('./routes/notice');
const mypageRouter = require('./routes/mypage');
const tossRouter = require('./routes/toss');
// const orderRouter = require('./routes/order');

app.use('/cart', cartRouter);
app.use('/user', userRouter);
app.use('/login', loginRouter);
app.use('/admin', adminRouter);
app.use('/product', productRouter);
app.use('/store', storeRouter);
app.use('/register', registerRouter);
app.use('/uploads', express.static('uploads'));
app.use('/board', boardRouter);
app.use('/notice', noticeRouter);
app.use('/mypage', mypageRouter);
app.use('/toss', tossRouter);
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

// 카카오로그인
app.get('/kakaocb', async (req, res) => {
  try {
    const { code } = await req.query;
    const responseToken = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: process.env.REST_API_KEY,
        redirect_uri: process.env.REDIRECT_URI_BACK,
        code,
        client_secret: process.env.CLIENT_SECRET_KEY,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      },
    );

    const { access_token } = responseToken.data;

    // access_token으로 카카오회원 정보 가져오기
    const kakaoUserInfo = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const kakaoId = await kakaoUserInfo.data.kakao_account.email;
    const nickname = await kakaoUserInfo.data.kakao_account.profile.nickname;

    // 몽고DB 아이디 중복여부 체크
    const duplicatedUser = await User.findOne({ id: kakaoId });
    const { JWT_ACCESS_SECRET } = process.env;
    if (duplicatedUser) {
      const accessToken = jwt.sign(
        {
          id: kakaoId,
        },
        JWT_ACCESS_SECRET,
        { expiresIn: '1h' },
      );
      const redirectURL = 'http://localhost:3000/login/kakao/callback';
      const data = { key: accessToken };
      const query = new URLSearchParams(data).toString();
      const finalURL = `${redirectURL}?${query}`;
      res.status(200).redirect(finalURL);
    } else {
      const newUser = {
        id: kakaoId,
        password: 'none',
        name: nickname,
        phone: '',
        age_Range: kakaoUserInfo.data.kakao_account.age_range,
        gender: kakaoUserInfo.data.kakao_account.gender,
        thumbnail_Image: kakaoUserInfo.data.kakao_account.profile.thumbnail_image_url,
        profile_Image: kakaoUserInfo.data.kakao_account.profile.profile_image_url,
        addresses: [
          {
            destination: nickname,
            recipient: nickname,
            address: '',
            addressDetail: '',
            zipCode: '',
            recipientPhone: '',
            isDefault: true,
          },
        ],
      };
      await User.create(newUser);
      const accessToken = jwt.sign(
        {
          id: kakaoId,
        },
        JWT_ACCESS_SECRET,
        { expiresIn: '1h' },
      );
      const redirectURL = 'http://localhost:3000/login/kakao/callback';
      const data = { key: accessToken };
      const query = new URLSearchParams(data).toString();
      const finalURL = `${redirectURL}?${query}`;
      res.status(200).redirect(finalURL);
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '로그인 실패' });
  }
});

// 로그인 유지 미들웨어
app.post('/islogin', (req, res) => {
  const { JWT_ACCESS_SECRET } = process.env;
  jwt.verify(req.body.token, JWT_ACCESS_SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ message: '토큰 기한 만료. 로그아웃.' });

    // 토큰 검증 성공
    const duplicatedUser = await User.findOne({ id: decoded.id });
    if (duplicatedUser) {
      res.status(200).json({
        nickName: duplicatedUser.name,
        points: duplicatedUser.points,
        isAdmin: false,
        isLogin: true,
        message: '토큰 검증 완료',
      });
    } else {
      res.status(400).json({ message: '회원이 아닙니다.' });
    }
  });
});

// ------------------- DB 연결 -------------------
app.listen(PORT, () => {
  console.log(`${PORT}번 포트에서 서버가 실행 중입니다.`);
});
