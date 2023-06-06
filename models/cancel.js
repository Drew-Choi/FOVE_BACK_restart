const mongoose = require('mongoose');

// const { Schema } = mongoose;

const cancelSchema = new mongoose.Schema({
  cancels: {
    cancelAmount: { type: Number },
    canceledAt: { type: String },
    cancelReason: { type: String },
    transactionKey: { type: String },
  },
  payments: {
    orderId: { type: String, unique: true },
    orderName: { type: String },
    status: { type: String, default: 'CANCELED' },
    approvedAt: { type: String },
    method: { type: String },
    discount: { type: Number },
    totalAmount: { type: Number },
  },
  user: { type: String },
  recipient: {
    recipientName: { type: String },
    recipientZipcode: { type: String },
    recipientAddress: { type: String },
    recipientAddressDetail: { type: String },
    telAreaCode: { type: String },
    telMidNum: { type: String },
    telLastNum: { type: String },
    phoneCode: { type: String },
    phoneMidNum: { type: String },
    phoneLastNum: { type: String },
    message: { type: String, default: '' },
  },
  products: [
    {
      productName: { type: String },
      productCode: { type: String },
      img: { type: String },
      price: { type: Number },
      size: { type: String },
      color: { type: String },
      quantity: { type: Number },
      unitSumPrice: { type: Number },
    },
  ],
  isOrdered: {
    // 주문완료
    type: Boolean,
    default: false,
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
  isDelivered: {
    // 배송완료
    type: Boolean,
    default: false,
  },
  // 주문취소 또는 반품에 의한 결제취소
  isCancel: {
    type: Boolean,
    default: true,
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
  submitReturn: [
    {
      submitAt: { type: Date },
      reason: { type: String },
      return_message: { type: String },
      return_img: [{ type: String }],
    },
  ],
  paymentMethod: {
    type: String,
  },
  sumPrice: { type: Number },
});

module.exports = mongoose.model('Cancel', cancelSchema);
