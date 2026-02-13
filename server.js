require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { initStorage, addPremiumUser } = require('./utils/storage');
const { generalLimiter } = require('./middleware/rateLimiter');

// Initialiser Express
const app = express();
const PORT = process.env.PORT || 3000;

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
                'POST /auth/verify-email': 'Send OTP to verify email',
                'POST /auth/confirm-email': 'Confirm email with OTP',
            },
            checkout: {
                'POST /checkout': 'Create a Stripe payment session',
            },
            premium: {
                'GET /premium-reasons': 'Get a random excuse (auth required)',
                'GET /i18n': 'Get UI translations (auth required)',
                'GET /languages': 'List supported languages',
            },
            payment: {
                'GET /payment/success': 'Payment success page (activates premium)',
                'GET /payment/cancel': 'Payment canceled page',
            },
            webhook: {
                'POST /webhook/stripe': 'Stripe webhook (signature required)',
            },
        },
    });
});

// Payment success page
app.get('/payment/success', async (req, res) => {
    const sessionId = req.query.session_id;

    if (!sessionId) {
        return res.status(400).send('Missing session_id');
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const isPaid = session && session.payment_status === 'paid';
        const email = session?.metadata?.email || session?.customer_email;

        if (isPaid && email) {
            await addPremiumUser(email, sessionId);
        }

        const title = isPaid ? 'Payment successful' : 'Payment pending';
        const message = isPaid
            ? 'Your premium access is now active. You can close this page.'
            : 'Your payment is still processing. Please wait a moment and refresh.';

        return res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f6f7fb; margin: 0; padding: 40px; }
      .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
      h1 { margin: 0 0 12px; font-size: 24px; color: #111; }
      p { margin: 0 0 16px; color: #444; }
      .status { display: inline-block; padding: 6px 10px; border-radius: 999px; font-size: 12px; background: ${isPaid ? '#e8f5e9' : '#fff3e0'}; color: ${isPaid ? '#1b5e20' : '#e65100'}; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="status">${title}</div>
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`);
    } catch (error) {
        console.error('Error handling payment success:', error);
        return res.status(500).send('Internal server error');
    }
});

// Payment canceled page
app.get('/payment/cancel', (req, res) => {
    return res.status(200).send('Payment canceled. You can return to the app and try again.');
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
