/* eslint-disable camelcase */
// axios 오픈
const { default: axios } = require('axios');
// jwt 오픈
const jwt = require('jsonwebtoken');
// db연결
require('../mongooseConnect');
const User = require('../models/user');

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
    if (duplicatedUser) {
      const accessToken = jwt.sign(
        {
          id: kakaoId,
        },
        JWT_ACCESS_SECRET,
        { expiresIn: '1h' },
      );
      const redirectURL = process.env.REDIRECT_URI;
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
