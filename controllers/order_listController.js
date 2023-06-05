const jwt = require('jsonwebtoken');
const cheerio = require('cheerio');
const { default: axios } = require('axios');

require('../mongooseConnect');
const Order = require('../models/order');
const Cancle = require('../models/cancel');

const { JWT_ACCESS_SECRET } = process.env;

const changeTimetoNum = (time) => {
  const utcTime = new Date(time);
  // 한국 시차 9시간 더하기
  const koreanTime = utcTime.setHours(utcTime.getHours() + 9);

  return koreanTime;
};

// 개별 상품들 한진배송 체크_클라이언트
const individualCheck = async (arr, decodedId) => {
  arr.map(async (el) => {
    const shippingInfo = await axios.get(
      // eslint-disable-next-line max-len
      `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${el.shippingCode}`,
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      },
    );
    if (shippingInfo.status === 200) {
      const $ = cheerio.load(shippingInfo.data);
      // 운송장 번호 확인 & 상품접수(배송중) & 배송완료, 여기서 자동을 바뀜
      const trackingNumber = $('p[class="comm-sec"]').text().trim();
      // trackingNumber.includes('배송완료')가 false 이면 바로 종료
      if (!trackingNumber.includes('배송완료')) return null;

      // trackingNumber.includes('배송완료')가 true이면 아래 작업 진행
      await Order.findOneAndUpdate(
        { user: decodedId, 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
        { $set: { isShipping: false, isDelivered: true } },
      );
      return null;
    }
  });
};

// 개별 상품들 한진배송 체크_어드민
const individualCheckAdmin = async (arr) => {
  arr.map(async (el) => {
    const shippingInfo = await axios.get(
      // eslint-disable-next-line max-len
      `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${el.shippingCode}`,
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      },
    );
    if (shippingInfo.status === 200) {
      const $ = cheerio.load(shippingInfo.data);
      // 운송장 번호 확인 & 상품접수(배송중) & 배송완료, 여기서 자동을 바뀜
      const trackingNumber = $('p[class="comm-sec"]').text().trim();
      // trackingNumber.includes('배송완료')가 false 이면 바로 종료
      if (!trackingNumber.includes('배송완료')) return null;

      // trackingNumber.includes('배송완료')가 true이면 아래 작업 진행
      await Order.findOneAndUpdate(
        { 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
        { $set: { isShipping: false, isDelivered: true } },
      );
      return null;
    }
  });
};

