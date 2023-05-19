const router = require('express').Router();
const { getMemberOrderList } = require('../controllers/order_listController');

router.post('/getMemberOrderList', getMemberOrderList);

module.exports = router;
