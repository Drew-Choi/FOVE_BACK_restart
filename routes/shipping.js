const router = require('express').Router();
const { searchShipping } = require('../controllers/shippingController');

router.get('/search', searchShipping);

module.exports = router;
