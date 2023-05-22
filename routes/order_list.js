const router = require('express').Router();
const { getMemberOrderList, orderCancelGetItem, getCancelList } = require('../controllers/order_listController');

// 모든 주문내역서 가져오기 + 토큰으로 아이디 추출
router.post('/getMemberOrderList', getMemberOrderList);

// 모든 취내역서 가오기 + 토큰으로 아이디 추출
router.post('/getCancelList', getCancelList);

// 취소할 특정 주문내역서 호출(토큰과 orderId 두 개 대조하여 확실하게 소환)
router.post('/getCancelItem', orderCancelGetItem);

module.exports = router;
