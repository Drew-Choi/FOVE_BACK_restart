const router = require('express').Router();

const {
  addProductToCart,
  getCartInfo,
  removeCartItem,
  cleanCart,
  cartProductQtyPlus,
  cartProductQtyMinus,
} = require('../controllers/cartController');

// 장바구니 정보 불러오기 /cart/list + body.token
router.post('/list', getCartInfo); // 장바구니 정보 불러오기(장바구니 전체 데이터, 장바구니 products length)

// 장바구니에 상품 추가 /cart/add + body.token
router.post('/add', addProductToCart);

// 장바구니 상품 하나 삭제 /cart/remove/"상품고유코드" + body.token
router.post('/remove', removeCartItem);

// 장바구니 비우기 /cart/clean + body.token
router.post('/clean', cleanCart);

// 장바구니 상품 수량 증가 + 1 /cart/qtyplus/"상품고유코드" + body.token
router.post('/qtyplus', cartProductQtyPlus);

// 장바구니 상품 수량 감소 - 1 /cart/qtyminus/"상품고유코드" + body.token
router.post('/qtyminus', cartProductQtyMinus);

module.exports = router;
