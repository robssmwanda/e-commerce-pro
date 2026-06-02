const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const mongoose = require('mongoose');

// 1. Assurez-vous que l'import est exact (pas d'accolades)
const Product = require('./models/Product'); 

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

const importData = async () => {
  try {
    await mongoose.connect(DB);
    console.log('Connexion DB réussie ✅');

    // 2. L'appel doit obligatoirement être préfixé par le modèle "Product"
    await Product.deleteMany({}); 

    // 🔥 Import multiple
    await Product.create([
      {
        name: "iPhone 17 pro",
        order: 1,
        tagline: "Puissance. Élégance.",
        price: 899,
        stock: 50,
        imgUrl: "/img/iPhone_2/iphone_17pro__.jpg",
        imgBuyUrl: "/img/buy/iphone-17-pro-finish-select-cosmicorange-202509_AV2.jpeg" ,
        category: "iphone",
        storage: "128GB",
        color: "blue"
      },
      {
        name: "iPhone 17 Air",
        order: 2,
        tagline: "Design réinventé",
        price: 1329,
        stock: 30,
        imgUrl: "/img/iPhone_2/iphone_air__b5qmgl05ojyq_large_2x.jpg",
        imgBuyUrl: "/img/buy/iphone-air-finish-select-skyblue-202509_AV2.jpeg",
        category: "iphone",
        storage: "256GB",
        color: "gold"
      },
      {
        name: "iPhone 17 ",
        order: 3,
        tagline: "Le plus puissant",
        price: 1499,
        stock: 25,
        imgUrl: "/img/iPhone_2/iphone_17__fb1277oq3eaa_large_2x.jpg",
        imgBuyUrl: "/img/buy/iphone-17-finish-select-lavender-202509_AV2.jpeg",
        category: "iphone",
        storage: "512GB",
        color: "black"
      },
      {
        name: "iPhone 17e ",
        order: 4,
        tagline: "Le plus puissant",
        price: 1499,
        stock: 40,
        imgUrl: "/img/iPhone_2/iphone_17e__cq5ygzct314y_large_2x.jpg",
        imgBuyUrl: "/img/buy/iphone-17e-finish-select-softpink-202603_AV2.jpeg",
        category: "iphone",
        storage: "512GB",
        color: "black"
      },
      {
        name: "iPhone 16 ",
        order: 5,
        tagline: "Le plus puissant",
        price: 1499,
        stock: 15,
        imgUrl: "/img/iPhone_2/iphone_16__b6tkv86m2gc2_large_2x.jpg",
        imgBuyUrl: "/img/buy/iphone-16-ultramarine-select-202409_AV2.jpeg",
        category: "iphone",
        storage: "512GB",
        color: "black"
      }
    ]);

    console.log('Produits importés avec succès 🚀');
    process.exit();

  } catch (err) {
    console.error('Erreur ❌', err);
    process.exit(1);
  }
};

// 3. Assurez-vous d'appeler la fonction globale ici, et non deleteMany() tout seul
importData();
