/* eslint-disable camelcase */
// axios 오픈
const { default: axios } = require('axios');
// jwt 오픈
const jwt = require('jsonwebtoken');
// db연결
require('../mongooseConnect');
const User = require('../models/user');
const Cart = require('../models/cart');

// UTC기준 시간을 한국 시간으로 바꾸기 시차 9시간
const koreanTime = () => {
  const now = new Date();
  const koreanOffset = 9 * 60;
  const offsetMillisec = koreanOffset * 60 * 1000;
  const koreaTime = new Date(now.getTime() + offsetMillisec);
  return koreaTime;
};

const kakaoCallBack = async (req, res) => {
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
    // 아이디가 있다면,
    if (duplicatedUser) {
      const accessToken = jwt.sign(
        {
          id: kakaoId,
        },
        JWT_ACCESS_SECRET,
        { expiresIn: '2h' },
      );
      const redirectURL = process.env.REDIRECT_URI;
      const data = { key: accessToken };
      const query = new URLSearchParams(data).toString();
      const finalURL = `${redirectURL}?${query}`;
      res.status(200).redirect(finalURL);
    } else {
      // 아이디가 없다면 새로 만들어 DB저장
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
            recipient: nickname,
            address: '',
            addressDetail: '',
            zipCode: '',
            recipientPhone: '',
            message_ad: '',
            isDefault: true,
          },
        ],
        points: 0, // 포인트
        createAt: koreanTime(), // 가입일
        isActive: true, // 활동 상태 여부(회원/탈퇴)
        isAdmin: false, // 관리자 여부
      };
      const newCart = {
        user: kakaoId,
        products: [],
      };
      await User.create(newUser);
      await Cart.create(newCart);
      const accessToken = jwt.sign(
        {
          id: kakaoId,
        },
        JWT_ACCESS_SECRET,
        { expiresIn: '2h' },
      );
      const redirectURL = process.env.REDIRECT_URI;
      const data = { key: accessToken };
      const query = new URLSearchParams(data).toString();
      const finalURL = `${redirectURL}?${query}`;
      res.status(200).redirect(finalURL);
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '로그인 실패' });
  }
};

module.exports = { kakaoCallBack };
