/* eslint-disable object-curly-newline */
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

require('../mongooseConnect');
const Product = require('../models/product');
const Order = require('../models/order');

// UTC기준 시간을 한국 시간으로 바꾸기 시차 9시간
const nowDayTime = () => {
  const utcTimeNow = Date.now();
  // 9시간 더하기
  const kstTimeStamp = utcTimeNow + 9 * 60 * 60 * 1000;
  // 9시간 더한 밀리세컨드를 Date로 생성
  const kstData = new Date(kstTimeStamp);

  return kstData;
};

const { JWT_ACCESS_SECRET } = process.env;

// 상품 등록
const createProduct = async (req, res) => {
  try {
    const { productCode, productName, price, category, size, detail, createAt } = JSON.parse(req.body.data);
    // req.body의 data 필드를 JSON으로 구문 분석하고 결과 객체를 분해하여 변수명과 일치하는 key 값의 값들을 각 변수들에 저장
    // 프론트에서 data라는 이름으로 JSON 형태로 보내기 때문에 req.body.data로 받아서 JSON.parse() 함수를 이용해 객체형태로 parsing
    const img = req.files.map((el) => el.originalname);
    // // req.files 배열의 요소들을 각 파일의 원본명으로 매핑하여 'img' 라는 이름의 새 배열에 저장

    const finder = await Product.find({ productName });

    if (finder.length !== 0)
      // 상품 중복시
      return res.status(400).json('해당 상품명이 존재합니다.');

    // 중복값이 없다면,
    const newProduct = new Product({
      productCode,
      productName,
      price,
      category,
      size,
      img,
      detail,
      createAt,
    });

    await newProduct.save();
    res.status(200).json('상품 등록 성공!');
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json('상품 등록 셀패(서버 에러)');
  }
  // 요청 본문에서 추출한 데이터와 파일 배열을 담은 변수들로 새로운 Product 인스턴스를 만들고 newProduct에 저장
};

// 전체 상품 불러오기
const getAllProducts = async (req, res) => {
  try {
    const product = await Product.find({});

    const arr = product.sort((a, b) => b.createAt - a.createAt);
    res.status(200).json(arr);
  } catch (err) {
    console.error(err);
    res.status(500).send('상품 불러오기 실패(서버 에러)');
  }
};

// 해당 카테고리 불러오기
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params; // params로 들어온 category 이름을 구조분해할당으로 매칭시켜 변수 저장
    const categories = ['beanie', 'cap', 'training', 'windbreaker', 'new'];

    if (!categories.includes(category)) {
      // params로 들어온 category가 위 categories 배열에 없을 때
      return res.status(400).send('유효하지 않은 카테고리 입니다.');
    }
    // 카테고리가 정상적으로 들어오면 아래 진행

    if (category === 'new') {
      const twelveHoursAgo = new Date(Date.now() - 24 * 7 * 60 * 60 * 1000); // 12시간 내
      const products = await Product.find({ createAt: { $gte: twelveHoursAgo } }); // gte: '크거나 같음' 연산자
      const arr = products.sort((a, b) => b.createAt - a.createAt);
      res.status(200).json(arr);
    } else {
      const products = await Product.find({ category: category.toUpperCase() }); // DB에서 해당 category 의 상품들만 조회해서 products 배열에 담기
      const arr = products.sort((a, b) => b.createAt - a.createAt);
      res.status(200).json(arr); // 상태코드 200과 products 배열을 json 응답
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('조회 실패(서버 에러)');
  }
};

// 특정 상품 조회하기
const getProductDetail = async (req, res) => {
  try {
    const { productCode } = req.params; // params로 들어온 productId 값을 구조분해할당으로 매칭시켜 변수 저장
    const product = await Product.find({ productCode });

    if (product.length === 0) {
      return res.status(404).send('해당 상품이 존재하지 않습니다.');
    }
    res.status(200).json(product); // 상태코드 200과 product를 json 응답
  } catch (err) {
    console.error(err);
    res.status(500).send('조회 실패(서버 에러)');
  }
};

