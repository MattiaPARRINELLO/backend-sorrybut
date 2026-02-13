require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initStorage } = require('./utils/storage');
const { generalLimiter } = require('./middleware/rateLimiter');

// Initialiser Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));

// IMPORTANT: Le webhook Stripe nécessite le raw body
// On définit la route webhook AVANT express.json()
app.use('/webhook', require('./routes/webhook'));

// Middleware JSON pour les autres routes
app.use(express.json());

// Rate limiting général
app.use(generalLimiter);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/checkout', require('./routes/checkout'));
app.use('/', require('./routes/premium')); // Routes premium à la racine

// Route de test
app.get('/', (req, res) => {
    res.json({
        name: 'SorryBut Backend API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            auth: {
                'POST /auth/request-otp': 'Request an OTP code',
                'POST /auth/login': 'Log in with email + OTP code',
                'GET /auth/check': 'Check premium status',
            },
            checkout: {
                'POST /checkout': 'Create a Stripe payment session',
            },
            premium: {
                'GET /premium-reasons': 'Get a random excuse (auth required)',
                'GET /i18n': 'Get UI translations (auth required)',
                'GET /languages': 'List supported languages',
            },
            webhook: {
                'POST /webhook/stripe': 'Stripe webhook (signature required)',
            },
        },
    });
});

// 404 error handling
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handling
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialisation et démarrage du serveur
async function startServer() {
    try {
        // Initialiser le stockage
        await initStorage();
        console.log('✓ Stockage initialisé');

        // Démarrer le serveur
        app.listen(PORT, () => {
            console.log(`\n🚀 Serveur démarré sur le port ${PORT}`);
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
            console.log('\n📚 Documentation API disponible sur http://localhost:' + PORT);
        });
    } catch (error) {
        console.error('Erreur démarrage serveur:', error);
        process.exit(1);
    }
}

// Démarrer le serveur
startServer();

module.exports = app;
