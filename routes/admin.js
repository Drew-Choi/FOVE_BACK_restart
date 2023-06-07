const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');

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
  adminadminOrderReturnCanel,
  reqAdminShippingCondition,
  submitRefund,
} = require('../controllers/order_listController');

const { tossCancelAdmin, tossCancelAdminRefund } = require('../controllers/tossController');
// const { getAllOrder } = require('../controllers/orderController');

// ------------------- multer, 이미지 저장 관련 -------------------
// 상품등록 multer
// distStorage를 사용하여 multer 스토리지 엔진을 생성
// destination 함수는 세가지 매개변수를 사용함(req: Http요청, file: 업로드 된 파일 객체, cb: 콜백함수)
// cb에 업로드 된 파일의 대상 폴더 저장
// filename 함수도 동일한 세개의 매개변수 하용
// originalname속성을 사용해 파일의 원본 이름을 저장

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';

    if (!fs.existsSync(dir)) fs.mkdirSync(dir); // dir 디렉토리 존재하는지 확인하고 없으면 생성

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const { originalname } = file;
    const destinationPath = './uploads';

    // 경로에 같은 파일 명이 있을 경우 덮어쓰기
    if (fs.existsSync(destinationPath + originalname)) {
      cb(null, file.originalname);
    } else {
      cb(null, file.originalname);
    }
  },
});
// 앞서 정의한 storage 엔진을 사용하는 multer 미들웨어 함수 upload를 생성(업로드 처리 담당)
const upload = multer({ storage });

// -----------------------------------------------------------------

// multer
// 반품리스트 사진 multer
const returnStorage = multer({
  storage: multer.diskStorage({
    destination: (request, file, cb) => {
      if (file.fieldname === 'img_return') {
        const folderName = file.originalname.split('.').shift();
        const folderNameFinal = folderName.substring(0, folderName.length - 2);
        const returnDir = `./uploads/${folderNameFinal}`;

        if (!fs.existsSync(returnDir)) {
          fs.mkdirSync(returnDir, { recursive: true });
        }
        cb(null, returnDir);
      }
    },
    filename: (request, file, cb) => {
      const filename = file.originalname;
      cb(null, filename);
    },
  }),
});

// 관리자 상품등록 페이지 /admin/register-product
router.post('/register-product', upload.array('img'), createProduct);
// upload.array('img') : multer 패키지를 사용하여 파일 업로드를 처리하는 미들웨어
// array 함수에 파일 배열이 img라는 이름으로 업로드될 것이라고 지정
// 여기서 업로드 된 파일은 createProduct 기능의 req.files 배열에서 사용 가능

// 상품 고유 코드 생성기 (중복체크 해줌)
router.get('/register-product/uniqueCheck', uniqueNumberGenerate);

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

// 전체 취소 리스트 /admin/cancel_list
router.get('/cancel_list', getAdminCancelList);

// 어드민 전체 주문리스트에서 디테일영역으로 /admin/orderlist/detail/:orderId
router.get('/orderlist/detail/:orderId', getAdminOrderListDetail);

// 어드민 주문배송상태 컨트롤 /admin/orderlist/detail/shippingCondition
router.post('/orderlist/detail/shippingCondition', reqAdminShippingCondition);

// 어드민에서 결제 취소하기 /admin/orderlist/detail/cancel
router.post('/orderlist/detail/cancel', tossCancelAdmin);

// 어드민에서 결제 취소- 환불용(반환받을 상품이 있어 따로 분리)
// 환불 신청만
router.post('/orderlist/detail/cancelRefund', submitRefund);

// 상품 회수 후 최종적으로 결제 취소
router.post('/orderlist/detail/cancelRefund/complete', tossCancelAdminRefund);

// 입금 전 주문강제취소 /admin/orderlist/detail/order_delete/:orderId
router.get('/orderlist/detail/order_delete/:orderId', adminOrderDelete);

// 반품신청 후 교환 진행 시 /admin/orderlist/detail/order_return/:orderId
router.get('/orderlist/detail/order_return/:orderId', adminOrderReturn);

// 교환 철회 버튼(관리자만 가능) /admin/orderlist/detail/order_return/cancel/:orderId
router.get('/orderlist/detail/order_return/cancel/:orderId', adminadminOrderReturnCanel);

module.exports = router;
