const router = require('express').Router();
const { tossApprove, paymentData, paymentClear } = require('../controllers/tossController');

router.get('/approve', tossApprove);

router.get('/data', paymentData);

router.get('/clear', paymentClear);

module.exports = router;
