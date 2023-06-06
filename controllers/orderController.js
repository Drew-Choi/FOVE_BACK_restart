const jwt = require('jsonwebtoken');
const Order = require('../models/order');

const filterUniqueCode = (time) => {
  const uniqueKey = time.replace(/[-T:]/g, '').replace(/\+.*/, '');

  return uniqueKey;
};

// 한개의 상품을 바로 주문할경우
const addOrder = async (req, res) => {
  try {
    const {
      token,
      products,
      message,
      recipientName,
      recipientZipcode,
      recipientAddress,
      recipientAddressDetail,
      phoneCode,
      phoneMidNum,
      phoneLastNum,
      payments,
    } = req.body;

    const { JWT_ACCESS_SECRET } = process.env;
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 오류 및 토큰 기한 만료' });

      // eslint-disable-next-line object-curly-newline
      const { status, orderId, orderName, approvedAt, discount, totalAmount, method } = payments;
      const key = filterUniqueCode(approvedAt);
      const newOrderId = key + orderId;
      // 토큰인증 성공시
      const order = await Order.find({ 'payments.orderId': newOrderId });
      const user = decoded.id;
      const recipient = {
        recipientName,
        recipientZipcode,
        recipientAddress,
        recipientAddressDetail,
        phoneCode,
        phoneMidNum,
        phoneLastNum,
        message,
      };

      if (order.length === 0) {
        const newPayments = {
          status,
          orderId: newOrderId,
          orderName,
          approvedAt,
          discount,
          totalAmount,
          method,
        };
        const newOrder = {
          user,
          payments: newPayments,
          recipient,
          products,
        };
        await Order.create(newOrder);
        res.status(200).json({ message: '주문성공' });
      } else {
        const newPayments = {
          status,
          orderId: orderId + key,
          orderName,
          approvedAt,
          discount,
          totalAmount,
          method,
        };
        const newOrder = {
          user,
          payments: newPayments,
          recipient,
          products,
        };
        await Order.create(newOrder);
        res.status(200).json({ message: '주문성공' });
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json('중복된 주문입니다.');
    } else {
      console.error(err);
      res.status(500).json('주문하기 실패');
    }
  }
};

// 카트에서 여러 상품을 가지고 주문
module.exports = {
  addOrder,
};
