const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');

const nowDayTime = () => {
  const utcTimeNow = Date.now();
  // 9시간 더하기
  const kstTimeStamp = utcTimeNow + 9 * 60 * 60 * 1000;
  // 9시간 더한 밀리세컨드를 Date로 생성
  const kstData = new Date(kstTimeStamp);

  return kstData;
};

const {
  createProduct,
  getAllProducts,
  deleteProduct,
  modifyProduct,
  getReturnList,
} = require('../controllers/productController');
const { getAllOrder } = require('../controllers/orderController');

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
    cb(null, file.originalname);
  },
});
// 앞서 정의한 storage 엔진을 사용하는 multer 미들웨어 함수 upload를 생성(업로드 처리 담당)
const upload = multer({ storage });

// -----------------------------------------------------------------

// 반품리스트 사진 multer
const returnStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const id = req.body.orderId;
    console.log(id);
    const returnDir = `./uploads/${id}`;

    if (!fs.existsSync(returnDir)) {
      fs.mkdirSync(returnDir);
    }

    cb(null, returnDir);
  },
  filename: (req, file, cb) => {
    const id = req.body.orderId;
    console.log(id);
    const filename = `${id}_${file.originalname}`;
    cb(null, filename);
  },
});
const returnMulter = multer({ storage: returnStorage });

// 관리자 상품등록 페이지 /admin/register-product
router.post('/register-product', upload.array('img'), createProduct);
// upload.array('img') : multer 패키지를 사용하여 파일 업로드를 처리하는 미들웨어
// array 함수에 파일 배열이 img라는 이름으로 업로드될 것이라고 지정
// 여기서 업로드 된 파일은 createProduct 기능의 req.files 배열에서 사용 가능

// 반품신청 리스트를 얻기
router.post('/return_list', returnMulter.array('img_return'), getReturnList);

// 상품리스트 페이지 /admin/productlist
router.get('/productlist', getAllProducts); // 전체 상품 데이터 가져오기

// 상품리스트 페이지에서 상품 수정 /admin/productlist/modify/"상품고유코드"
router.post('/productlist/modify/:productId', upload.array('img'), modifyProduct);

// 상품리스트 페이지에서 상품 삭제
router.post('/productlist/delete/:productId', deleteProduct);

// 전체 주문 리스트 /admin/orderlist
// router.get('/orderlist', getOrderList);

// ------------------- 예비 코드 -------------------
// router.post(
//   '/register-product',
//   upload.fields([
//     { name: 'imgMain', maxCount: 1 },
//     { name: 'imgSub1', maxCount: 1 },
//     { name: 'imgSub2', maxCount: 1 },
//     { name: 'imgSub3', maxCount: 1 },
//     { name: 'imgSub4', maxCount: 1 },
//     { name: 'imgSub5', maxCount: 1 },
//   ]),
//   createProduct,
// );

module.exports = router;
