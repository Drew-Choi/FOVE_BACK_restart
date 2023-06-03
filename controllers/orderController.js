const jwt = require('jsonwebtoken');
const Order = require('../models/order');
const { default: axios } = require('axios');

const filterUniqueCode = (time) => {
  const uniqueKey = time.replace(/[-T:]/g, '').replace(/\+.*/, '');

  return uniqueKey;
};

// 한개의 상품을 바로 주문할경우
const addOrder = async (req, res) => {
  try {
    // const userId = '643540aa32e0fd94fa801757';

    // // useId 찾는 코드 나중에 넣기!!
    // // 사용자 정보 조회
    // const user = await User.findById(userId);
    // if (!user) {
    //   return res.status(404).json({ message: 'User not found' });
    // }
    const {
      payments,
      products,
      message,
      isOrdered,
      isShipping,
      shippingCode,
      isDelivered,
      isCancel,
      isReturn,
      name,
      address,
      phone,
      email,
      recipientName,
      recipientZipcode,
      recipientAddress,
      recipientAddressDetail,
      telAreaCode,
      telMidNum,
      telLastNum,
      phoneCode,
      phoneMidNum,
      phoneLastNum,
    } = req.body;

    const { JWT_ACCESS_SECRET } = process.env;
    jwt.verify(name, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 오류 및 토큰 기한 만료' });

      // 토큰인증 성공시
      const order = await Order.find({ orderId: payments.orderId });
      const user = decoded.id;
      const recipient = {
        address,
        phone,
        email,
        recipientName,
        recipientZipcode,
        recipientAddress,
        recipientAddressDetail,
        telAreaCode,
        telMidNum,
        telLastNum,
        phoneCode,
        phoneMidNum,
        phoneLastNum,
        message,
      };

      if (order.length === 0) {
        // eslint-disable-next-line object-curly-newline
        const { status, orderId, orderName, approvedAt, discount, cancels, totalAmount, suppliedAmoint, method } =
          payments;
        const key = filterUniqueCode(approvedAt);
        const newPayments = {
          status,
          orderId: key + orderId,
          orderName,
          approvedAt,
          discount,
          cancels,
          totalAmount,
          suppliedAmoint,
          method,
        };
        const newOrder = new Order({
          user,
          payments: newPayments,
          recipient,
          products,
          message,
          isOrdered,
          isShipping,
          shippingCode,
          isDelivered,
          isCancel,
          isReturn,
        });
        await newOrder.save();
      } else {
        // eslint-disable-next-line object-curly-newline
        const { status, orderId, orderName, approvedAt, discount, cancels, totalAmount, suppliedAmoint, method } =
          payments;
        const key = filterUniqueCode(approvedAt);
        const newPayments = {
          status,
          orderId: orderId + key,
          orderName,
          approvedAt,
          discount,
          cancels,
          totalAmount,
          suppliedAmoint,
          method,
        };
        const newOrder = new Order({
          user,
          payments: newPayments,
          recipient,
          products,
          message,
          isOrdered,
          isShipping,
          shippingCode,
          isDelivered,
          isCancel,
          isReturn,
        });
        await newOrder.save();
      }
      res.status(200).json({ message: '주문성공' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('주문하기 실패');
  }
};

const getOrderList = async (req, res) => {
  try {
    const orderListInfo = await Order.find({});

    if (!orderListInfo) return res.status(500).json('데이터 오류');
    // oderListInfo에 모든 정보가 잘 들어오면,
    res.status(200).json(orderListInfo);
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

// 카트에서 여러 상품을 가지고 주문
module.exports = {
  addOrder,
  getOrderList,
};
