const jwt = require('jsonwebtoken');
const { default: axios } = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
require('../mongooseConnect');
const Order = require('../models/order');

const searchShipping = async (req, res) => {
  try {
    const shippingCode = 12312312312;
    const shippingInfo = await axios.get(`http://nplus.doortodoor.co.kr/web/detail.jsp?slipno=${shippingCode}`);

    if (shippingInfo.status === 200) {
      const $ = cheerio.load(shippingInfo.data);

      // 운송장 번호 확인
      const trackingNumber = $('td:contains("운송장 번호")').text().trim();

      // 배송추적상태 확인하기
      // 헤더 데이터 추출
      const table = $('table[bordercolor="#8C8C8C"]');
      const headerRow = table.find('tr[bgcolor="#D0D0D0"]');
      const dataRow = table.find('tr:not([bgcolor="#D0D0D0"])');

      // 헤더 데이터 담을 배열
      const headers = [];

      // 필요 헤더 정보 추출 하여 배열에 푸쉬
      headerRow.find('td').each((index, el) => {
        const header = $(el).text().trim();
        headers.push(header);
      });

      // 헤더 아래 자료들 추출
      const extractedData = [];

      // 추출
      dataRow.each((index, row) => {
        const columns = $(row).find('td');
        const rowData = {};
        columns.each((i, col) => {
          const value = $(col).text().trim();
          rowData[headers[i]] = value;
        });
        extractedData.push(rowData);
      });

      console.log(trackingNumber);
      res.status(200).json(`파싱데이터: ${trackingNumber}`);
    } else {
      res.status(400).json({ message: '송장번호 없음, 혹은 데이터 전송 실패' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

module.exports = { searchShipping };
