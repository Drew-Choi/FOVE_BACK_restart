// 접속은 mongooseConnect.js 로. 이미 거기서 접속하므로 여기엔 불러오기만.
const jwt = require('jsonwebtoken');
require('../mongooseConnect'); // 변수에 담을 필요 없음.
const User = require('../models/user'); // 스키마

const { JWT_ACCESS_SECRET } = process.env;

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 마이페이지 - 배송 주소록 페이지 ///////////////////////////////////////////////////////////////////////////////
const addAddress = async (req, res) => {
  try {
    const { token } = req.body;

    // 로그인 아이디 토큰 검증
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      // 토큰 오류시
      if (err) return res.status(401).json({ message: '토큰 인증 오류' });

      // 토큰 인증 성공시 아래
      const { newAddress } = req.body;
      await User.findOneAndUpdate({ id: decoded.id }, { $set: { 'addresses.0': newAddress } });
      res.status(200).json('업데이트성공');
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('에러 발생(서버 문제)');
  }
};

// 마이페이지 주소록 관리에서 주소 데이터 가져오기
const getAddress = async (req, res) => {
  try {
    const { token } = req.body;

    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      // 토큰 오류시
      if (err) return res.status(401).json({ message: '토큰 인증 오류' });

      // 토큰 인증 완료시 아래
      const userInfo = await User.findOne({ id: decoded.id });

      if (!userInfo) return res.status(404).json('사용자 정보 없음');
      // 정보가 잘 들어왔다면,
      res.status(200).json(userInfo.addresses[0]);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류(서버)');
  }
};

// 마이페이지 주소록 배송지주소 삭제하기
const deleteAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.body;
    const myData = await User.findOne({ id: userId });
    const myAddresses = myData.addresses;
    // eslint-disable-next-line no-underscore-dangle
    const addressIndex = myAddresses.findIndex((address) => address._id.toString() === addressId);

    myAddresses.splice(addressIndex, 1);
    await myData.save();

    res.status(200).json({ message: '배송지지주소 삭제 성공!', myAddresses });
    console.log(myData);
  } catch (err) {
    console.error(err);
    console.log('에러 발생(서버 문제)');
  }
};

module.exports = {
  addAddress,
  getAddress,
  deleteAddress,
  // getUserData,
};
