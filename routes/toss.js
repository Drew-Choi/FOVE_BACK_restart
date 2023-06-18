const router = require('express').Router();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

const { tossApprove, paymentData, tossCancel } = require('../controllers/tossController');

// 세션설정
const sessionMiddleware = session({
  secret: process.env.SESSION_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 200000,
    httpOnly: true,
  },
  store: new MongoStore({
    mongoUrl: process.env.MDB_URI_FOVE,
    collectionName: 'sessions',
    ttl: 200000,
  }),
});

const midlewareCookieParser = cookieParser();

router.get('/approve', sessionMiddleware, tossApprove);

router.get('/data', midlewareCookieParser, paymentData);

router.post('/cancel', tossCancel);

module.exports = router;
