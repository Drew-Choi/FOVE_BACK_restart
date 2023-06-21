/* eslint-disable object-curly-newline */
const { default: axios } = require('axios');

const getIntroMovieVimeo = async (req, res) => {
  const { VIMEO_ACCESS_KEY } = process.env;
  const { VIMEO_VIDEO_ID } = process.env;

  try {
    const response = await axios.get(
      `https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/${VIMEO_VIDEO_ID}
      &width=1680
      &autoplay=true
      &controls=false
      &muted=true
      &loop=true
      &playsinline=true
      &quality=auto
      &byline=false
      &api=false
      &speed=false
      &title=false`,
      {
        headers: {
          Authorization: `Bearer ${VIMEO_ACCESS_KEY}`,
        },
      },
    );

    if (response.status === 200) return res.status(200).json(response.data.html);
    return res.status(400).json('잘못된 요청');
  } catch (err) {
    console.error(err);
    res.status(500).json('알 수 없는 오류');
  }
};

module.exports = { getIntroMovieVimeo };
