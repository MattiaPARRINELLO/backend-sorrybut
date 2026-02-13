const fs = require('fs').promises;
const path = require('path');

// Cache pour éviter de relire les fichiers à chaque requête
const cache = {
    reasons: {},
    i18n: {},
};

const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'it'];
const DEFAULT_LANGUAGE = 'fr';

/**
 * Charge les raisons pour une langue donnée
 * @param {string} lang - Code de langue (fr, en, es, etc.)
 * @returns {Array<string>} Liste des raisons
 */
async function loadReasons(lang = DEFAULT_LANGUAGE) {
    // Vérifier si la langue est supportée
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        lang = DEFAULT_LANGUAGE;
    }

    // Vérifier le cache
    if (cache.reasons[lang]) {
        return cache.reasons[lang];
    }

    try {
        const filePath = path.join(__dirname, '../data/reasons', `${lang}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        const reasons = JSON.parse(data);

        // Mettre en cache
        cache.reasons[lang] = reasons;
        return reasons;
    } catch (error) {
        console.error(`Erreur chargement reasons/${lang}.json:`, error.message);
        // Fallback sur français
        if (lang !== DEFAULT_LANGUAGE) {
            return loadReasons(DEFAULT_LANGUAGE);
        }
        return [];
    }
}

/**
 * Récupère une raison aléatoire
 * @param {string} lang - Code de langue
 * @returns {string|null} Une raison aléatoire
 */
async function getRandomReason(lang = DEFAULT_LANGUAGE) {
    const reasons = await loadReasons(lang);

    if (reasons.length === 0) {
        return null;
    }

    const randomIndex = Math.floor(Math.random() * reasons.length);
    return reasons[randomIndex];
}

/**
 * Charge les traductions i18n pour une langue donnée
 * @param {string} lang - Code de langue
 * @returns {Object} Objet de traductions
 */
async function loadI18n(lang = DEFAULT_LANGUAGE) {
    // Vérifier si la langue est supportée
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        lang = DEFAULT_LANGUAGE;
    }

    // Vérifier le cache
    if (cache.i18n[lang]) {
        return cache.i18n[lang];
    }

    try {
        const filePath = path.join(__dirname, '../data/i18n', `${lang}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        const translations = JSON.parse(data);

        // Mettre en cache
        cache.i18n[lang] = translations;
        return translations;
    } catch (error) {
        console.error(`Erreur chargement i18n/${lang}.json:`, error.message);
        // Fallback sur français
        if (lang !== DEFAULT_LANGUAGE) {
            return loadI18n(DEFAULT_LANGUAGE);
        }
        return {};
    }
}

/**
 * Vide le cache (utile pour les mises à jour)
 */
function clearCache() {
    cache.reasons = {};
    cache.i18n = {};
}

module.exports = {
    loadReasons,
    getRandomReason,
    loadI18n,
    clearCache,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
};
