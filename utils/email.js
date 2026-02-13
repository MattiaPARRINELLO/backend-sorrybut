const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === '465', // true pour 465, false pour autres ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
    // Options de sécurité supplémentaires
    tls: {
        rejectUnauthorized: false // Pour les certificats auto-signés en dev
    }
});

/**
 * Envoie un email avec le code OTP
 * @param {string} email - Email du destinataire
 * @param {string} code - Code OTP à envoyer
 */
async function sendOTPEmail(email, code) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Your SorryBut Login Code',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SorryBut Premium</h2>
          <p>Your login code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP envoyé à ${email}`);
        return true;
    } catch (error) {
        console.error('Erreur envoi email:', error);
        return false;
    }
}

/**
 * Envoie un email de confirmation d'achat
 * @param {string} email - Email du destinataire
 */
async function sendPurchaseConfirmationEmail(email) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Welcome to SorryBut Premium!',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your purchase!</h2>
          <p>Your Premium account is now activated.</p>
          <p>You now have access to:</p>
          <ul>
            <li>Over 2000 professional excuses</li>
            <li>Multilingual support</li>
            <li>Translated interface</li>
          </ul>
          <p>To log in, use your email and request a login code.</p>
          <p>Thank you for using SorryBut!</p>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email de confirmation envoyé à ${email}`);
        return true;
    } catch (error) {
        console.error('Erreur envoi email confirmation:', error);
        return false;
    }
}

module.exports = {
    sendOTPEmail,
    sendPurchaseConfirmationEmail,
};
