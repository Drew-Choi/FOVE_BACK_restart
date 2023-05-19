const router = require('express').Router();
const { tossApprove, paymentData } = require('../controllers/tossController');

router.get('/approve', tossApprove);

router.get('/data', paymentData);

module.exports = router;
