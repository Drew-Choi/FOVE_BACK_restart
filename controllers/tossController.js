/* eslint-disable object-curly-newline */
const { default: axios } = require('axios');
const jwt = require('jsonwebtoken');
require('../mongooseConnect');
const Order = require('../models/order');
const Cancel = require('../models/cancel');

const { JWT_ACCESS_SECRET } = process.env;

// toss쿼리문 받기
const tossApprove = async (req, res) => {
  try {
    const { amount } = req.query;
    const { orderId } = req.query;
    const { paymentKey } = req.query;
    const { orderPrice } = req.query;

    if (orderPrice === amount) {
      // 토스 인증을 위한 키
      const { SECRET_KEY } = process.env;
      const encoder = await new TextEncoder();
      // eslint-disable-next-line prefer-template
      const utf8Array = await encoder.encode(SECRET_KEY + ':');
      const encode = await btoa(String.fromCharCode.apply(null, utf8Array));

      const response = await axios.post(
        'https://api.tosspayments.com/v1/payments/confirm',
        {
          amount,
          orderId,
          paymentKey,
        },
        {
          headers: {
            Authorization: `Basic ${encode}`,
            'Content-Type': 'application/json',
          },
        },
      );
      // eslint-disable-next-line no-unused-expressions
      if (response.status === 200) {
        req.session.cashData = await response.data;
        res.status(200).redirect('http://localhost:3000/store/order_success');
      } else {
        res.status(401).json('인가실패');
      }
    } else {
      res.status(403).json('금액오류 인증실패');
    }
  } catch (err) {
    console.error(err);
    res.status(500);
  }
};

const paymentData = async (req, res) => {
  try {
    if (req.session.cashData) return res.status(200).json(req.session.cashData);
    return res.status(401).json({ message: '인가실패로 데이터가 없음' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

const tossCancel = async (req, res) => {
  try {
    const { orderId } = req.body;
    const { reason } = req.body;
    const { token } = req.body;

    // 취소 전에 토큰 인증부터 혹시 모를 회원이 아님을 대비하여 + 최종 DB 정리시 orderId 및 회원ID 2중 체크
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '회원인증실패 환불 진행 중단' });

      // 토큰 인증 성공시
      const { id } = decoded;

      // 오리지널 orderId 추출
      let originalOrderId = '';
      // 기존 orderId(노멀)
      if (orderId.charAt(0) + orderId.charAt(1) === '20') {
        originalOrderId = orderId.slice(-7);
      } else {
        // 중복 아이디 발생시 앞에서 7자리 자르기 (극히 드문 예외상황)
        originalOrderId = orderId.slice(7);
      }

      // 토스 인증을 위한 키
      const { SECRET_KEY } = process.env;
      const encoder = await new TextEncoder();
      // eslint-disable-next-line prefer-template
      const utf8Array = await encoder.encode(SECRET_KEY + ':');
      const encode = await btoa(String.fromCharCode.apply(null, utf8Array));

      const orderInfo = await axios.get(`https://api.tosspayments.com/v1/payments/orders/${originalOrderId}`, {
        headers: {
          Authorization: `Basic ${encode}`,
        },
      });

      if (orderInfo.status === 200) {
        const key = orderInfo.data.paymentKey;
        const cancelInfo = await axios.post(
          `https://api.tosspayments.com/v1/payments/${key}/cancel`,
          { cancelReason: reason },
          {
            headers: {
              Authorization: `Basic ${encode}`,
              'Content-Type': 'application/json',
            },
          },
        );

        // 토스 취소 승인 성공 후 DB 작업 및 취소데이터 전송
        if (cancelInfo.status === 200) {
          const searchOrder = await Order.findOne({ user: id, 'payments.orderId': orderId });
          const { user, shippingCode } = searchOrder;
          const { orderName, approvedAt, method, discount, totalAmount } = searchOrder.payments;
          const { cancelAmount, cancelReason, transactionKey, canceledAt } = cancelInfo.data.cancels[0];

          const newCancel = {
            user,
            cancels: {
              cancelAmount,
              canceledAt,
              cancelReason,
              transactionKey,
            },
            payments: {
              orderId,
              orderName,
              status: 'CANCELED',
              approvedAt,
              method,
              discount,
              totalAmount,
            },
            recipient: searchOrder.recipient,
            products: searchOrder.products,
            isOrdered: false,
            isShipping: false,
            shippingCode,
            isDelivered: false,
            isCancel: true,
            isReturn: false,
          };

          await Cancel.create(newCancel);
          await Order.deleteOne({ user: id, 'payments.orderId': orderId });

          res.status(200).json(cancelInfo.data);
        } else {
          res.status(401).json({ message: '결체취소 미인증' });
        }
      } else {
        res.status(401).json({ message: '아이디 조회 실패' });
      }
    });
  } catch (err) {
    console.error(err).json({ message: '알 수 없는 오류' });
  }
};

