const { verifyToken } = require('../utils/jwt');
const { isPremiumUser } = require('../utils/storage');

/**
 * Middleware d'authentification
 * Vérifie la présence et la validité du token JWT
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Missing token' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Ajouter l'email au request
    req.userEmail = decoded.email;
    next();
}

/**
 * Middleware de vérification premium
 * Vérifie que l'utilisateur a bien un accès premium
 */
async function requirePremium(req, res, next) {
    const email = req.userEmail;

    if (!email) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPremium = await isPremiumUser(email);
    if (!hasPremium) {
        return res.status(403).json({
            error: 'Premium access required',
            message: 'You must purchase premium access to use this feature'
        });
    }

    next();
}

module.exports = {
    authenticateToken,
    requirePremium,
};
