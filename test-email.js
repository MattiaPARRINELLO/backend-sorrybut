require('dotenv').config();
const { sendOTPEmail, sendPurchaseConfirmationEmail } = require('./utils/email');

/**
 * Script de test pour vérifier l'envoi d'emails
 * Usage: node test-email.js [email] [type]
 * 
 * Exemples:
 *   node test-email.js test@example.com otp
 *   node test-email.js test@example.com purchase
 *   node test-email.js test@example.com both
 */

const args = process.argv.slice(2);
const email = args[0];
const type = args[1] || 'both';

// Couleurs pour le terminal
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEmail() {
    console.log('\n' + '='.repeat(60));
    log('cyan', '🧪 TEST D\'ENVOI D\'EMAILS - SorryBut Backend');
    console.log('='.repeat(60) + '\n');

    // Vérifier la configuration
    log('blue', '📋 Vérification de la configuration...');
    const requiredEnvVars = [
        'EMAIL_HOST',
        'EMAIL_PORT',
        'EMAIL_USER',
        'EMAIL_PASSWORD',
        'EMAIL_FROM'
    ];

    let configOk = true;
    for (const varName of requiredEnvVars) {
        if (!process.env[varName]) {
            log('red', `   ❌ ${varName} n'est pas défini dans .env`);
            configOk = false;
        } else {
            // Masquer les mots de passe
            const value = varName.includes('PASSWORD') 
                ? '*'.repeat(process.env[varName].length)
                : process.env[varName];
            log('green', `   ✓ ${varName}: ${value}`);
        }
    }

    if (!configOk) {
        log('red', '\n❌ Configuration incomplète. Veuillez vérifier votre fichier .env\n');
        process.exit(1);
    }

    // Vérifier l'email
    if (!email || !email.includes('@')) {
        log('red', '\n❌ Email invalide ou manquant');
        log('yellow', '\nUsage: node test-email.js <email> [type]');
        log('yellow', 'Types disponibles: otp, purchase, both (défaut)\n');
        log('yellow', 'Exemples:');
        log('yellow', '  node test-email.js test@example.com otp');
        log('yellow', '  node test-email.js test@example.com purchase');
        log('yellow', '  node test-email.js test@example.com both\n');
        process.exit(1);
    }

    console.log('');
    log('blue', `📧 Email de destination: ${email}`);
    log('blue', `📝 Type de test: ${type}\n`);

    let success = true;

    // Test email OTP
    if (type === 'otp' || type === 'both') {
        log('cyan', '📨 Test 1: Envoi d\'un code OTP...');
        const testCode = Math.floor(100000 + Math.random() * 900000).toString();
        log('yellow', `   Code de test généré: ${testCode}`);
        
        try {
            const result = await sendOTPEmail(email, testCode);
            if (result) {
                log('green', '   ✓ Email OTP envoyé avec succès !');
            } else {
                log('red', '   ❌ Échec de l\'envoi de l\'email OTP');
                success = false;
            }
        } catch (error) {
            log('red', `   ❌ Erreur: ${error.message}`);
            success = false;
        }
        console.log('');
    }

    // Test email confirmation d'achat
    if (type === 'purchase' || type === 'both') {
        log('cyan', '📨 Test 2: Envoi d\'un email de confirmation d\'achat...');
        
        try {
            const result = await sendPurchaseConfirmationEmail(email);
            if (result) {
                log('green', '   ✓ Email de confirmation envoyé avec succès !');
            } else {
                log('red', '   ❌ Échec de l\'envoi de l\'email de confirmation');
                success = false;
            }
        } catch (error) {
            log('red', `   ❌ Erreur: ${error.message}`);
            success = false;
        }
        console.log('');
    }

    // Résumé
    console.log('='.repeat(60));
    if (success) {
        log('green', '✅ TOUS LES TESTS SONT RÉUSSIS !');
        log('green', `   Vérifiez la boîte de réception de ${email}`);
    } else {
        log('red', '❌ CERTAINS TESTS ONT ÉCHOUÉ');
        log('yellow', '   Vérifiez les logs ci-dessus pour plus de détails');
        log('yellow', '   Assurez-vous que les paramètres SMTP sont corrects dans .env');
    }
    console.log('='.repeat(60) + '\n');

    process.exit(success ? 0 : 1);
}

// Exécuter le test
testEmail().catch(error => {
    log('red', `\n❌ Erreur critique: ${error.message}\n`);
    process.exit(1);
});
