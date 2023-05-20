const { default: axios } = require('axios');

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
    // 토스 인증을 위한 키
    const { SECRET_KEY } = process.env;
    const encoder = await new TextEncoder();
    // eslint-disable-next-line prefer-template
    const utf8Array = await encoder.encode(SECRET_KEY + ':');
    const encode = await btoa(String.fromCharCode.apply(null, utf8Array));

    const orderInfo = await axios.get(`https://api.tosspayments.com/v1/payments/orders/${orderId}`, {
      headers: {
        Authorization: `Basic ${encode}`,
      },
    });

    if (orderInfo.status === 200) {
      console.log(orderInfo.data.paymentKey);
      const key = orderInfo.data.paymentKey;
      const cancelInfo = await axios.post(
        `https://api.tosspayments.com/v1/payments/${key}/cancel`,
        { cancelReason: orderInfo.data.reason },
        {
          headers: {
            Authorization: `Basic ${encode}`,
            'Content-Type': 'application/json',
          },
        },
      );
      // eslint-disable-next-line no-unused-expressions
      cancelInfo.status === 200
        ? res.status(200).json(cancelInfo.data)
        : res.status(401).json({ message: '결체취소 미인증' });
    } else {
      res.status(401).json({ message: '아이디 조회 실패' });
    }
  } catch (err) {
    console.error(err).json({ message: '알 수 없는 오류' });
  }
};

module.exports = { tossApprove, paymentData, tossCancel };
