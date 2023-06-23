const router = require('express').Router();
const { addAddress, getAddress, deleteAddress } = require('../controllers/userController');

router.post('/editAddress/', addAddress); // 주소록 등록
router.post('/getAddress', getAddress); // 주소록 데이터 가져오기
router.post('/deleteAddress', deleteAddress); // 주소록 삭제하기

module.exports = router;
