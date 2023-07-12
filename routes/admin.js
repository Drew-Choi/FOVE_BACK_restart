/* eslint-disable object-curly-newline */
const router = require('express').Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

// productControll - 물건 관련
const {
  createProduct,
  getAllProducts,
  deleteProduct,
  modifyProduct,
  submitReturnList,
  uniqueNumberGenerate,
  deleteImgProduct,
  cancelSubmitReturn,
  cancelSubmitReturnAdmin,
} = require('../controllers/productController');

// orderControll - 클라이언트 주문관련
const {
  getAdminOrderList,
  getAdminCancelList,
  getAdminOrderListDetail,
  adminOrderDelete,
  adminOrderReturn,
  reqAdminShippingCondition,
  submitRefund,
  reqAdminSubmitReturnCondition,
  submitRefundCancel,
  reqAdminChangeCondition,
  getAdminDONEList,
  getAdminRetrievedList,
  registerShippingCode,
  registerShippingCodeRetrieved,
  getAdminReturnList,
  registerShippingCodeReturn,
} = require('../controllers/order_listController');

const { tossCancelAdmin, tossCancelAdminRefund } = require('../controllers/tossController');
// const { getAllOrder } = require('../controllers/orderController');

// AWS인증 ---
const { AWS_ACCESS_ID_KEY, AWS_SECRET_KEY, AWS_REGION, AWS_BUCKET_NAME } = process.env;

const credentials = new AWS.Credentials({
  accessKeyId: AWS_ACCESS_ID_KEY,
  secretAccessKey: AWS_SECRET_KEY,
});

AWS.config.credentials = credentials;
AWS.config.region = AWS_REGION;
// --- 인증 끝

// ------------------- multer, 이미지 저장 관련 -------------------
// 상품등록 multer
// s3 버켓 설정 multer설정
const upload = multer({
  storage: multerS3({
    // s3버킷설정
    s3: new AWS.S3(),
    bucket: AWS_BUCKET_NAME,
    cacheControl: 'no-store',
    // 파일형식 설정 (자동설정으로 했음)
    contentType: multerS3.AUTO_CONTENT_TYPE,

    // 저장경로 및 파일명 설정
    key: (req, file, cb) => {
      // 저장 경로 설정
      const dir = 'uploads/';
      // 저장경로와 파일명 반환
      cb(null, dir + file.originalname);
    },
  }),
});

// -----------------------------------------------------------------

// multer
// 반품리스트 사진 multer
const returnStorage = multer({
  storage: multerS3({
    // s3버킷설정
    s3: new AWS.S3(),
    bucket: AWS_BUCKET_NAME,
    cacheControl: 'max-age=604800',
    // 파일형식 설정 (자동설정으로 했음)
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      if (file.fieldname === 'img_return') {
        // 폴더이름 생성
        const folderName = file.originalname.split('.').shift();
        const folderNameFinal = folderName.substring(0, folderName.length - 2);
        const returnDir = `uploads/${folderNameFinal}/`;

        // 경로 지정
        cb(null, returnDir + file.originalname);
      }
    },
  }),
});

// 관리자 상품등록 페이지 /admin/register-product
router.post('/register-product', upload.array('img'), createProduct);
// upload.array('img') : multer 패키지를 사용하여 파일 업로드를 처리하는 미들웨어
// array 함수에 파일 배열이 img라는 이름으로 업로드될 것이라고 지정
// 여기서 업로드 된 파일은 createProduct 기능의 req.files 배열에서 사용 가능

// 상품 고유 코드 생성기 (중복체크 해줌)
router.post('/register-product/uniqueCheck', uniqueNumberGenerate);

// 반품신청 리스트를 얻기
router.post('/return_submit', returnStorage.array('img_return'), submitReturnList);

// 반품신청 철회_Client
router.post('/return_submit/submit_cancel', cancelSubmitReturn);

// 반품신청 철회_Admin
router.post('/orderlist/detail/cancel_return_submit', cancelSubmitReturnAdmin);

// 상품리스트 페이지 /admin/productlist
router.get('/productlist', getAllProducts); // 전체 상품 데이터 가져오기

// 상품리스트 페이지에서 상품 수정 /admin/productlist/modify/"상품고유코드"
router.post('/productlist/modify/:productId', upload.array('img'), modifyProduct);

// 상품리스트 페이지에서 상품 삭제
router.post('/productlist/delete/:productId', deleteProduct);

// 수정시 이미지 개별삭제
router.post('/productlist/imgDelete', deleteImgProduct);

// 전체 주문 리스트 /admin/orderlist
router.get('/orderlist', getAdminOrderList);

// 입금완료 내역만 /admin//orderlist/shippingcode
router.get('/orderlist/shippingcode', getAdminDONEList);

// 상품회수 대기 중인 것 모음(교환 + 환불) /admin//orderlist/retrieved
router.get('/orderlist/retrieved', getAdminRetrievedList);

// 상품회수 후 교환상품 배송해야하는 목록 /admin//orderlist/return
router.get('/orderlist/return', getAdminReturnList);

// 송장등록-결제완료 /admin//orderlist/register_shippingCode
router.post('/orderlist/register_shippingCode', registerShippingCode);

// 송장등록-회수용 /admin//orderlist/register_shippingCode_retrieved
router.post('/orderlist/register_shippingCode_retrieved', registerShippingCodeRetrieved);

// 송장등록-회수용 /admin//orderlist/register_shippingCode_return
router.post('/orderlist/register_shippingCode_return', registerShippingCodeReturn);

// 전체 취소 리스트 /admin/cancel_list
router.get('/cancel_list', getAdminCancelList);

// 어드민 전체 주문리스트에서 디테일영역으로 /admin/orderlist/detail/:orderId
router.get('/orderlist/detail/:orderId', getAdminOrderListDetail);

// 어드민 주문배송상태 컨트롤 /admin/orderlist/detail/shippingCondition
router.post('/orderlist/detail/shippingCondition', reqAdminShippingCondition);

// 어드민 환불진행상태 컨트롤 /admin/orderlist/detail/submitReturn
router.post('/orderlist/detail/submitReturnCondition', reqAdminSubmitReturnCondition);

// 교환상태변경/orderlist/detail/changeCondition
router.post('/orderlist/detail/changeCondition', reqAdminChangeCondition);

// 어드민에서 결제 취소하기 /admin/orderlist/detail/cancel
router.post('/orderlist/detail/cancel', tossCancelAdmin);

// 어드민에서 결제 취소- 환불용(반환받을 상품이 있어 따로 분리)
// 환불 신청만
router.post('/orderlist/detail/cancelRefund', submitRefund);

// 환불 & 교환 신청 철회
router.post('/orderlist/detail/cancelRefund/cancel', submitRefundCancel);

// 상품 회수 후 최종적으로 결제 취소
router.post('/orderlist/detail/cancelRefund/complete', tossCancelAdminRefund);

// 입금 전 주문강제취소 /admin/orderlist/detail/order_delete/:orderId
router.get('/orderlist/detail/order_delete/:orderId', adminOrderDelete);

// 반품신청 후 교환 진행 시 /admin/orderlist/detail/order_return/:orderId
router.get('/orderlist/detail/order_return/:orderId', adminOrderReturn);

module.exports = router;
