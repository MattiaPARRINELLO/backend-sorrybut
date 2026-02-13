const express = require('express');
const router = express.Router();
const { authenticateToken, requirePremium } = require('../middleware/auth');
const { premiumLimiter } = require('../middleware/rateLimiter');
const { getRandomReason, loadI18n, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = require('../utils/dataLoader');

/**
 * GET /premium-reasons
 * Récupère une raison aléatoire dans la langue demandée
 */
router.get('/premium-reasons', authenticateToken, requirePremium, premiumLimiter, async (req, res) => {
    try {
        const { lang = DEFAULT_LANGUAGE } = req.query;

        // Valider la langue
        const language = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

        // Récupérer une raison aléatoire
        const reason = await getRandomReason(language);

        if (!reason) {
            return res.status(500).json({ error: 'No reason available' });
        }

        res.json({
            reason,
            language,
            email: req.userEmail,
        });
    } catch (error) {
        console.error('Erreur premium-reasons:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /i18n
 * Récupère les traductions de l'interface dans la langue demandée
 */
router.get('/i18n', authenticateToken, requirePremium, premiumLimiter, async (req, res) => {
    try {
        const { lang = DEFAULT_LANGUAGE } = req.query;

        // Valider la langue
        const language = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

        // Charger les traductions
        const strings = await loadI18n(language);

        res.json({
            strings,
            language,
            supportedLanguages: SUPPORTED_LANGUAGES,
        });
    } catch (error) {
        console.error('Erreur i18n:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /languages
 * Liste les langues supportées (endpoint public)
 */
router.get('/languages', async (req, res) => {
    res.json({
        languages: SUPPORTED_LANGUAGES,
        default: DEFAULT_LANGUAGE,
    });
});

module.exports = router;
