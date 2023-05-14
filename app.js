/* eslint-disable camelcase */
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// db연결
require('./mongooseConnect');
const User = require('./models/user');

const app = express();

const { PORT } = process.env;

app.use(cors());
// bodyparser 를 위한 코드 2줄
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
app.post('/kakaocb', async (req, res) => {
  try {
    const { code } = await req.query;
    const responseToken = await axios.post('https://kauth.kakao.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.REST_API_KEY,
      redirect_uri: process.env.REDIRECT_URI_BACK,
      code,
    });

    const { access_token, refresh_token } = responseToken.data;

    // access_token으로 카카오회원 정보 가져오기
    const kakaoUserInfo = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });
    console.log(kakaoUserInfo.data);
    const kakaoId = await kakaoUserInfo.data.kakao_account.email;

    // 몽고DB 아이디 중복여부 체크
    const duplicatedUser = await User.findOne({ id: kakaoId });

    if (duplicatedUser) {
      await User.updateOne({ id: kakaoId }, { $set: { accessToken: access_token, refreshToken: refresh_token } });
      res.status(200).send(kakaoId);
    } else {
      const newUser = {
        id: kakaoId,
        password: 'none',
        name: kakaoUserInfo.data.properties.nickname,
        phone: '',
        addresses: [
          {
            destination: kakaoUserInfo.data.properties.nickname,
            recipient: kakaoUserInfo.data.properties.nickname,
            address: '',
            addressDetail: '',
            zipCode: '',
            recipientPhone: '',
            isDefault: true,
          },
        ],
        accessToken: access_token,
        refreshToken: refresh_token,
      };

      const user = new User(newUser);
      await user.save();
      res.status(200).send(kakaoId);
    }
  } catch (error) {
    console.error(error);
    console.log(error);
    res.status(400).send('로그인 실패');
  }
});

// ------------------- DB 연결 -------------------
app.listen(PORT, () => {
  console.log(`${PORT}번 포트에서 서버가 실행 중입니다.`);
});
