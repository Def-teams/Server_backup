const Clothes = require('../models/Clothes');

exports.getHome = async (req, res) => {
  try {
    // 최신 옷 20개를 가져옵니다
    const clothes = await Clothes.find()
      .sort({ createdAt: -1 })
      .limit(20);

    res.render('home', {
      user: req.session.user || null,
      clothes: clothes || []
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.render('home', {
      user: req.session.user || null,
      clothes: []
    });
  }
}; 