// 모든 주문내역서 가져오기
const getMemberOrderList = async (req, res) => {
  try {
    const { token } = req.body;

    // 토큰 검증부터 시작
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰인증실패' });

      // 토큰 인증 성공
      // 일단 모든 주문내역 중 payment.status: "DONE"이고, isShipping: true이고, isDelivered: false인 것만 모으기
      const getOrderedListArr = await Order.find({
        user: decoded.id,
        isShipping: true,
        isDelivered: false,
        'payments.status': 'DONE',
      });

      if (!getOrderedListArr || getOrderedListArr.length === 0) {
        const getAllOrderInfo = await Order.find({ user: decoded.id });
        // 날짜순으로 확실히 정렬 내림차순
        const array = getAllOrderInfo.sort(
          (a, b) => changeTimetoNum(b.payments.approvedAt) - changeTimetoNum(a.payments.approvedAt),
        );
        res.status(200).json(array);
      } else {
        await individualCheck(getOrderedListArr, decoded.id);

        setTimeout(async () => {
          const getAllOrderInfo = await Order.find({ user: decoded.id });
          // 날짜순으로 확실히 정렬 내림차순
          const array = getAllOrderInfo.sort(
            (a, b) => changeTimetoNum(b.payments.approvedAt) - changeTimetoNum(a.payments.approvedAt),
          );
          res.status(200).json(array);
        }, 1000);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

// 모든 취소내역서 가져오기
const getCancelList = async (req, res) => {
  try {
    const { token } = await req.body;
    // 토큰 받아 인증 받기
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '회원인증실패' });

      // 토큰 인증 성공시
      const cancelListInfo = await Cancle.find({ user: decoded.id });
      // 날짜순으로 확실히 정렬 내림차순
      const array = cancelListInfo.sort(
        (a, b) => changeTimetoNum(b.cancels.canceledAt) - changeTimetoNum(a.cancels.canceledAt),
      );
      res.status(200).json(array);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

// 취소할 특정 상품 가져오기
const orderCancelGetItem = async (req, res) => {
  try {
    const { orderId, token } = await req.body;
    // 토큰 받아 인증 받기
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '회원인증실패' });

      // 토큰 인증 성공시
      const orderInfo = await Order.findOne({ user: decoded.id, 'payments.orderId': orderId });
      res.status(200).json(orderInfo);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 에러' });
  }
};

// ---- Admin 미들웨어

const getAdminOrderList = async (req, res) => {
  try {
    const getSelectOrderedListArr = await Order.find({
      isOrdered: true,
      isShipping: true,
      isDelivered: false,
      'payments.status': 'DONE',
    });

    if (!getSelectOrderedListArr || getSelectOrderedListArr.length === 0) {
      const orderListInfo = await Order.find({});

      if (!orderListInfo) return res.status(500).json('데이터 오류');
      // oderListInfo에 모든 정보가 잘 들어오면,
      // 날짜순으로 확실히 정렬 내림차순
      const array = orderListInfo.sort(
        (a, b) => changeTimetoNum(b.payments.approvedAt) - changeTimetoNum(a.payments.approvedAt),
      );
      res.status(200).json(array);
    } else {
      await individualCheckAdmin(getSelectOrderedListArr);

      setTimeout(async () => {
        const orderListInfo = await Order.find({});
        // oderListInfo에 모든 정보가 잘 들어오면,
        // 날짜순으로 확실히 정렬 내림차순
        const array = orderListInfo.sort(
          (a, b) => changeTimetoNum(b.payments.approvedAt) - changeTimetoNum(a.payments.approvedAt),
        );
        res.status(200).json(array);
      }, 1000);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

const getAdminCancelList = async (req, res) => {
  try {
    const cancelListInfo = await Cancle.find({});

    if (!cancelListInfo) return res.status(500).json('데이터 오류');
    // oderListInfo에 모든 정보가 잘 들어오면,
    // 날짜순으로 확실히 정렬 내림차순
    const array = cancelListInfo.sort(
      (a, b) => changeTimetoNum(b.cancels.canceledAt) - changeTimetoNum(a.cancels.canceledAt),
    );
    res.status(200).json(array);
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

// Admin 주문내역조회에서 디테일 영역으로 진입
const getAdminOrderListDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderIdInfo = await Order.findOne({ 'payments.orderId': orderId });

    if (!orderIdInfo) return res.status(400).json('해당 주문번호가 없습니다.');
    // 데이터가 잘 들어왔다면,
    return res.status(200).json(orderIdInfo);
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

// Admin 입금 전 주문내역 강제취소
const adminOrderDelete = async (req, res) => {
  try {
    const { orderId } = req.params;
    // 찾아서 삭제하기
    const result = await Order.findOneAndDelete({ 'payments.orderId': orderId });

    if (!result) return res.status(400).json('삭제실패, 일치하는 orderId가 없음');
    // 만약 result가 있다면,
    return res.status(200).json('삭제완료');
  } catch (err) {
    console.error(err);
    return res.status(500).json('알 수 없는 오류');
  }
};

// Admin 반품신청 후 교환 진행 시
const adminOrderReturn = async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await Order.findOneAndUpdate(
      { 'payments.orderId': orderId },
      // eslint-disable-next-line object-curly-newline
      {
        $set: {
          isDelivered: false,
          isShipping: false,
          isCancel: false,
          isReturnSubmit: false,
          isReturn: true,
        },
      },
      { new: true },
    );

    if (!result) return res.status(400).json('주문번호 찾지 못함, 교환신청 실패');
    // result가 true이면,
    res.status(200).json('반품신청 성공');
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

// 교환신청 철회시 관리자만 가능
const adminadminOrderReturnCanel = async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await Order.findOneAndUpdate(
      { 'payments.orderId': orderId },
      // eslint-disable-next-line object-curly-newline
      {
        $set: {
          isDelivered: true,
          isShipping: false,
          isCancel: false,
          isReturnSubmit: false,
          isReturn: false,
        },
      },
      { new: true },
    );

    if (!result) return res.status(400).json('주문번호 찾지 못함, 교환철회 실패');
    // result가 true이면,
    console.log('성공');
    res.status(200).json('반품신청 철회 성공');
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

module.exports = {
  getMemberOrderList,
  orderCancelGetItem,
  getCancelList,
  getAdminOrderList,
  getAdminCancelList,
  getAdminOrderListDetail,
  adminOrderDelete,
  adminOrderReturn,
  adminadminOrderReturnCanel,
};
