/* eslint-disable no-case-declarations */
const jwt = require('jsonwebtoken');
const cheerio = require('cheerio');
const { default: axios } = require('axios');
const fs = require('fs');

require('../mongooseConnect');
const Order = require('../models/order');
const Cancel = require('../models/cancel');

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
      if (
        el.payments.status === 'DONE' &&
        el.isShipping &&
        el.shippingCode !== 0 &&
        !el.isDelivered &&
        !el.isCancel &&
        !el.isReturn &&
        !el.isRetrieved &&
        !el.isRefund &&
        !el.isReturnSubmit
      ) {
        await Order.findOneAndUpdate(
          { user: decodedId, 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
          {
            $set: {
              isShipping: false,
              isDelivered: true,
              isCancel: false,
              isReturn: false,
              isRetrieved: false,
              isRefund: false,
              isReturnSubmit: false,
            },
          },
        );
      } else if (
        el.payments.status === 'DONE' &&
        el.isShipping &&
        el.shippingCode !== 0 &&
        el.isDelivered &&
        !el.isCancel &&
        el.isReturn &&
        !el.isRetrieved &&
        !el.isRefund &&
        el.isReturnSubmit
      ) {
        await Order.findOneAndUpdate(
          { user: decodedId, 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
          {
            $set: {
              isShipping: false,
              isDelivered: false,
              isCancel: false,
              isReturn: true,
              isRetrieved: true,
              isRefund: false,
              isReturnSubmit: true,
            },
          },
        );
      } else if (
        el.payments.status === 'DONE' &&
        el.isShipping &&
        el.shippingCode !== 0 &&
        el.isDelivered &&
        !el.isCancel &&
        !el.isReturn &&
        !el.isRetrieved &&
        el.isRefund &&
        el.isReturnSubmit
      ) {
        await Order.findOneAndUpdate(
          { user: decodedId, 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
          {
            $set: {
              isShipping: false,
              isDelivered: false,
              isCancel: false,
              isReturn: false,
              isRetrieved: true,
              isRefund: true,
              isReturnSubmit: true,
            },
          },
        );
      } else {
        return null;
      }
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
      if (
        el.payments.status === 'DONE' &&
        el.isShipping &&
        el.shippingCode !== 0 &&
        !el.isDelivered &&
        !el.isCancel &&
        !el.isReturn &&
        !el.isRetrieved &&
        !el.isRefund &&
        !el.isReturnSubmit
      ) {
        await Order.findOneAndUpdate(
          { 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
          {
            $set: {
              isShipping: false,
              isDelivered: true,
              isCancel: false,
              isReturn: false,
              isRetrieved: false,
              isRefund: false,
              isReturnSubmit: false,
            },
          },
        );
      } else if (
        el.payments.status === 'DONE' &&
        el.isShipping &&
        el.shippingCode !== 0 &&
        el.isDelivered &&
        !el.isCancel &&
        el.isReturn &&
        !el.isRetrieved &&
        !el.isRefund &&
        el.isReturnSubmit
      ) {
        await Order.findOneAndUpdate(
          { 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
          {
            $set: {
              isShipping: false,
              isDelivered: false,
              isCancel: false,
              isReturn: true,
              isRetrieved: true,
              isRefund: false,
              isReturnSubmit: true,
            },
          },
        );
      } else if (
        el.payments.status === 'DONE' &&
        el.isShipping &&
        el.shippingCode !== 0 &&
        el.isDelivered &&
        !el.isCancel &&
        !el.isReturn &&
        !el.isRetrieved &&
        el.isRefund &&
        el.isReturnSubmit
      ) {
        await Order.findOneAndUpdate(
          { 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
          {
            $set: {
              isShipping: false,
              isDelivered: false,
              isCancel: false,
              isReturn: false,
              isRetrieved: true,
              isRefund: true,
              isReturnSubmit: true,
            },
          },
        );
      } else {
        return null;
      }
    }
  });
};

// 1개 상품 한진배송 체크_어드민
const oneCheckAdmin = async (orderId, shippingCode) => {
  const shippingInfo = await axios.get(
    // eslint-disable-next-line max-len
    `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${shippingCode}`,
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
    const update = await Order.findOneAndUpdate(
      { 'payments.orderId': orderId, shippingCode },
      // eslint-disable-next-line object-curly-newline
      {
        $set: {
          isShipping: false,
          isDelivered: true,
          isCancel: false,
          isReturn: false,
          isRetrieved: false,
          isRefund: false,
          isReturnSubmit: false,
        },
      },
      { new: true },
    );
    return update;
  }
};

// 1개 상품 한진배송 체크_어드민 - 환불용
const oneCheckAdminRefund = async (orderId, shippingCode) => {
  const shippingInfo = await axios.get(
    // eslint-disable-next-line max-len
    `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${shippingCode}`,
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
    const update = await Order.findOneAndUpdate(
      { 'payments.orderId': orderId, shippingCode },
      // eslint-disable-next-line object-curly-newline
      {
        $set: {
          'payments.status': 'DONE',
          isShipping: false,
          isDelivered: false,
          isCancel: false,
          isReturn: false,
          isRetrieved: true,
          isRefund: true,
          isReturnSubmit: true,
        },
      },
      { new: true },
    );
    return update;
  }
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
        'payments.status': 'DONE',
        isShipping: true,
        isCancel: false,
        isRetrieved: false,
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
      const cancelListInfo = await Cancel.find({ user: decoded.id });
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
      if (!orderInfo) {
        const canceledInfo = await Cancel.findOne({ user: decoded.id, 'payments.orderId': orderId });
        // eslint-disable-next-line no-unused-expressions
        canceledInfo ? res.status(200).json(canceledInfo) : res.status(404).json('주문번호 없음');
      } else {
        res.status(200).json(orderInfo);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 에러' });
  }
};

// client 입금 전 주문내역 강제취소
const clientOrderDelete = async (req, res) => {
  try {
    const { orderId, token } = req.body;

    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '회원인증실패' });

      // 토큰 인증 완료되면,
      // 찾아서 삭제하기
      const result = await Order.findOneAndDelete({ user: decoded.id, 'payments.orderId': orderId });
      if (!result) return res.status(400).json('삭제실패, 일치하는 orderId가 없음');
      // 만약 result가 있다면,
      return res.status(200).json('삭제완료');
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json('알 수 없는 오류');
  }
};