// Admin에서 관리자가 강제 결제취소 - 배송전 가능한 것
const tossCancelAdmin = async (req, res) => {
  try {
    const { orderId } = req.body;
    // 오리지널 orderId 추출
    let originalOrderId = '';
    // 기존 orderId(노멀)
    if (orderId.charAt(0) + orderId.charAt(1) === '20') {
      originalOrderId = orderId.slice(-7);
    } else {
      // 중복 아이디 발생시 앞에서 7자리 자르기 (극히 드문 예외상황)
      originalOrderId = orderId.slice(7);
    }

    // 토스 인증을 위한 키
    const { SECRET_KEY } = process.env;
    const encoder = await new TextEncoder();
    // eslint-disable-next-line prefer-template
    const utf8Array = await encoder.encode(SECRET_KEY + ':');
    const encode = await btoa(String.fromCharCode.apply(null, utf8Array));

    const orderInfo = await axios.get(`https://api.tosspayments.com/v1/payments/orders/${originalOrderId}`, {
      headers: {
        Authorization: `Basic ${encode}`,
      },
    });

    if (orderInfo.status === 200) {
      const key = orderInfo.data.paymentKey;
      const cancelInfo = await axios.post(
        `https://api.tosspayments.com/v1/payments/${key}/cancel`,
        { cancelReason: '환불신청_관리자 권한으로 결제취소' },
        {
          headers: {
            Authorization: `Basic ${encode}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // 토스 취소 승인 성공 후 DB 작업 및 취소데이터 전송
      if (cancelInfo.status === 200) {
        const searchOrder = await Order.findOne({ 'payments.orderId': orderId });
        const { user, shippingCode, submitReturn } = searchOrder;
        const { orderName, approvedAt, method, discount, totalAmount } = searchOrder.payments;
        const { cancelAmount, cancelReason, transactionKey, canceledAt } = cancelInfo.data.cancels[0];

        const newCancel = {
          user,
          cancels: {
            cancelAmount,
            canceledAt,
            cancelReason,
            transactionKey,
          },
          payments: {
            orderId,
            orderName,
            status: 'CANCELED',
            approvedAt,
            method,
            discount,
            totalAmount,
          },
          recipient: searchOrder.recipient,
          products: searchOrder.products,
          isOrdered: false,
          isShipping: false,
          shippingCode,
          isDelivered: false,
          isCancel: true,
          isReturn: false,
          isReturnSubmit: false,
          submitReturn,
        };

        await Cancel.create(newCancel);
        await Order.deleteOne({ 'payments.orderId': orderId });

        res.status(200).json(cancelInfo.data);
      } else {
        res.status(401).json({ message: '결체취소 미인증' });
      }
    } else {
      res.status(401).json({ message: '아이디 조회 실패' });
    }
  } catch (err) {
    console.error(err).json({ message: '알 수 없는 오류' });
  }
};

// Admin에서 관리자가 강제 결제취소 - 환불용
const tossCancelAdminRefund = async (req, res) => {
  try {
    const { orderId } = req.body;
    // 오리지널 orderId 추출
    let originalOrderId = '';
    // 기존 orderId(노멀)
    if (orderId.charAt(0) + orderId.charAt(1) === '20') {
      originalOrderId = orderId.slice(-7);
    } else {
      // 중복 아이디 발생시 앞에서 7자리 자르기 (극히 드문 예외상황)
      originalOrderId = orderId.slice(7);
    }

    // 토스 인증을 위한 키
    const { SECRET_KEY } = process.env;
    const encoder = await new TextEncoder();
    // eslint-disable-next-line prefer-template
    const utf8Array = await encoder.encode(SECRET_KEY + ':');
    const encode = await btoa(String.fromCharCode.apply(null, utf8Array));

    const orderInfo = await axios.get(`https://api.tosspayments.com/v1/payments/orders/${originalOrderId}`, {
      headers: {
        Authorization: `Basic ${encode}`,
      },
    });

    if (orderInfo.status === 200) {
      const key = orderInfo.data.paymentKey;
      const cancelInfo = await axios.post(
        `https://api.tosspayments.com/v1/payments/${key}/cancel`,
        { cancelReason: '환불신청_관리자 권한으로 결제취소' },
        {
          headers: {
            Authorization: `Basic ${encode}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // 토스 취소 승인 성공 후 DB 작업 및 취소데이터 전송
      if (cancelInfo.status === 200) {
        const searchOrder = await Order.findOne({ 'payments.orderId': orderId });
        const { user, shippingCode, submitReturn } = searchOrder;
        const { orderName, approvedAt, method, discount, totalAmount } = searchOrder.payments;
        const { cancelAmount, cancelReason, transactionKey, canceledAt } = cancelInfo.data.cancels[0];

        const newCancel = {
          user,
          cancels: {
            cancelAmount,
            canceledAt,
            cancelReason,
            transactionKey,
          },
          payments: {
            orderId,
            orderName,
            status: 'CANCELED',
            approvedAt,
            method,
            discount,
            totalAmount,
          },
          recipient: searchOrder.recipient,
          products: searchOrder.products,
          isOrdered: false,
          isShipping: false,
          shippingCode,
          isDelivered: false,
          isCancel: true,
          isReturn: true,
          isReturnSubmit: false,
          submitReturn,
        };

        await Cancel.create(newCancel);
        await Order.deleteOne({ 'payments.orderId': orderId });

        res.status(200).json(cancelInfo.data);
      } else {
        res.status(401).json({ message: '결체취소 미인증' });
      }
    } else {
      res.status(401).json({ message: '아이디 조회 실패' });
    }
  } catch (err) {
    console.error(err).json({ message: '알 수 없는 오류' });
  }
};

module.exports = { tossApprove, paymentData, tossCancel, tossCancelAdmin, tossCancelAdminRefund };