// 관리자페이지 상품리스트에서 상품 수정하기
const modifyProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { productName, price, size, detail, category } = JSON.parse(req.body.data);
    const img = req.files.map((el) => el.originalname);

    const imgFileNameSplit = (arr) => {
      // eslint-disable-next-line prefer-const
      let indexArr = [];
      for (let i = 0; i < arr.length; i += 1) {
        const split1 = arr[i].split('_').pop();
        const split2 = split1.split('.').shift();
        indexArr.push(Number(split2));
      }
      return indexArr;
    };

    const imgIndex = imgFileNameSplit(img);

    const arange = (data, num) => {
      const imgFields = num.map((el, index) => ({ [`img.${el - 1}`]: data[index] }));
      return Object.assign({}, ...imgFields);
    };

    const product = {
      productName,
      category,
      price,
      size: {
        OS: size.OS || 0,
        S: size.S || 0,
        M: size.M || 0,
        L: size.L || 0,
      },
      ...arange(img, imgIndex),
      detail,
      createAt: nowDayTime(),
    };

    await Product.findOneAndUpdate({ productCode: productId }, { $set: product }, { new: true });

    res.status(200).json({ message: '상품 수정 성공!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '상품 수정 실패(서버 에러)' });
  }
};

// 관리자페이지 상품리스트에서 상품 삭제하기
const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const deletedProduct = await Product.findOneAndDelete({ productCode: productId });

    if (!deletedProduct) {
      return res.status(404).json('해당 상품이 존재하지 않습니다.');
    }
    // AWS인증 ---
    const { AWS_ACCESS_ID_KEY, AWS_SECRET_KEY, AWS_REGION, AWS_BUCKET_NAME } = process.env;

    const credentials = new AWS.Credentials({
      accessKeyId: AWS_ACCESS_ID_KEY,
      secretAccessKey: AWS_SECRET_KEY,
    });

    AWS.config.credentials = credentials;
    AWS.config.region = AWS_REGION;
    // --- 인증 끝

    // s3열어주고,
    const s3 = new AWS.S3();

    const deleteObj = async () => {
      const deleteItem = deletedProduct.img.map((el) => {
        const params = {
          Bucket: AWS_BUCKET_NAME,
          Key: `uploads/${el}`,
        };
        return s3.deleteObject(params).promise();
      });
      // eslint-disable-next-line no-undef
      await Promise.all(deleteItem);
    };

    await deleteObj();

    res.status(200).json('상품 삭제 완료');
  } catch (err) {
    console.error(err);
    res.status(500).send('조회 실패(서버 에러)');
  }
};

// 개별이미지 삭제
const deleteImgProduct = async (req, res) => {
  try {
    const { productCode, imgURL } = req.body;

    const deleteImg = await Product.findOneAndUpdate({ productCode }, { $pull: { img: imgURL } }, { new: true });

    if (deleteImg) {
      // 이미지 원본 삭제
      // AWS인증 ---
      const { AWS_ACCESS_ID_KEY, AWS_SECRET_KEY, AWS_REGION, AWS_BUCKET_NAME } = process.env;

      const credentials = new AWS.Credentials({
        accessKeyId: AWS_ACCESS_ID_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      });

      AWS.config.credentials = credentials;
      AWS.config.region = AWS_REGION;
      // --- 인증 끝

      // s3열어주고,
      const s3 = new AWS.S3();

      // 버킷 및 파일경로
      const params = {
        Bucket: AWS_BUCKET_NAME,
        Key: `uploads/${imgURL}`,
      };

      await s3.deleteObject(params).promise();

      return res.status(200).json('이미지 삭제완료');
    }
    return res.status(400).json('해당 이미지를 찾을 수 없습니다.');
  } catch (err) {
    console.error(err);
    return res.status(500).json('알 수 없는 오류');
  }
};

// 스토어 페이지에서 상품 검색 기능
const searchProduct = async (req, res) => {
  try {
    const { searchText } = req.body;

    // 검색어가 없을 때 (이건 프론트에서 검색어 입력 안하면 form데이터 전송 안되게 처리해도 됨)
    if (!searchText || searchText.trim() === '') {
      return res.status(400).json('검색어를 입력해주세요.');
    }

    const searchCondition = {
      $or: [
        { productCode: { $regex: searchText, $options: 'i' } },
        { productName: { $regex: searchText, $options: 'i' } },
      ],
      // **** 참고 ****
      // $regex -> 특정 패턴이 포함된 문자열 검색(정규식)
      // $option -> 검색 동장에 대한 설정
      //    i (ignore case): 대소문자를 무시하여 검색
      //    m (multiline): 다중 행 검색
      //    s (dotall): 개행 문자를 포함한 모든 문자를 대상으로 검색
      //    x (extended): 정규식 내의 공백을 무시
      // $or -> 두 가지 이상의 조건 중 하나라도 일치하는 경우 반환
    };

    // 검색 결과 DB에서 가져오기
    const searchedProduct = await Product.find(searchCondition);

    if (searchedProduct.length === 0) {
      return res.status(404).json('검색된 상품이 없습니다.');
    }

    res.status(200).json({ message: '검색된 상품 반환', searchedProduct });
  } catch (err) {
    console.error(err);
    res.status(500).json('검색 실패(서버 오류)');
  }
};

