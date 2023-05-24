const router = require('express').Router();
const { searchCJ, searchHANJIN } = require('../controllers/shippingController');

router.post('/search/cj', searchCJ);

router.post('/search/hanjin', searchHANJIN);

module.exports = router;
