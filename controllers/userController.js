// 접속은 mongooseConnect.js 로. 이미 거기서 접속하므로 여기엔 불러오기만.
require('../mongooseConnect'); // 변수에 담을 필요 없음.
const User = require('../models/user'); // 스키마

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 마이페이지 - 배송 주소록 페이지 ///////////////////////////////////////////////////////////////////////////////
const addAddress = async (req, res) => {
  try {
    // eslint-disable-next-line object-curly-newline
    const { userId, destination, recipient, address, addressDetail, zipCode, recipientPhone } = req.body;
    const newAddress = {
      userId,
      destination,
      recipient,
      address,
      addressDetail,
      zipCode,
      recipientPhone,
    };

    const myData = await User.findOne({ id: userId });
    myData.addresses.push(newAddress);
    await myData.save();
    res.status(200).json({ message: '주소록 저장 성공!', myData });
  } catch (err) {
    console.error(err);
    console.log('에러 발생(서버 문제)');
  }
};

// 마이페이지 주소록 관리에서 주소 데이터 가져오기
const getAddress = async (req, res) => {
  try {
    const { userId } = req.body;

    const myData = await User.findOne({ id: userId });
    const myAddresses = myData.addresses;

    if (!myAddresses || myAddresses.length === 0) {
      res.status(404).json('주소록 정보가 없습니다.');
    }
    res.status(200).json({ message: '주소록 조회 성공!', myAddresses });
  } catch (err) {
    console.error(err);
    console.log('에러 발생(서버 문제)');
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