// 반품 신청서 저장
const submitReturnList = async (req, res) => {
  try {
    // post로 프론트엔드에서 들어오는 데이터 구조분해할당
    const { token, orderId, message, reason } = JSON.parse(req.body.data);

    // post로 프론트엔드에서 들어오는 이미지 file들의 이름 저장 (배열)
    const returnImg = req.files.map((el) => el.originalname);

    // 토큰으로 아이디 검증
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 인증 오류' });

      // 토큰 인증 성공
      // 해당 주문내역서 검증
      const orderInfo = await Order.findOne({ user: decoded.id, 'payments.orderId': orderId });

      // 해당 주문내역가 있으면 아래 작업 진행
      if (orderInfo) {
        // 주문내역서에 새롭게 추가될 내용 정리

        // 해당 주문내역서 데이터 업데이트 및 반품신청서 제출 사항 추가
        const updateOrderInfo = await Order.findOneAndUpdate(
          { user: decoded.id, 'payments.orderId': orderId },
          {
            $set: {
              'payments.status': 'DONE',
              isShipping: false,
              shippingCode: orderInfo.shippingCode,
              isDelivered: true,
              isCancel: false,
              isReturn: false,
              isRetrieved: false,
              isRefund: false,
              isReturnSubmit: true,
              submitReturn: {
                submitAt: nowDayTime(),
                reason,
                return_message: message,
                return_img: returnImg,
              },
            },
          },
          { new: true },
        );
        res.status(200).json(updateOrderInfo);
      } else {
        res.status(400).json({ message: '주문내역서가 없음, 주분번호체크 요망' });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

// 반품신청 철회_클라이언트
const cancelSubmitReturn = async (req, res) => {
  try {
    // post로 프론트엔드에서 들어오는 데이터 구조분해할당
    const { token, orderId } = req.body;

    // 토큰으로 아이디 검증
    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 인증 오류' });

      // 토큰 인증 성공
      // 해당 주문내역서 검증
      const orderInfo = await Order.findOne({ user: decoded.id, 'payments.orderId': orderId });

      // 해당 주문내역가 있으면 아래 작업 진행
      if (orderInfo) {
        // 해당 신청 이미지 지우기
        // AWS인증 ---
        const { AWS_ACCESS_ID_KEY, AWS_SECRET_KEY, AWS_REGION, AWS_BUCKET_NAME } = process.env;

        const credentials = new AWS.Credentials({
          accessKeyId: AWS_ACCESS_ID_KEY,
          secretAccessKey: AWS_SECRET_KEY,
        });

        AWS.config.credentials = credentials;
        AWS.config.region = AWS_REGION;
        // --- 인증 끝

        // s3열어주고,
        const s3 = new AWS.S3();
        // 삭제할 폴더 경로
        const folderName = `uploads/${orderId}`;

        // s3용 매서드 사용
        // s3는 폴더 개념이 아닌 객체 개념이라 폴더 내부 파일들을 먼저 삭제해 줘야 하므로,
        // 해당 폴더 내부의 객체들을 불러와 리스트업시킨다.
        const objects = await s3.listObjects({ Bucket: AWS_BUCKET_NAME, Prefix: folderName }).promise();

        // 폴더 내부의 모든 객체를 순회하면서 삭제
        await s3
          .deleteObjects({
            Bucket: AWS_BUCKET_NAME,
            Delete: { Objects: objects.Contents.map((el) => ({ Key: el.Key })) },
          })
          .promise();

        // 폴더 삭제
        await s3.deleteObject({ Bucket: AWS_BUCKET_NAME, Key: folderName }).promise();

        // 주문내역서에 새롭게 추가될 내용 정리
        // 해당 주문내역서 데이터 업데이트 및 반품신청서 캔슬로 수정
        const updateOrderInfo = await Order.findOneAndUpdate(
          { user: decoded.id, 'payments.orderId': orderId },
          {
            $set: {
              isDelivered: true,
              isShipping: false,
              shippingCode: orderInfo.shippingCode,
              isReturnSubmit: false,
              submitReturn: {
                submitAt: '',
                reason: '',
                return_message: '',
                return_img: '',
              },
            },
          },
          { new: true },
        );
        res.status(200).json(updateOrderInfo);
      } else {
        res.status(400).json({ message: '주문내역서가 없음, 주분번호체크 요망' });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

// 반품신청 철회_어드민
const cancelSubmitReturnAdmin = async (req, res) => {
  try {
    // post로 프론트엔드에서 들어오는 데이터 구조분해할당
    const { orderId } = req.body;

    // 해당 주문내역서 검증
    const orderInfo = await Order.findOne({ 'payments.orderId': orderId });

    // 해당 주문내역가 있으면 아래 작업 진행
    if (orderInfo) {
      // 해당 신청 이미지 지우기
      // AWS인증 ---
      const { AWS_ACCESS_ID_KEY, AWS_SECRET_KEY, AWS_REGION, AWS_BUCKET_NAME } = process.env;

      const credentials = new AWS.Credentials({
        accessKeyId: AWS_ACCESS_ID_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      });

      AWS.config.credentials = credentials;
      AWS.config.region = AWS_REGION;
      // --- 인증 끝

      // s3열어주고,
      const s3 = new AWS.S3();
      // 삭제할 폴더 경로
      const folderName = `uploads/${orderId}`;

      // s3용 매서드 사용
      // s3는 폴더 개념이 아닌 객체 개념이라 폴더 내부 파일들을 먼저 삭제해 줘야 하므로,
      // 해당 폴더 내부의 객체들을 불러와 리스트업시킨다.
      const objects = await s3.listObjects({ Bucket: AWS_BUCKET_NAME, Prefix: folderName }).promise();

      // 폴더 내부의 모든 객체를 순회하면서 삭제
      await s3
        .deleteObjects({
          Bucket: AWS_BUCKET_NAME,
          Delete: { Objects: objects.Contents.map((el) => ({ Key: el.Key })) },
        })
        .promise();

      // 폴더 삭제
      await s3.deleteObject({ Bucket: AWS_BUCKET_NAME, Key: folderName }).promise();

      // 주문내역서에 새롭게 추가될 내용 정리
      // 해당 주문내역서 데이터 업데이트 및 반품신청서 캔슬로 수정
      const updateOrderInfo = await Order.findOneAndUpdate(
        { 'payments.orderId': orderId },
        {
          $set: {
            isShipping: false,
            shippingCode: orderInfo.shippingCode,
            isDelivered: true,
            isReturnSubmit: false,
            submitReturn: {
              submitAt: '',
              reason: '',
              return_message: '',
              return_img: [],
            },
          },
        },
        { new: true },
      );
      res.status(200).json(updateOrderInfo);
    } else {
      res.status(400).json({ message: '주문내역서가 없음, 주분번호체크 요망' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

// 상품 고유번호 생성하여 DB중복여부 확인 후 프론트로 보내주는 미들웨어
const uniqueNumberGenerate = async (req, res) => {
  try {
    const { headCode } = req.body;

    // 유니크 상품 코드 생성
    const generateUniqueNum = (youWantLength) => {
      const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomId = '';

      for (let i = 0; i < youWantLength; i += 1) {
        const randomIndex = Math.floor(Math.random() * base.length);
        randomId += base[randomIndex];
      }
      return randomId;
    };

    // 유니코드 체크
    const uniqueCheckING = async () => {
      let uniqueNumber = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        uniqueNumber = headCode + generateUniqueNum(5);
        // eslint-disable-next-line no-await-in-loop
        const finder = await Product.find({ productCode: uniqueNumber });

        if (finder.length === 0) {
          break;
        }
      }
      return uniqueNumber;
    };

    // 유니코드 체크한거 담기
    const checkCompleteNumber = await uniqueCheckING();

    if (checkCompleteNumber) {
      res.status(200).json({ uniqueNumber: checkCompleteNumber });
    } else {
      res.status(500).json({ message: '알 수 없는 오류. 고유코드 생성실패' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '알 수 없는 오류' });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductsByCategory,
  getProductDetail,
  deleteProduct,
  modifyProduct,
  searchProduct,
  submitReturnList,
  uniqueNumberGenerate,
  deleteImgProduct,
  cancelSubmitReturn,
  cancelSubmitReturnAdmin,
};
