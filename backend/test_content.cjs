const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/ontoproduct').then(async () => {
  const doc = await mongoose.connection.collection('settings').findOne({ key: 'pageContent_home_video_products' });
  console.log(JSON.stringify(doc, null, 2));
  process.exit(0);
});
