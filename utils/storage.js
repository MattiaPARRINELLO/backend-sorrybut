const fs = require('fs').promises;
const path = require('path');

const ENTITLEMENTS_FILE = path.join(__dirname, '../storage/entitlements.json');
const OTP_CODES_FILE = path.join(__dirname, '../storage/otp-codes.json');

/**
 * Initialise les fichiers de stockage s'ils n'existent pas
 */
async function initStorage() {
    const storageDir = path.join(__dirname, '../storage');

    try {
        await fs.mkdir(storageDir, { recursive: true });
    } catch (error) {
        // Dossier existe déjà
    }

    // Initialiser entitlements.json
    try {
        await fs.access(ENTITLEMENTS_FILE);
    } catch {
        await fs.writeFile(ENTITLEMENTS_FILE, JSON.stringify({ premiumUsers: [] }, null, 2));
    }

    // Initialiser otp-codes.json
    try {
        await fs.access(OTP_CODES_FILE);
    } catch {
        await fs.writeFile(OTP_CODES_FILE, JSON.stringify({ codes: {} }, null, 2));
    }
}

/**
 * Lit les entitlements
 */
async function readEntitlements() {
    try {
        const data = await fs.readFile(ENTITLEMENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { premiumUsers: [] };
    }
}

/**
 * Écrit les entitlements
 */
async function writeEntitlements(data) {
    await fs.writeFile(ENTITLEMENTS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Vérifie si un email a accès premium
 */
async function isPremiumUser(email) {
    const entitlements = await readEntitlements();
    return entitlements.premiumUsers.some(
        user => user.email.toLowerCase() === email.toLowerCase()
    );
}

/**
 * Ajoute un utilisateur premium
 */
async function addPremiumUser(email, stripeSessionId = null) {
    const entitlements = await readEntitlements();

    // Éviter les doublons
    const exists = entitlements.premiumUsers.some(
        user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (!exists) {
        entitlements.premiumUsers.push({
            email: email.toLowerCase(),
            activatedAt: new Date().toISOString(),
            stripeSessionId,
        });
        await writeEntitlements(entitlements);
    }
}

/**
 * Lit les codes OTP
 */
async function readOTPCodes() {
    try {
        const data = await fs.readFile(OTP_CODES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { codes: {} };
    }
}

/**
 * Écrit les codes OTP
 */
async function writeOTPCodes(data) {
    await fs.writeFile(OTP_CODES_FILE, JSON.stringify(data, null, 2));
}

/**
 * Génère un code OTP à 6 chiffres
 */
function generateOTPCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Stocke un code OTP pour un email
 */
async function storeOTPCode(email, code) {
    const otpData = await readOTPCodes();
    otpData.codes[email.toLowerCase()] = {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    await writeOTPCodes(otpData);
}

/**
 * Vérifie un code OTP
 */
async function verifyOTPCode(email, code) {
    const otpData = await readOTPCodes();
    const stored = otpData.codes[email.toLowerCase()];

    if (!stored) {
        return false;
    }

    if (Date.now() > stored.expiresAt) {
        // Code expiré
        delete otpData.codes[email.toLowerCase()];
        await writeOTPCodes(otpData);
        return false;
    }

    if (stored.code !== code) {
        return false;
    }

    // Code valide, on le supprime
    delete otpData.codes[email.toLowerCase()];
    await writeOTPCodes(otpData);
    return true;
}

module.exports = {
    initStorage,
    isPremiumUser,
    addPremiumUser,
    generateOTPCode,
    storeOTPCode,
    verifyOTPCode,
};
