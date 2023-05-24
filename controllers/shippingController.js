const jwt = require('jsonwebtoken');
const { default: axios } = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
require('../mongooseConnect');
const Order = require('../models/order');

const changeTimetoNum = (time) => {
  const utcTime = new Date(time);
  // 한국 시차 9시간 더하기
  const koreanTime = utcTime.setHours(utcTime.getHours() + 9);

  return koreanTime;
};

const { JWT_ACCESS_SECRET } = process.env;

const searchCJ = async (req, res) => {
  try {
    // 영호가 빌려준 송장
    // const shippingCode = 656276279413;
    // 임의 송장
    const shippingCode = 123456789112;
    const shippingInfo = await axios.get(`http://nplus.doortodoor.co.kr/web/detail.jsp?slipno=${shippingCode}`, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'text/html; charset=euc-kr',
      },
    });

    if (shippingInfo.status === 200) {
      const decodedData = iconv.decode(shippingInfo.data, 'euc-kr');
      const $ = cheerio.load(decodedData, { decodeEntities: false });

      // 운송장 번호 확인
      const trackingNumber = $('td:contains("운송장 번호")').text().trim();

      // 배송추적상태 확인하기----
      // 구체적인 추적 정보 데이터 담는 곳
      const coreInfoArr = [];

      // 중요 테이블 선택자
      const table = $('table[bordercolor="#8C8C8C"]');

      // 추적정보 열 찾기
      const coreInfo = table.find('tr[height="22"][bgcolor="#F6F6F6"]');

      // 테이블에서 추적 정보 td추출
      coreInfo.find('td').each((index, el) => {
        const core = $(el).text().trim();
        coreInfoArr.push(core);
      });
      // -----------------------
      console.log(coreInfoArr);

      // 집화처리 체크
      const arrCheck = (arr) => {
        const findData = arr.find((data) => data === '집화처리');
        const result = findData === '집화처리';
        return result;
      };

      // 배달완료 체크
      const completeCheck = (arr) => {
        const findData = arr.find((data) => data === '배달완료');
        const result = findData === '배달완료';
        return result;
      };

      if (trackingNumber.includes('미등록운송장') || !arrCheck(coreInfoArr)) {
        const isShippingFalse = { isShipping: false };
        return res.status(200).json(isShippingFalse);
      }

      if (!trackingNumber.includes('미등록운송장') && arrCheck(coreInfoArr)) {
        const isShippingTrue = { isShipping: true };
        return res.status(200).json(isShippingTrue);
      }

      if (!trackingNumber.includes('미등록운송장') && completeCheck(coreInfoArr)) {
        const isDeliveredTrue = { isDelivered: true };
        return res.status(200).json(isDeliveredTrue);
      }
    } else {
      res.status(400).json({ message: '데이터 전송 실패' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

// ---------------------------------------

const searchHANJIN = async (req, res) => {
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

      console.log(getOrderedListArr);

      if (!getOrderedListArr) {
        res.status(404).json({ message: '주문데이터를 db에서 찾을 수 없음' });
      } else {
        await getOrderedListArr.map(async (el) => {
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
            if (!trackingNumber.includes('배송완료')) return console.log('안돼!!!!!!!');

            // trackingNumber.includes('배송완료')가 true이면 아래 작업 진행
            console.log('여기로 하나 진행되야함');
            await Order.findOneAndUpdate(
              { user: decoded.id, 'payments.orderId': el.payments.orderId, shippingCode: el.shippingCode },
              { isShipping: false, isDelivered: true },
            );
          }
        });
        const getAllOrderInfo = await Order.find({ user: decoded.id });
        // 날짜순으로 확실히 정렬 내림차순
        const array = getAllOrderInfo.sort(
          (a, b) => changeTimetoNum(b.payments.approvedAt) - changeTimetoNum(a.payments.approvedAt),
        );
        res.status(200).json(array);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

module.exports = { searchCJ, searchHANJIN };
