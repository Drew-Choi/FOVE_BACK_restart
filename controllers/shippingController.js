// const jwt = require('jsonwebtoken');
const { default: axios } = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
require('../mongooseConnect');
// const Order = require('../models/order');

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
    const shippingCode = 123456789123;
    // 테스트 송장번호(완료된거)
    // const shippingCode = 453005591010;
    const shippingInfo = await axios.get(
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
      console.log(trackingNumber);

      if (trackingNumber.includes('운송장이 등록되지 않았거나')) {
        const isShippingFalse = { isShipping: false };
        console.log(trackingNumber);
        return res.status(200).json(isShippingFalse);
      }

      if (trackingNumber.includes('상품접수')) {
        const isShippingTrue = { isShipping: true };
        return res.status(200).json(isShippingTrue);
      }

      if (trackingNumber.includes('배송완료')) {
        const isisDeliveredTrue = { isDelivered: true };
        return res.status(200).json(isisDeliveredTrue);
      }
    } else {
      res.status(400).json({ message: '데이터 전송 실패' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

module.exports = { searchCJ, searchHANJIN };
