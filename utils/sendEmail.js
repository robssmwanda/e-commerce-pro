const { Resend } = require('resend');

// Initialisation via la clé API de vos variables d'environnement sur Render
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // Adresse de test gratuite de Resend
      to: to,
      subject: subject,
      html: htmlContent,
    });
    
    console.log("📧 Email envoyé avec succès via l'API Resend !");
    return data;
  } catch (error) {
    console.error("❌ Erreur API Resend :", error.message);
  }
};

module.exports = sendEmail;
