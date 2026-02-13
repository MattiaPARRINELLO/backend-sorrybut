const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { strictLimiter } = require('../middleware/rateLimiter');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /checkout
 * Crée une session Stripe Checkout pour le paiement unique
 */
router.post('/', strictLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        // Déterminer l'URL de succès/annulation
        const successUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`
            : 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}';

        const cancelUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/cancel`
            : 'https://example.com/cancel';

        // Créer une session Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'SorryBut Premium',
                            description: 'Lifetime access to +2000 premium excuses and multilingual support',
                        },
                        unit_amount: parseInt(process.env.PREMIUM_PRICE_CENTS || 400), // 4,00 EUR
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // Paiement unique
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                email: email,
                product: 'sorrybut-premium',
            },
        });

        res.json({
            success: true,
            checkoutUrl: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        console.error('Erreur création session Stripe:', error);
        res.status(500).json({
            error: 'Failed to create payment session',
            message: error.message
        });
    }
});

module.exports = router;
