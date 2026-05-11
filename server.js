const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const mongoose = require('mongoose');

// 🔥 DB
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// 🔥 rendre disponible pour MongoStore
process.env.DB = DB;

// 🔥 connexion DB
mongoose.connect(DB)
  .then(() => console.log('Connexion DB réussie ✅'))
  .catch(err => console.log(err));

// 🔥 imports après config
const Product = require('./models/Product');
const app = require('./app');

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});