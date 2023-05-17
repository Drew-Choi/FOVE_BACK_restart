/* eslint-disable camelcase */
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

// db연결
require('./mongooseConnect');
const User = require('./models/user');

const app = express();

const { PORT } = process.env;

app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:3000', // 허용할 프론트엔드 도메인과 포트 설정
    credentials: true, // 쿠키 전달을 허용하기 위해 credentials 옵션을 true로 설정
  }),
);

// bodyparser 를 위한 코드 2줄
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ------CSP-----
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'nonce-<my-nonce-value>'");
  next();
});

// session설정(쿠키)
// eslint-disable-next-line no-undef
const secretKey = crypto.randomBytes(64).toString('hex');
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60,
    },
  }),
);

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
// app.use('/order', orderRouter);

// ------------------- 미들웨어 -------------------

// env중요키 서버요청
app.get('/dott', async (req, res) => {
  const { key } = req.query;
  const value = process.env[key];

  if (value) {
    res.status(200).json({ key: value });
  } else {
    res.status(400).json({ error: 'Invalid key' });
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
    console.log(duplicatedUser);

    if (duplicatedUser) {
      await User.updateOne({ id: kakaoId }, { $set: { accessToken: access_token } });

      // 세션발행
      req.session.user = {
        id: kakaoId,
        loggedIn: true,
      };

      res.status(200).redirect('http://localhost:3000/store');
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

      // 세션발행
      req.session.user = {
        id: kakaoId,
        loggedIn: true,
      };

      res.status(200).redirect('http://localhost:3000/store');
    }
  } catch (error) {
    console.error(error);
    console.log(error);
    res.status(400).send(console.log('로그인 실패'));
  }
});

// 프론트 쿠키 처리하여 로그인 유지
app.get('/islogin', async (req, res) => {
  try {
    const cookies = req.headers.cookie;
    const cookiesArr = cookies.split(';');
    const cookieTrim = cookiesArr.map((el) => el.trim());
    const cookieFilter = cookieTrim.filter((el) => el.startsWith('connect.sid='));

    if (cookieFilter) {
      const cookieValueSplit = cookieFilter[0].split('=');
      const cookieValue = cookieValueSplit[1].trim();

      const sessionID = decodeURIComponent(cookieValue);
      console.log('세션 ID:', sessionID);

      const sessionData = req.sessionStore.sessions[sessionID];
      const userId = sessionData ? JSON.parse(sessionData).user.id : null;
      console.log(`회원아이디 : ${userId}`);
    }

    // const duplicatedUser = await User.findOne({ id: userId });
    // if (duplicatedUser) {
    //   const loginUserInfo = {
    //     name: duplicatedUser.name,
    //     points: duplicatedUser.points,
    //   };
    //   res.status(200).send(loginUserInfo);
    // } else {
    //   res.status(401);
    // }
    res.send(console.log('성공'));
  } catch (err) {
    console.error(err);
    res.status(400).send(console.log('인증실패'));
  }
});

// ------------------- DB 연결 -------------------
app.listen(PORT, () => {
  console.log(`${PORT}번 포트에서 서버가 실행 중입니다.`);
});
