/* eslint-disable no-underscore-dangle */
/* eslint-disable object-curly-newline */
const jwt = require('jsonwebtoken');

require('../mongooseConnect');
const Cart = require('../models/cart');
const Product = require('../models/product');

// ---------------------------- 장바구니 정보 조회(전체 상품 데이터, length) ----------------------------
const getCartInfo = async (req, res) => {
  try {
    const { JWT_ACCESS_SECRET } = process.env;
    jwt.verify(req.body.token, JWT_ACCESS_SECRET, async (err, decoded) => {
      // 토큰인증 실패시
      if (err) return res.status(401).json({ message: '토큰 기한 만료' });

      // 토큰인증 성공시
      // 유저 카트 정보 불러오기
      const userCart = await Cart.findOne({ user: decoded.id });
      if (userCart.products.length !== 0) {
        // 카트에 데이터가 있다면, 사이즈 재고 검증작업시작
        // 카트 상품을 하나씩 꺼내서 검증
        // eslint-disable-next-line no-undef
        await Promise.all(
          userCart.products.map(async (el, index) => {
            // 카트에 저장된 상품의 사이즈 추출
            const cartSizeValue = el.size;
            // 만약 해당 상품의 수량이 음수라면, 이전에 솔드아웃되었던 것이니 재고가 들어왔는지 확인
            if (el.quantity < 0) {
              // 재고확인을 위해 상품데이터 불러오기
              const productStockCheck = await Product.findOne({
                productName: el.productName,
                productCode: el.productCode,
              });
              // 만약 카트의 상품에 해당하는 제품이 0이 아니라면, 재고가 들어온 것이기 때문에,
              if (productStockCheck.size[cartSizeValue] !== 0) {
                // 카트의 해당 상품의 수량을 양수로 전환하여 복원
                // 이후에 고객이 원하는 수량이 재고량 보다 적은지 체크를 위해 업데이트된 자료를 담아낸다.
                const updateCartPd = await Cart.findOneAndUpdate(
                  { user: decoded.id },
                  { $mul: { [`products.${index}.quantity`]: -1 } },
                  { new: true },
                );
                // 업데이트 된 카트 데이터와 상품 재고 정보랑 수량을 비교,
                // 카트 데이터의 수량이 상품의 해당 사이즈 재고 보다 초과하다면 문제가 되기 때문에 이 경우에만 다시 한번 수량을 업데이트 해준다.
                // 초과한다는 것은 현재 상품의 모든 재고량을 포함한다는 의미이므로, 상품의 모든 재고량을 카트에 담아준다.
                if (
                  productStockCheck.size[cartSizeValue] !== 0 &&
                  updateCartPd.products[index].quantity > productStockCheck.size[cartSizeValue]
                ) {
                  await Cart.findOneAndUpdate(
                    { user: decoded.id },
                    { $set: { [`products.${index}.quantity`]: productStockCheck.size[cartSizeValue] } },
                  );
                }
                // 만약 카트 수량이 재고수량을 초과하지 않는다면, 그냥 종료
              }
              // 만약 상품이 음수가 아니라면, 기존 재고가 있던 것이 카트에 있는 것이므로, 솔드아웃이 되었는지 체크해줘야함
            } else if (el.quantity > 0) {
              // 재고 확인을 위해 상품데이터 불러오기
              const productStockCheck2 = await Product.findOne({
                productName: el.productName,
                productCode: el.productCode,
              });
              // 0이 아니라면 그냥 종료지만, 만약 0이라면 솔드아웃되었기 때문에 카트 정보를 업데이트 해야함
              if (productStockCheck2.size[cartSizeValue] === 0) {
                // 0이면 솔드아웃된 것이므로 카트 내 해당 상품의 해당 사이즈의 수량을 음수로 바꿔준다.
                // 만약 0이 아니라면 아래 else if로 이동해서 재고를 초과하진 않는지 체크
                await Cart.findOneAndUpdate({ user: decoded.id }, { $mul: { [`products.${index}.quantity`]: -1 } });
              }
              // 재고를 초과하지 않는 지 검사, 초과하는 경우라면 다시 한번 cart업데이트
              if (
                productStockCheck2.size[cartSizeValue] !== 0 &&
                el.quantity > productStockCheck2.size[cartSizeValue]
              ) {
                // 재고를 초과했다면, 모든 재고를 포함한다는 것이므로 해당 상품의 모든 재고를 카트에 업데이트 해준다.
                await Cart.findOneAndUpdate(
                  { user: decoded.id },
                  { $set: { [`products.${index}.quantity`]: productStockCheck2.size[cartSizeValue] } },
                );
              }
              // 이건 여기서 끝,
            }
          }),
        );

        // 모든 검증이 끝나면 새롭게 업데이트 된 카트데이터 불러오기
        const updatedCart = await Cart.findOne({ user: decoded.id });
        const totalQuantity = await updatedCart.products.reduce(
          (sum, product) => sum + (product.quantity < 0 ? product.quantity - product.quantity : product.quantity),
          0,
        );
        // 상품별 quantity 모두 더하기
        res.status(200).json({ products: updatedCart.products, cartQuantity: totalQuantity });
      } else {
        res.status(404).json('장바구니가 비어있습니다.');
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('장바구니 조회 실패');
  }
};

// ---------------------------- 상품 상세페이지에서 해당상품 장바구니에 추가 ----------------------------
const addProductToCart = async (req, res) => {
  try {
    const { JWT_ACCESS_SECRET } = process.env;
    // req.boy의 상품 정보들을 구조분해 할당으로 매칭시켜 변수 저장
    const { token } = req.body;

    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 오류 및 기한 만료' });

      // 토큰 성공시
      const { productName, productCode, img, price, size, quantity, unitSumPrice } = req.body;
      // req.body로 받은 상품 정보들을 product라는 객체 형태의 변수에 저장
      const product = {
        productName,
        productCode,
        img,
        price,
        size,
        quantity,
        unitSumPrice,
      };
      const userCart = await Cart.findOne({ user: decoded.id });
      // cart가 생성되어있지 않으면 cart 생성하고 userId와 products 배열에 product 정보 넣어서 DB 저장
      if (!userCart) {
        const newCart = new Cart({
          user: decoded.id,
          products: [product],
        });
        await newCart.save();
        res.status(200).json({ message: '장바구니 담기 성공1', newCart });
        return;
      }

      // cart는 생성되어있는데 cart 안에 들어있는 상품이 없을 때
      if (userCart.products.length === 0) {
        userCart.products = [product];
        await userCart.save();
        res.status(200).json({ message: '장바구니 담기 성공2', userCart });
        return;
      }

      const sameProduct = userCart.products.find(
        (productEl) => productName === productEl.productName && size === productEl.size,
      );

      // 동일한 상품이 없으면 추가
      if (!sameProduct) {
        userCart.products.push(product);
        await userCart.save();
        res.status(200).json({ message: '장바구니 담기 성공3', userCart });
        return;
      }

      // // 장바구니에 동일한 옵션의 상품이 있을 경우 상품을 추가하지 않고 기존에 들어있는 상품의 quantity에 req.body의 quantity를 더해 증감시키기
      sameProduct.quantity += quantity;
      sameProduct.unitSumPrice = sameProduct.price * sameProduct.quantity;
      await userCart.save();
      res.status(200).json({ message: '기존 상품 수량 증가', userCart });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('장바구니 담기 실패');
  }
};

// ---------------------------- 장바구니 특정 상품 하나 삭제 ----------------------------
const removeCartItem = async (req, res) => {
  try {
    const { JWT_ACCESS_SECRET } = process.env;
    const { token, index } = req.body;

    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 오류 및 토큰 기한 만료' });

      // 토큰 인증 성공시
      const userCart = await Cart.findOne({ user: decoded.id });
      if (!userCart) {
        res.status(404).json('장바구니 없음');
        return;
      }

      const product = userCart.products[index];

      const updatedCart = await Cart.findOneAndUpdate(
        { _id: userCart._id },
        {
          $pull: {
            products: { productCode: product.productCode, productName: product.productName, size: product.size },
          },
        },
        { new: true }, // 업데이트된 내용 반환을 위해 new: true
      );
      res.status(200).json({ messege: '장바구이에서 해당 상품 삭제 성공', updatedCart });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('상품 삭제 실패');
  }
};

// ---------------------------- 장바구니 비우기 ----------------------------
const cleanCart = async (req, res) => {
  try {
    const { JWT_ACCESS_SECRET } = process.env;
    const { token } = req.body;

    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 오류 및 토큰 기한 만료' });

      // 토큰 성공시
      const userCart = await Cart.findOne({ user: decoded.id });

      if (!userCart) {
        res.status(404).json('장바구니 없음');
        return;
      }

      userCart.products = [];
      await userCart.save();
      // const updatedCart = await Cart.findOneAndUpdate({ _id: cart._id }, { $set: { products: [] } }, { new: true });

      res.status(200).json({ messege: '장바구이에서 비우기 성공', userCart });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('장바구니 비우기 실패');
  }
};

// ---------------------------- 장바구니 상품 카운팅 + 1 ----------------------------
const cartProductQtyPlus = async (req, res) => {
  try {
    const { JWT_ACCESS_SECRET } = process.env;
    const { token, index } = req.body;

    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 오류 및 토큰 기한 만료' });

      // 토큰 인증 완료시
      const userCart = await Cart.findOne({ user: decoded.id });
      if (!userCart) {
        return res.status(404).json('장바구니 없음');
      }
      // 해당상품 담음
      const product = userCart.products[index];

      if (!product) return res.status(404).json('일치하는 상품 없음');
      // 데이터가 잘 들어왔음 아래 진행
      // 초기 사이즈 추출
      const sizeValue = product.size;
      // 해당상품 재고체크위한 상품정보 불러오기
      const productInfo = await Product.findOne({ productName: product.productName, productCode: product.productCode });
      // 비교시작
      if (productInfo.size[sizeValue] > product.quantity) {
        product.quantity += 1;
        product.unitSumPrice = product.price * product.quantity;
        await userCart.save();
        res.status(200).json({ messege: '수량 증가 성공', userCart });
      } else {
        res.status(400).json('재고수량초과');
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 에러');
  }
};

// ---------------------------- 장바구니 상품 카운팅 - 1 ----------------------------
const cartProductQtyMinus = async (req, res) => {
  try {
    const { JWT_ACCESS_SECRET } = process.env;
    const { token, index } = req.body;

    jwt.verify(token, JWT_ACCESS_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: '토큰 오류 및 토큰 기한 만료' });

      // 토큰 성공시
      const userCart = await Cart.findOne({ user: decoded.id });

      if (!userCart) {
        return res.status(404).json('장바구니 없음');
      }

      const product = userCart.products[index];

      if (!product) {
        return res.status(404).json('일치하는 상품 없음');
      }

      if (product.quantity === 1) return res.send('더이상 감소시킬 수 없음'); // quantity 가 0보다 작아지지 않도록 함
      product.quantity -= 1;
      product.unitSumPrice = product.price * product.quantity;

      await userCart.save();
      res.status(200).json({ messege: '수량 감소 성공', userCart });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 에러');
  }
};

module.exports = {
  addProductToCart,
  getCartInfo,
  removeCartItem,
  cleanCart,
  cartProductQtyPlus,
  cartProductQtyMinus,
};
