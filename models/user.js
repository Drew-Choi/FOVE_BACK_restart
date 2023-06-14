const mongoose = require('mongoose');

const { Schema } = mongoose;

// UTC기준 시간을 한국 시간으로 바꾸기 시차 9시간
const nowDayTime = () => {
  const curTime = new Date();

  // utc기준 시간 세팅
  const utc = curTime.getTime() + curTime.getTimezoneOffset() * 60 * 1000;

  // 9시간 더하기
  const kstTimeStamp = 9 * 60 * 60 * 1000;
  // 9시간 더한 밀리세컨드를 Date로 생성
  const kstData = new Date(utc + kstTimeStamp);

  return kstData;
};

const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true }, // 아이디. 이메일 형식
    password: { type: String, require: true }, // 비밀번호
    name: { type: String, require: true }, // 이름
    phone: { type: String, require: true }, // 핸드폰 번호. 010xxxx0000 형식
    age_Range: { type: String }, // 나이범위
    gender: { type: String }, // 성별
    thumbnail_Image: { type: String }, // 카카오썸네일이미지
    profile_Image: { type: String }, // 카카오프로파일이미지
    addresses: [
      {
        destination: { type: String }, // 배송지명
        recipient: { type: String }, // 수령인 이름
        address: { type: String }, // 주소
        addressDetail: { type: String }, // 상세주소
        zipCode: { type: String }, // 우편번호
        recipientPhone: { type: String }, // 수령인 번호. 프론트에서 하나로 합칠 예정
        isDefault: { type: Boolean, default: false }, // 기본 주소 여부
      },
    ],
    points: { type: Number, default: 0 }, // 포인트
    createAt: { type: Date, default: nowDayTime() }, // 가입일
    isActive: { type: Boolean, default: true }, // 활동 상태 여부(회원/탈퇴)
    isAdmin: { type: Boolean, default: false }, // 관리자 여부
    // cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 장바구니 코드
  },
  {
    collection: 'user', // 컬렉션 이름 설정
  },
);

module.exports = mongoose.model('User', userSchema); // 밖에서는 User 로 지칭하겠다
// mongoose 이기에 쓸 수 있음. module 의 기본 함수는 아님.
