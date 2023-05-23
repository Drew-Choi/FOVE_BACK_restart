// const jwt = require('jsonwebtoken');
const { default: axios } = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
require('../mongooseConnect');
// const Order = require('../models/order');

const searchShipping = async (req, res) => {
  try {
    const shippingCode = 12312312312;
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

      // 중요 테이블 선택자
      const table = $('table[bordercolor="#8C8C8C"]');

      // 배송추적상태 확인하기----
      // 구체적인 추적 정보 데이터 담는 곳
      const coreInfoArr = [];

      // 추적정보 열 찾기
      const coreInfo = table.find(
        // eslint-disable-next-line max-len
        'tr:not([class]):not([id]):not([style]):not([colspan]):not([bgcolor]):not([border]):not([bordercolor]):not([bordercolordark]):not([cellpadding]):not([cellspacing])[height="22"]',
      );

      // 테이블에서 추적 정보 td추출
      coreInfo.find('td').each((index, el) => {
        const core = $(el).text().trim();
        coreInfoArr.push(core);
      });
      // -----------------------

      // 집화처리 체크
      const arrCheck = (arr) => {
        const findData = arr.find((data) => data === '집화처리');
        const result = findData === '집화처리';
        return result;
      };

      if (trackingNumber.includes('미등록운송장') || !arrCheck(coreInfoArr)) {
        const isShippingFalse = { isShipping: false };
        console.log(coreInfoArr);
        res.status(200).json(isShippingFalse);
      } else if (!trackingNumber.includes('미등록운송장') && arrCheck(coreInfoArr)) {
        const isShippingTrue = { isShipping: true };
        res.status(200).json(isShippingTrue);
      }
    } else {
      res.status(400).json({ message: '데이터 전송 실패' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

module.exports = { searchShipping };
