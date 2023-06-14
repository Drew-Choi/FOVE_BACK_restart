const mongoose = require('mongoose');

// const { Schema } = mongoose;

const orderSchema = new mongoose.Schema({
  user: { type: String, required: true },
  payments: {
    orderId: { type: String, unique: true, required: true },
    orderName: { type: String, required: true },
    status: { type: String, required: true },
    approvedAt: { type: String, required: true },
    method: { type: String, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
  },
  recipient: {
    recipientName: { type: String, required: true },
    recipientZipcode: { type: String, required: true },
    recipientAddress: { type: String, required: true },
    recipientAddressDetail: { type: String, required: true },
    phoneCode: { type: String, required: true },
    phoneMidNum: { type: String, required: true },
    phoneLastNum: { type: String, required: true },
    message: { type: String, default: '' },
  },
  products: [
    {
      productName: { type: String, required: true },
      productCode: { type: String, required: true },
      img: { type: String, required: true },
      price: { type: Number, required: true },
      size: { type: String, required: true },
      color: { type: String },
      quantity: { type: Number, required: true },
      unitSumPrice: { type: Number, required: true },
    },
  ],
  isOrdered: {
    // 주문완료
    type: Boolean,
    default: true,
  },
  isShipping: {
    // 배송중
    type: Boolean,
    default: false,
  },
  shippingCode: {
    // 송장번호
    type: Number,
    default: 0,
  },
  shippingAt: {
    type: Date,
  },
  isDelivered: {
    // 배송완료
    type: Boolean,
    default: false,
  },
  // 주문취소 또는 반품에 의한 결제취소
  isCancel: {
    type: Boolean,
    default: false,
  },
  // 반품-교환상태
  isReturn: {
    type: Boolean,
    default: false,
  },
  isRetrieved: {
    type: Boolean,
    default: false,
  },
  isRefund: {
    type: Boolean,
    default: false,
  },
  isReturnSubmit: { type: Boolean, default: false },
  submitReturn: {
    submitAt: { type: Date },
    reason: { type: String },
    return_message: { type: String },
    return_img: [{ type: String }],
  },

  paymentMethod: {
    type: String,
  },
  sumPrice: { type: Number },
});

module.exports = mongoose.model('Order', orderSchema);
