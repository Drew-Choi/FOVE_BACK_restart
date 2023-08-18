const router = require('express').Router();
const {
  getAllProducts,
  getNewProducts,
  getProductsByCategory,
  getProductDetail,
  searchProduct,
} = require('../controllers/productController');

const { addOrder } = require('../controllers/orderController');

// 'store' 페이지 /store
router.get('/', getAllProducts); // 전체 상품 데이터 가져오기

// 전체상품 보기 /store/all
router.get('/all', getAllProducts); //  전체 상품 데이터 가져오기

// 카테고리별 상품 보기 /store/"카테고리명"
router.get('/:category', getProductsByCategory); // 카테고리에 따른 상품 데이터 가져오기

// 특정상품 상세페이지 /store/productId/"유저아이디"
router.get('/productId/:productCode', getProductDetail); // 특정 상품 데이터 가져오기

// 상품 검색 /store/search
router.post('/search', searchProduct);

// 상품 주문
router.post('/order', addOrder);

module.exports = router;
