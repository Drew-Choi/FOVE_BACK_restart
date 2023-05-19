const { default: axios } = require('axios');
const session = require('express-session');

// toss쿼리문 받기
const tossApprove = async (req, res) => {
  try {
    req.session.cashData = null;

    const { amount } = req.query;
    const { orderId } = req.query;
    const { paymentKey } = req.query;
    const { orderPrice } = req.query;

    if (orderPrice === amount) {
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
    const { cashData } = req.session;
    console.log(cashData);

    if (cashData) {
      req.session.destroy((err) => {
        if (err) {
          console.error('세션 초기화 중 에러 발생', err);
          res.status(500).json({ message: '세션 초기화 중 에러 발생' });
        } else {
          console.log('세션초기화완료');
        }
      });
      console.log('실제로 보내는 캐쉬데이터', cashData);
      res.status(200).json(cashData);
    } else {
      res.status(404).json({ message: '데이터오류' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

// const paymentClear = async (req, res) => {
//   cashData = null;
//   res.json({ message: '캐싱된 데이터가 초기화되었습니다.' });
// };

module.exports = { tossApprove, paymentData };
