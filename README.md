# SorryBut Backend API

Backend Node.js/Express pour l'extension Chrome **SorryBut Premium**, intégrant Stripe pour les paiements uniques, authentification OTP, et API de contenu premium multilingue.

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Endpoints API](#endpoints-api)
- [Configuration Stripe](#configuration-stripe)
- [Tests](#tests)
- [Déploiement](#déploiement)

## ✨ Fonctionnalités

- 🔐 **Authentification OTP** : Connexion par email + code à 6 chiffres
- 💳 **Paiement Stripe** : Checkout unique à 4€ via Stripe
- 🌍 **Multilingue** : Support de 5 langues (FR, EN, ES, DE, IT)
- 📚 **Contenu Premium** : +2000 raisons professionnelles par langue
- 🎨 **Traductions UI** : Fichiers i18n pour l'interface extension
- 🔒 **Sécurité** : JWT tokens, rate limiting, protection anti-scraping
- 📧 **Emails automatiques** : OTP et confirmation d'achat

## 🏗 Architecture

```
backend-sorrybut/
├── data/                    # Fichiers de données JSON
│   ├── reasons/            # Raisons premium par langue
│   │   ├── fr.json
│   │   ├── en.json
│   │   ├── es.json
│   │   ├── de.json
│   │   └── it.json
│   └── i18n/               # Traductions UI par langue
│       ├── fr.json
│       ├── en.json
│       ├── es.json
│       ├── de.json
│       └── it.json
├── middleware/              # Middlewares Express
│   ├── auth.js             # Authentification JWT
│   └── rateLimiter.js      # Rate limiting
├── routes/                  # Routes API
│   ├── auth.js             # OTP & Login
│   ├── checkout.js         # Stripe Checkout
│   └── premium.js          # Endpoints premium
├── storage/                 # Stockage local (généré)
│   ├── entitlements.json   # Utilisateurs premium
│   └── otp-codes.json      # Codes OTP temporaires
├── utils/                   # Utilitaires
│   ├── dataLoader.js       # Chargement des fichiers JSON
│   ├── email.js            # Envoi d'emails
│   ├── jwt.js              # Génération/validation JWT
│   └── storage.js          # Gestion du stockage local
├── .env.example             # Exemple de configuration
├── .gitignore
├── package.json
├── server.js                # Point d'entrée serveur
└── README.md
```

## 📦 Installation

### Prérequis

- Node.js >= 16.x
- npm ou yarn
- Compte Stripe (clés API test ou production)
- Compte email SMTP (Gmail, SendGrid, etc.)

### Étapes

1. **Cloner le dépôt**

```bash
git clone <votre-repo>
cd backend-sorrybut
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Créer le fichier .env**

```bash
cp .env.example .env
```

4. **Configurer les variables d'environnement** (voir section suivante)

## ⚙️ Configuration

Éditer le fichier `.env` avec vos propres valeurs :

```env
# Server
PORT=3000
NODE_ENV=development

# JWT Secret (générez une clé sécurisée)
JWT_SECRET=votre_cle_secrete_tres_longue_et_aleatoire

# Stripe
STRIPE_SECRET_KEY=sk_test_votre_cle_stripe
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret
PREMIUM_PRICE_CENTS=400

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_app
EMAIL_FROM=noreply@sorrybut.com

# Frontend
FRONTEND_URL=https://votre-extension-success-page.com

# CORS
CORS_ORIGIN=*
```

### Générer un JWT_SECRET sécurisé

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Configuration Gmail pour SMTP

1. Activer l'authentification à 2 facteurs sur votre compte Gmail
2. Générer un mot de passe d'application : https://myaccount.google.com/apppasswords
3. Utiliser ce mot de passe dans `EMAIL_PASSWORD`

## 🚀 Démarrage

### Mode Développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000` avec rechargement automatique (nodemon).

### Mode Production

```bash
npm start
```

### Vérification

Ouvrir http://localhost:3000 dans un navigateur. Vous devriez voir la documentation API.

## 📡 Endpoints API

### Documentation interactive

```
GET http://localhost:3000/
```

### 🔐 Authentification

#### Demander un code OTP

```http
POST /auth/request-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Réponse :**

```json
{
  "success": true,
  "message": "Code OTP envoyé par email",
  "devCode": "123456" // Uniquement en mode development
}
```

#### Se connecter

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

**Réponse :**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com"
}
```

#### Vérifier le statut premium

```http
GET /auth/check?email=user@example.com
```

**Réponse :**

```json
{
  "email": "user@example.com",
  "hasPremium": true
}
```

### 💳 Paiement

#### Créer une session Stripe Checkout

```http
POST /checkout
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Réponse :**

```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

### ⭐ Endpoints Premium

Tous les endpoints premium nécessitent un token JWT dans l'en-tête `Authorization`.

#### Récupérer une raison aléatoire

```http
GET /premium-reasons?lang=fr
Authorization: Bearer <votre_token>
```

**Réponse :**

```json
{
  "reason": "Je suis actuellement en réunion stratégique avec mon équipe.",
  "language": "fr",
  "email": "user@example.com"
}
```

#### Récupérer les traductions UI

```http
GET /i18n?lang=fr
Authorization: Bearer <votre_token>
```

**Réponse :**

```json
{
  "strings": {
    "popup_insert": "Insérer",
    "popup_history": "Historique",
    ...
  },
  "language": "fr",
  "supportedLanguages": ["fr", "en", "es", "de", "it"]
}
```

#### Lister les langues supportées

```http
GET /languages
```

**Réponse :**

```json
{
  "languages": ["fr", "en", "es", "de", "it"],
  "default": "fr"
}
```

### 🪝 Webhook

#### Webhook Stripe

```http
POST /webhook/stripe
Content-Type: application/json
Stripe-Signature: <signature>

[Raw Stripe event body]
```

Ce webhook est appelé automatiquement par Stripe lors d'événements de paiement. **Ne pas appeler manuellement.**

## 🔧 Configuration Stripe

### 1. Créer un compte Stripe

- https://dashboard.stripe.com/register

### 2. Récupérer les clés API

- Dashboard → Developers → API keys
- Copier la **Secret key** (`sk_test_...`) dans `.env`

### 3. Configurer le webhook

**En développement (avec Stripe CLI) :**

```bash
# Installer Stripe CLI
# https://stripe.com/docs/stripe-cli

# Se connecter
stripe login

# Écouter les webhooks localement
stripe listen --forward-to localhost:3000/webhook/stripe
```

La commande affiche le **webhook signing secret** (`whsec_...`) → copier dans `.env`.

**En production :**

1. Dashboard Stripe → Developers → Webhooks
2. Ajouter un endpoint : `https://votre-domaine.com/webhook/stripe`
3. Sélectionner les événements : `checkout.session.completed`
4. Copier le **Signing secret** dans `.env` en production

### 4. Tester un paiement

Utiliser les cartes de test Stripe :

- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- Date d'expiration : n'importe quelle date future
- CVC : n'importe quel 3 chiffres

## 🧪 Tests

### Test manuel avec cURL

**Demander un OTP :**

```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Se connecter (après avoir acheté Premium) :**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

**Récupérer une raison premium :**

```bash
curl -X GET "http://localhost:3000/premium-reasons?lang=fr" \
  -H "Authorization: Bearer <votre_token>"
```

### Ajouter manuellement un utilisateur premium (dev)

Éditer `storage/entitlements.json` :

```json
{
  "premiumUsers": [
    {
      "email": "test@example.com",
      "activatedAt": "2024-01-01T00:00:00.000Z",
      "stripeSessionId": null
    }
  ]
}
```

## 🌐 Déploiement

### Variables d'environnement en production

Assurez-vous de définir :

- `NODE_ENV=production`
- `JWT_SECRET` : clé sécurisée aléatoire
- `STRIPE_SECRET_KEY` : clé live (commence par `sk_live_`)
- `STRIPE_WEBHOOK_SECRET` : secret du webhook production
- `FRONTEND_URL` : URL de votre page de succès
- `CORS_ORIGIN` : domaine autorisé (ex: `https://votre-extension.com`)

### Hébergement recommandé

- **Render** : https://render.com (gratuit avec limitations)
- **Railway** : https://railway.app (gratuit avec limitations)
- **Heroku** : https://heroku.com
- **DigitalOcean App Platform**
- **AWS Elastic Beanstalk**

### Exemple de déploiement sur Render

1. Créer un nouveau Web Service
2. Connecter votre dépôt Git
3. Configuration :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Environment** : Ajouter toutes les variables du `.env`
4. Déployer

### HTTPS obligatoire en production

Stripe nécessite HTTPS pour les webhooks en production. La plupart des plateformes fournissent HTTPS automatiquement.

## 📊 Rate Limiting

Le backend inclut du rate limiting pour protéger contre les abus :

- **Endpoints publics** : 100 requêtes / 15 min par IP
- **Auth/Checkout** : 10 requêtes / 15 min par IP
- **Endpoints premium** : 60 requêtes / min par token

## 🔒 Sécurité

✅ **Mis en place :**

- Tokens JWT avec expiration (90 jours)
- Rate limiting sur tous les endpoints
- Vérification des webhooks Stripe
- CORS configuré
- Codes OTP à usage unique avec expiration (10 min)

⚠️ **À améliorer pour la production :**

- Utiliser une vraie base de données (PostgreSQL, MongoDB)
- Implémenter un système de révocation de tokens
- Ajouter des logs structurés (Winston, Pino)
- Mettre en place un monitoring (Sentry, DataDog)
- Chiffrer les données sensibles au repos
- Implémenter HTTPS uniquement

## 📝 Licence

MIT

## 🤝 Support

Pour toute question, ouvrez une issue sur GitHub ou contactez support@sorrybut.com.

---

**Fait avec ❤️ pour SorryBut**
