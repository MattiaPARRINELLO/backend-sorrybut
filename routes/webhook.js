const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { addPremiumUser } = require('../utils/storage');
const { sendPurchaseConfirmationEmail } = require('../utils/email');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /webhook/stripe
 * Webhook sécurisé pour recevoir les événements Stripe
 * 
 * IMPORTANT: Cette route doit utiliser express.raw() et non express.json()
 * pour que la vérification de signature fonctionne
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Vérifier que le secret webhook est configuré
    if (!webhookSecret) {
        console.error('ERREUR CRITIQUE: STRIPE_WEBHOOK_SECRET non configuré dans .env');
        return res.status(500).json({ error: 'Missing webhook configuration' });
    }

    let event;

    try {
        // Vérifier la signature du webhook pour s'assurer qu'il provient de Stripe
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log(`✓ Webhook vérifié: ${event.type} (${event.id})`);
    } catch (err) {
        console.error('❌ Erreur vérification signature webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Traiter les événements Stripe de manière sécurisée
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log(`💳 Paiement réussi - Session: ${session.id}`);

                // Récupérer l'email depuis les metadata ou customer_email
                const email = session.metadata?.email || session.customer_email;

                if (!email) {
                    console.error('❌ Email manquant dans la session:', session.id);
                    // On retourne 200 pour éviter que Stripe réessaie
                    return res.json({ 
                        received: true, 
                        warning: 'Missing email' 
                    });
                }

                // Validation de l'email
                if (!email.includes('@')) {
                    console.error('❌ Email invalide dans la session:', email);
                    return res.json({ 
                        received: true, 
                        warning: 'Invalid email' 
                    });
                }

                try {
                    // Activer l'accès premium
                    await addPremiumUser(email, session.id);
                    console.log(`✓ Accès premium activé pour: ${email}`);

                    // Envoyer un email de confirmation (non bloquant)
                    sendPurchaseConfirmationEmail(email)
                        .then(() => console.log(`✓ Email de confirmation envoyé à: ${email}`))
                        .catch(err => console.error(`❌ Erreur envoi email à ${email}:`, err.message));

                } catch (error) {
                    console.error('❌ Erreur activation premium:', error);
                    // On retourne quand même 200 pour éviter les retry infinis
                    return res.json({ 
                        received: true, 
                        error: 'Premium activation failed' 
                    });
                }
                break;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                console.log(`✓ PaymentIntent réussi: ${paymentIntent.id}`);
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.error(`❌ PaymentIntent échoué: ${paymentIntent.id}`);
                // Récupérer l'email si disponible pour notifier l'utilisateur
                const email = paymentIntent.receipt_email;
                if (email) {
                    console.log(`Email concerné par l'échec: ${email}`);
                    // Vous pouvez ajouter une notification ici
                }
                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object;
                console.log(`↩️ Remboursement effectué: ${charge.id}`);
                // Vous pouvez ajouter une logique pour révoquer l'accès premium
                break;
            }

            default:
                console.log(`ℹ️ Événement non géré: ${event.type}`);
        }

        // Toujours retourner 200 pour confirmer la réception
        res.json({ received: true, eventType: event.type });

    } catch (error) {
        console.error('❌ Erreur critique traitement webhook:', error);
        // Retourner 500 pour que Stripe réessaie
        res.status(500).json({ 
            error: 'Webhook processing error',
            eventType: event.type 
        });
    }
});

module.exports = router;
