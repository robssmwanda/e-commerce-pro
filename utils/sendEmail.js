const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Apple Store" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    })

    console.log("📧 Email envoyé:", info.response)

  } catch (err) {
    console.error("❌ Erreur envoi email:", err.message)
    throw err
  }
}

module.exports = sendEmail