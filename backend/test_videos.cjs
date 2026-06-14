const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/ontoproduct').then(async () => {
  const prods = await mongoose.connection.collection('products').find({ video: { $exists: true, $ne: '' } }).limit(5).toArray();
  console.log(JSON.stringify(prods.map(p => p.video), null, 2));
  process.exit(0);
});
