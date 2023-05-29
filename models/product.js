const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  productCode: { type: String, unique: true, required: true }, // 상품관리코드
  productName: { type: String, unique: true, required: true }, // 상품명
  price: { type: Number, required: true }, // 가격
  category: { type: String, required: true }, // 카테고리
  size: {
    OS: { type: Number, default: 0 },
    S: { type: Number, default: 0 },
    M: { type: Number, default: 0 },
    L: { type: Number, default: 0 },
  }, // 사이즈별 재고량
  img: [{ type: String, unique: true, required: true }], // 상품이미지(배열의 0번째: 대표이미지, 1번부터 서브이미지)
  detail: { type: String, default: '' }, // 상세설명
  createAt: { type: Date, required: true }, // 상품등록날짜
});

module.exports = mongoose.model('Product', ProductSchema);
