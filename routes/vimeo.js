const router = require('express').Router();
const { getIntroMovieVimeo } = require('../controllers/vimeoController');

router.get('/getIntro', getIntroMovieVimeo);

module.exports = router;
