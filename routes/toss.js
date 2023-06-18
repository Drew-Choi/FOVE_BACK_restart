const router = require('express').Router();
const { tossApprove, paymentData, tossCancel } = require('../controllers/tossController');

router.get('/approve', tossApprove);

router.get('/data', paymentData);

router.post('/cancel', tossCancel);

module.exports = router;
