/* eslint-disable object-curly-newline */
const { default: axios } = require('axios');
const jwt = require('jsonwebtoken');

require('../mongooseConnect');
const Order = require('../models/order');
const Cancel = require('../models/cancel');
const Product = require('../models/product');
const Session = require('../models/session');

const { JWT_ACCESS_SECRET } = process.env;

// toss쿼리문 받기
const tossApprove = async (req, res) => {
  try {
    // 결제전 마지막 재고 체크
    const { products } = await req.query;
    // JSON을 배열자료형으로 변환
    const productArr = await JSON.parse(products);
    // 배열의 요소들을 순회하면서 재고체크하기 만약 주문수량이 재고량을 초과한다면 오류를 내서 결제를 막는다.
    // 순회작업
    const exceededItem = productArr.map(async (el) => {
      const sizeValue = el.size;
      const productInfo = await Product.findOne({ productName: el.productName, productCode: el.productCode });
      if (productInfo.size[sizeValue] < el.quantity) {
        return el;
      }
    });
    // 모든 프로미스가 완되는 순간까지 기다리기 위한 Promise.all
    // eslint-disable-next-line no-undef
    const exceededItemFilter = (await Promise.all(exceededItem)).filter(Boolean);

    if (exceededItemFilter.length !== 0) {
      res.redirect('http://localhost:3000/store/order/checkout/fail');
    } else {
      // exceededItemFilter의 값이 빈 배열이라면, 재고량 초과하는게 없으니 아래 진행
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
          console.log('세션 저장 :', req.session.cashData);
          res.redirect('http://localhost:3000/store/order_success');
        } else {
          res.status(401).json('인가실패');
        }
      } else {
        res.status(403).json('금액오류 인증실패');
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '알 수 없는 오류' });
  }
};

const paymentData = async (req, res) => {
  try {
    const sessionId = req.session.id;

    const sessionInfo = await Session.findOne({ _id: sessionId });
    const parse = JSON.parse(sessionInfo.session);
    const { cashData } = parse;
    console.log('원본데이터 :', cashData);
    res.status(200).json(cashData);
  } catch (err) {
    console.error(err);
    return res.status(500).json('알 수 없는 오류');
  }
};

// 배송 전 취소임
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

      // orderId를 통해 paymentKey 받기
      const orderInfo = await axios.get(`https://api.tosspayments.com/v1/payments/orders/${originalOrderId}`, {
        headers: {
          Authorization: `Basic ${encode}`,
        },
      });

      if (orderInfo.status === 200) {
        // 페이먼츠키가 성공적으로 들어온다면,
        const key = orderInfo.data.paymentKey;
        // 토스페이먼츠에 결제취소 요청하고, 취소 데이터 받기
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
          const { shippingCode, payments, recipient, products } = searchOrder;
          const { cancelAmount, cancelReason, transactionKey, canceledAt } = cancelInfo.data.cancels[0];

          const newCancel = {
            user: id,
            cancels: {
              cancelAmount,
              canceledAt,
              cancelReason,
              transactionKey,
            },
            payments: {
              orderId: payments.orderId,
              orderName: payments.orderName,
              status: 'CANCELED',
              approvedAt: payments.approvedAt,
              method: payments.method,
              discount: payments.discount,
              totalAmount: payments.totalAmount,
            },
            recipient,
            products,
            shippingCode,
            isCancel: true,
          };

          await Cancel.create(newCancel);

          // 재고정리
          await products.forEach(async (el) => {
            const sizeValue = el.size;
            await Product.findOneAndUpdate(
              { productCode: el.productCode, productName: el.productName },
              { $inc: { [`size.${sizeValue}`]: +el.quantity } },
            );
          });

          await Order.deleteOne({ user: id, 'payments.orderId': orderId });

          res.status(200).json(cancelInfo.data);
        } else {
          res.status(401).json({ message: '결체취소 미인증' });
        }
      } else {
        res.status(401).json({ message: '주문내역 조회 실패' });
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json('중복된 취소 오류');
    } else {
      console.error(err);
      res.status(500).json('결제 취소 실패');
    }
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
          shippingCode,
          isCancel: true,
          submitReturn,
        };

        await Cancel.create(newCancel);

        // 재고정리
        await searchOrder.products.forEach(async (el) => {
          const sizeValue = el.size;
          await Product.findOneAndUpdate(
            { productCode: el.productCode, productName: el.productName },
            { $inc: { [`size.${sizeValue}`]: +el.quantity } },
          );
        });

        await Order.deleteOne({ 'payments.orderId': orderId });

        res.status(200).json(cancelInfo.data);
      } else {
        res.status(401).json({ message: '결체취소 미인증' });
      }
    } else {
      res.status(401).json({ message: '아이디 조회 실패' });
    }
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json('고유 값 중복 오류');
    }
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

// Admin에서 관리자가 강제 결제취소 - 환불용 - 상품 수령확인 후 진행
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
          shippingCode,
          isCancel: true,
          isRetrieved: true,
          isRefund: true,
          isReturnSubmit: true,
          submitReturn,
        };

        await Cancel.create(newCancel);

        // 재고정리
        await searchOrder.products.forEach(async (el) => {
          const sizeValue = el.size;
          await Product.findOneAndUpdate(
            { productCode: el.productCode, productName: el.productName },
            { $inc: { [`size.${sizeValue}`]: +el.quantity } },
          );
        });

        await Order.deleteOne({ 'payments.orderId': orderId });

        res.status(200).json(cancelInfo.data);
      } else {
        res.status(401).json({ message: '결체취소 미인증' });
      }
    } else {
      res.status(401).json({ message: '아이디 조회 실패' });
    }
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json('고유 값 중복 오류');
    }
    console.error(err).json({ message: '알 수 없는 오류' });
  }
};

module.exports = { tossApprove, paymentData, tossCancel, tossCancelAdmin, tossCancelAdminRefund };
