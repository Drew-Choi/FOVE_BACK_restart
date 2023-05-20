const router = require('express').Router();
const { tossApprove, paymentData, tossCancel } = require('../controllers/tossController');

router.get('/approve', tossApprove);

router.get('/data', paymentData);

router.post('/cancle', tossCancel);

module.exports = router;
