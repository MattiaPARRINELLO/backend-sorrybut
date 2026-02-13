const jwt = require('jsonwebtoken');

/**
 * Génère un token JWT pour un utilisateur
 * @param {string} email - Email de l'utilisateur
 * @returns {string} Token JWT signé
 */
function generateToken(email) {
    const payload = {
        email,
        iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '90d', // Token valide 90 jours
    });
}

/**
 * Vérifie et décode un token JWT
 * @param {string} token - Token JWT à vérifier
 * @returns {object|null} Payload décodé ou null si invalide
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = {
    generateToken,
    verifyToken,
};
