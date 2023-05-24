const router = require('express').Router();
const { searchCJ, searchHANJIN } = require('../controllers/shippingController');

router.get('/search/cj', searchCJ);

router.get('/search/hanjin', searchHANJIN);

module.exports = router;
