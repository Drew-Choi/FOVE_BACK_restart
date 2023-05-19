const jwt = require('jsonwebtoken');
require('../mongooseConnect');
const Order = require('../models/order');

const { JWT_ACCESS_SECRET } = process.env;

const getMemberOrderList = async (req, res) => {
  try {
    const { token } = req.body;
    // 토큰 받아서 인증 받기
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      // 토큰 인증 실패
      if (err) return res.status(401).json({ message: '회인인증 실패 로그아웃' });

      // 토큰 인증 성공
      const getAllOrderInfo = await Order.find({ user: decoded.id });
      res.status(200).json(getAllOrderInfo);
    });
  } catch (err) {
    console.error(err);
  }
};

module.exports = { getMemberOrderList };
