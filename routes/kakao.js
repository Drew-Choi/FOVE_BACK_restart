const router = require('express').Router();
const { kakaoCallBack } = require('../controllers/kakaoController');

router.get('/kakaocb', kakaoCallBack);

module.exports = router;