// ---- Admin 미들웨어

const getAdminOrderList = async (req, res) => {
  try {
    const getSelectOrderedListArr = await Order.find({
      'payments.status': 'DONE',
      isShipping: true,
      isCancel: false,
      isRetrieved: false,
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
    const cancelListInfo = await Cancel.find({});

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

    const search = await Order.findOne({ 'payments.orderId': orderId });

    if (!search) res.status(404).json('주문번호 없음');
    // true 라면
    const result = await Order.findOneAndUpdate(
      { 'payments.orderId': orderId },
      // eslint-disable-next-line object-curly-newline
      {
        $set: {
          'payments.status': 'DONE',
          isShipping: false,
          shippingCode: search.shippingCode,
          isDelivered: true,
          isCancel: false,
          isReturn: true,
          isRetrieved: false,
          isRefund: false,
          isReturnSubmit: true,
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

// Admin 배송상태 컨트롤러(라디오박스)
const reqAdminShippingCondition = async (req, res) => {
  try {
    const { orderId, adminShippingCondition, shippingCode } = req.body;

    const search = await Order.findOne({ 'payments.orderId': orderId });

    if (!search) return res.status(400).json('주문번호 오류');
    // 주문내역이 잘 들어왔다면 아래,
    const selectStatusOption = (data, code) => {
      switch (data) {
        case '결제 전':
          const statusInfo1 = {
            'payments.status': 'READY',
            isShipping: false,
            shippingCode: 0,
            isDelivered: false,
            isCancel: false,
            isReturn: false,
            isRetrieved: false,
            isRefund: false,
            isReturnSubmit: false,
          };
          return statusInfo1;
        case '결제완료 (배송 전)':
          const statusInfo2 = {
            'payments.status': 'DONE',
            isShipping: false,
            shippingCode: 0,
            isDelivered: false,
            isCancel: false,
            isReturn: false,
            isRetrieved: false,
            isRefund: false,
            isReturnSubmit: false,
          };
          return statusInfo2;
        case '배송 중':
          const statusInfo3 = {
            'payments.status': 'DONE',
            isShipping: true,
            shippingCode: code,
            isDelivered: false,
            isCancel: false,
            isReturn: false,
            isRetrieved: false,
            isRefund: false,
            isReturnSubmit: false,
          };
          return statusInfo3;
        default:
          return null;
      }
    };

    if (selectStatusOption(adminShippingCondition, shippingCode) === null) {
      if (adminShippingCondition === '배송완료') {
        const shippingInfo = await oneCheckAdmin(orderId, search.shippingCode);
        if (shippingInfo === null) return res.status(404).json('아직 배송 중 입니다.');
        // shippingInfo가 null이 아니라면,
        res.status(200).json(shippingInfo);
      } else {
        res.status(400).json('입력오류');
      }
    } else {
      // 아니라면,
      const updateData = await Order.findOneAndUpdate(
        { 'payments.orderId': orderId },
        { $set: selectStatusOption(adminShippingCondition, shippingCode) },
        { new: true },
      );
      res.status(200).json(updateData);
    }
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json('주문번호 중복');
    }
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

// Admin 환불진행상태 컨트롤러(라디오박스)
const reqAdminSubmitReturnCondition = async (req, res) => {
  try {
    const { orderId, adminSubmitReturnCondition, shippingCode } = req.body;

    const search = await Order.findOne({ 'payments.orderId': orderId });

    if (!search) return res.status(400).json('주문번호 오류');
    // 주문내역이 잘 들어왔다면 아래,
    const selectStatusOption = (data, preShippingCode, code) => {
      switch (data) {
        case '환불신청완료':
          const statusInfo1 = {
            'payments.status': 'DONE',
            isShipping: false,
            shippingCode: preShippingCode,
            isDelivered: true,
            isCancel: false,
            isReturn: false,
            isRetrieved: false,
            isRefund: true,
            isReturnSubmit: true,
          };
          return statusInfo1;
        case '상품회수 중 (환불)':
          const err = 400;
          const statusInfo2 = {
            'payments.status': 'DONE',
            isShipping: true,
            shippingCode: code,
            isDelivered: true,
            isCancel: false,
            isReturn: false,
            isRetrieved: false,
            isRefund: true,
            isReturnSubmit: true,
          };
          if (preShippingCode === code) return err;
          // 일치하지 않는다면 새로운 객체로 전달
          return statusInfo2;
        default:
          return null;
      }
    };

    if (selectStatusOption(adminSubmitReturnCondition, search.shippingCode, shippingCode) === null) {
      if (adminSubmitReturnCondition === '상품회수 완료 (환불)') {
        const shippingInfo = await oneCheckAdminRefund(orderId, search.shippingCode);
        if (shippingInfo === null) return res.status(404).json('아직 배송 중 입니다.');
        // shippingInfo가 null이 아니라면,
        res.status(200).json(shippingInfo);
      } else {
        res.status(400).json('사용자 입력오류');
      }
    } else if (selectStatusOption(adminSubmitReturnCondition, search.shippingCode, shippingCode) === 400) {
      res.status(400).json('이전 송장입니다.\n유효한 회수용 송장으로 다시 입력바랍니다.');
    } else {
      // 아니라면,
      const updateData = await Order.findOneAndUpdate(
        { 'payments.orderId': orderId },
        { $set: selectStatusOption(adminSubmitReturnCondition, search.shippingCode, shippingCode) },
        { new: true },
      );
      res.status(200).json(updateData);
    }
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json('주문번호 중복');
    }
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

// Admin 환불 신청만
const submitRefund = async (req, res) => {
  try {
    const { orderId } = req.body;

    const newValue = {
      'payments.status': 'DONE',
      isShipping: false,
      isDelivered: true,
      isCancel: false,
      isReturn: false,
      isRetrieved: false,
      isRefund: true,
      isReturnSubmit: true,
    };

    const updateData = await Order.findOneAndUpdate({ 'payments.orderId': orderId }, { $set: newValue }, { new: true });

    if (!updateData) return res.status(404).json('주문번호 없음');
    // true라면, 아래
    res.status(200).json('환불신청 완료');
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

// Admin 환불 & 교환 신청 철회
const submitRefundCancel = async (req, res) => {
  try {
    const { orderId } = req.body;

    // 주문내역 검증
    const search = await Order.findOne({ 'payments.orderId': orderId });

    if (!search) return res.status(404).json('해당 주문내역 없음');
    // ture이면 다음 진행
    // 해당 신청 이미지 지우기
    const imgPath = `./uploads/${orderId}`;
    fs.rm(imgPath, { recursive: true }, (error) => {
      if (error && error.code !== 'ENOENT') {
        console.error(error);
        res.status(500).json('내부오류');
      }
    });
    const newValue = {
      'payments.status': 'DONE',
      isShipping: false,
      shippingCode: search.shippingCode,
      isDelivered: true,
      isCancel: false,
      isReturn: false,
      isRetrieved: false,
      isRefund: false,
      isReturnSubmit: false,
      submitReturn: {
        submitAt: '',
        reason: '',
        return_message: '',
        return_img: '',
      },
    };
    const updateData = await Order.findOneAndUpdate({ 'payments.orderId': orderId }, { $set: newValue }, { new: true });

    if (!updateData) return res.status(404).json('주문번호 없음');
    // true라면, 아래
    res.status(200).json('취소 완료');
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
  clientOrderDelete,
  reqAdminShippingCondition,
  reqAdminSubmitReturnCondition,
  submitRefund,
  submitRefundCancel,
};
