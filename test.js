require('dotenv').config({ path: './config.env' });
const sendEmail = require('./utils/sendEmail');

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);


console.log("📧 Test en cours...");

sendEmail(
  'tonemail@gmail.com',
  'Test email',
  '<h1>Ça marche 🎉</h1>'
)
.then(() => console.log("✅ Email envoyé !"))
.catch(err => console.error("❌ Erreur :", err));