const express = require('express');
const router = express.Router();
const { generateOTPCode, storeOTPCode, verifyOTPCode, isPremiumUser } = require('../utils/storage');
const { sendOTPEmail } = require('../utils/email');
const { generateToken } = require('../utils/jwt');
const { strictLimiter } = require('../middleware/rateLimiter');

/**
 * POST /auth/request-otp
 * Demande un code OTP par email
 */
router.post('/request-otp', strictLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        // Générer un code OTP
        const code = generateOTPCode();

        // Stocker le code
        await storeOTPCode(email, code);

        // Envoyer par email
        const sent = await sendOTPEmail(email, code);

        if (!sent) {
            return res.status(500).json({ error: 'Failed to send email' });
        }

        res.json({
            success: true,
            message: 'OTP code sent by email',
            // En dev, on peut retourner le code (À RETIRER EN PRODUCTION)
            ...(process.env.NODE_ENV === 'development' && { devCode: code })
        });
    } catch (error) {
        console.error('Erreur request-otp:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /auth/login
 * Connexion avec email + code OTP
 */
router.post('/login', strictLimiter, async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ error: 'Email and code required' });
        }

        // Vérifier le code OTP
        const isValid = await verifyOTPCode(email, code);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid or expired code' });
        }

        // Vérifier si l'utilisateur a un accès premium
        const hasPremium = await isPremiumUser(email);

        if (!hasPremium) {
            return res.status(403).json({
                error: 'Premium access required',
                message: 'You must purchase premium access to log in'
            });
        }

        // Générer un token JWT
        const token = generateToken(email);

        res.json({
            success: true,
            token,
            email,
        });
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /auth/check
 * Vérifie le statut premium d'un email (sans auth)
 */
router.get('/check', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        const hasPremium = await isPremiumUser(email);

        res.json({
            email,
            hasPremium,
        });
    } catch (error) {
        console.error('Erreur check:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
