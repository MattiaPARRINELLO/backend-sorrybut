const rateLimit = require('express-rate-limit');

/**
 * Rate limiter général pour les endpoints publics
 * 100 requêtes par 15 minutes par IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter strict pour les endpoints sensibles (auth, checkout)
 * 10 requêtes par 15 minutes par IP
 */
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Trop de tentatives, veuillez réessayer plus tard' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter pour les endpoints premium
 * 60 requêtes par minute par token
 */
const premiumLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
    message: { error: 'Limite de requêtes atteinte, veuillez patienter' },
    standardHeaders: true,
    legacyHeaders: false,
    // Utiliser l'email de l'utilisateur comme clé (au lieu de l'IP)
    keyGenerator: (req) => {
        return req.userEmail || req.ip;
    },
});

module.exports = {
    generalLimiter,
    strictLimiter,
    premiumLimiter,
};
