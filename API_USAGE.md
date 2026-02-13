# 📚 SorryBut Backend API - Usage Guide

Simple API for managing premium access and authentication for the SorryBut Chrome extension.

**Base URL**: `http://localhost:3000` (development) or `https://api.mprnl.fr` (production)

---

## 🚀 Quick Start

### 1. Purchase Premium Access

```bash
POST /checkout
```

### 2. Request Login Code

```bash
POST /auth/request-otp
```

### 3. Login with Code

```bash
POST /auth/login
```

### 4. Access Premium Content

```bash
GET /premium-reasons
```

---

## 📋 Endpoints

### 🛒 **Checkout - Create Payment Session**

Create a Stripe payment session to purchase premium access.

**Endpoint**: `POST /checkout`

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**Example** (PowerShell):

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/checkout" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"email":"user@example.com"}' `
  -UseBasicParsing
```

**Example** (cURL):

```bash
curl -X POST http://localhost:3000/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Example** (JavaScript):

```javascript
const response = await fetch("http://localhost:3000/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com" }),
});
const data = await response.json();
// Redirect user to data.checkoutUrl
```

---

### 🔐 **Authentication Flow**

#### Step 1: Request OTP Code

Send a one-time password code to the user's email.

**Endpoint**: `POST /auth/request-otp`

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "OTP code sent by email",
  "devCode": "123456" // Only in development mode
}
```

**Example** (JavaScript):

```javascript
const response = await fetch("http://localhost:3000/auth/request-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com" }),
});
```

---

#### Step 2: Login with OTP Code

Verify the OTP code and get an authentication token.

**Endpoint**: `POST /auth/login`

**Request Body**:

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com"
}
```

**Error Response** (401 Unauthorized):

```json
{
  "error": "Invalid or expired code"
}
```

**Error Response** (403 Forbidden):

```json
{
  "error": "Premium access required",
  "message": "You must purchase premium access to log in"
}
```

**Example** (JavaScript):

```javascript
const response = await fetch("http://localhost:3000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    code: "123456",
  }),
});
const { token } = await response.json();
// Store token for subsequent requests
```

---

#### Step 3: Check Premium Status (Optional)

Check if an email has premium access without authentication.

**Endpoint**: `GET /auth/check?email=user@example.com`

**Response** (200 OK):

```json
{
  "email": "user@example.com",
  "hasPremium": true
}
```

**Example** (JavaScript):

```javascript
const response = await fetch(
  "http://localhost:3000/auth/check?email=user@example.com",
);
const { hasPremium } = await response.json();
```

---

### 🎯 **Premium Content**

All premium endpoints require authentication with a Bearer token.

#### Get Random Excuse

Get a random professional excuse in the specified language.

**Endpoint**: `GET /premium-reasons?lang=en`

**Headers**:

```
Authorization: Bearer <your-token>
```

**Query Parameters**:

- `lang` (optional): Language code (en, fr, es, de, it, pt, nl, pl, ru, ja, zh, ar, hi, tr, sv)

**Response** (200 OK):

```json
{
  "reason": "I have an urgent client meeting",
  "language": "en",
  "email": "user@example.com"
}
```

**Example** (JavaScript):

```javascript
const response = await fetch("http://localhost:3000/premium-reasons?lang=en", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
const { reason } = await response.json();
```

---

#### Get UI Translations

Get translated interface strings for the specified language.

**Endpoint**: `GET /i18n?lang=en`

**Headers**:

```
Authorization: Bearer <your-token>
```

**Query Parameters**:

- `lang` (optional): Language code

**Response** (200 OK):

```json
{
  "strings": {
    "title": "Sorry, but...",
    "subtitle": "Professional excuses generator",
    "generate": "Generate",
    ...
  },
  "language": "en",
  "supportedLanguages": ["en", "fr", "es", ...]
}
```

---

#### Get Supported Languages

Get a list of all supported languages (public endpoint).

**Endpoint**: `GET /languages`

**Response** (200 OK):

```json
{
  "languages": [
    "en",
    "fr",
    "es",
    "de",
    "it",
    "pt",
    "nl",
    "pl",
    "ru",
    "ja",
    "zh",
    "ar",
    "hi",
    "tr",
    "sv"
  ],
  "default": "en"
}
```

---

## 🔒 Authentication

### Using Bearer Token

After logging in, include the JWT token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example** (JavaScript):

```javascript
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

fetch("http://localhost:3000/premium-reasons", { headers });
```

**Example** (PowerShell):

```powershell
$headers = @{
  "Authorization" = "Bearer $token"
}
Invoke-WebRequest -Uri "http://localhost:3000/premium-reasons" -Headers $headers
```

---

## ⚠️ Error Codes

| Code | Description                             |
| ---- | --------------------------------------- |
| 400  | Bad Request - Invalid parameters        |
| 401  | Unauthorized - Missing or invalid token |
| 403  | Forbidden - Premium access required     |
| 404  | Not Found - Endpoint doesn't exist      |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error                   |

### Common Error Responses

**Invalid Email**:

```json
{
  "error": "Invalid email"
}
```

**Missing Token**:

```json
{
  "error": "Missing token"
}
```

**Invalid Token**:

```json
{
  "error": "Invalid or expired token"
}
```

**Premium Required**:

```json
{
  "error": "Premium access required",
  "message": "You must purchase premium access to use this feature"
}
```

**Rate Limit Exceeded**:

```json
{
  "error": "Too many requests, please try again later"
}
```

---

## 🔄 Complete User Flow Example

### JavaScript/TypeScript Example

```javascript
// 1. User wants to access premium content
async function checkPremiumStatus(email) {
  const response = await fetch(
    `https://api.mprnl.fr/auth/check?email=${email}`,
  );
  const { hasPremium } = await response.json();
  return hasPremium;
}

// 2. If no premium, redirect to checkout
async function purchasePremium(email) {
  const response = await fetch("https://api.mprnl.fr/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const { checkoutUrl } = await response.json();
  window.location.href = checkoutUrl;
}

// 3. After payment, user can log in
async function requestOTP(email) {
  await fetch("https://api.mprnl.fr/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  // User receives email with code
}

// 4. Login with OTP code
async function login(email, code) {
  const response = await fetch("https://api.mprnl.fr/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const { token } = await response.json();
  // Store token securely
  localStorage.setItem("token", token);
  return token;
}

// 5. Access premium content
async function getRandomExcuse(lang = "en") {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `https://api.mprnl.fr/premium-reasons?lang=${lang}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const { reason } = await response.json();
  return reason;
}

// Usage
const email = "user@example.com";

// Check if user has premium
const hasPremium = await checkPremiumStatus(email);

if (!hasPremium) {
  // Redirect to payment
  await purchasePremium(email);
} else {
  // Request OTP
  await requestOTP(email);

  // User enters code from email
  const code = prompt("Enter OTP code from email:");

  // Login
  const token = await login(email, code);

  // Get premium content
  const excuse = await getRandomExcuse("en");
  console.log(excuse);
}
```

---

## 🛡️ Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 10 requests per 15 minutes
- **Auth endpoints** (`/auth/*`): 5 requests per 15 minutes
- **Premium endpoints**: 30 requests per minute

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response.

---

## 🌍 Supported Languages

| Code | Language          |
| ---- | ----------------- |
| `en` | English (default) |
| `fr` | French            |
| `es` | Spanish           |
| `de` | German            |
| `it` | Italian           |
| `pt` | Portuguese        |
| `nl` | Dutch             |
| `pl` | Polish            |
| `ru` | Russian           |
| `ja` | Japanese          |
| `zh` | Chinese           |
| `ar` | Arabic            |
| `hi` | Hindi             |
| `tr` | Turkish           |
| `sv` | Swedish           |

---

## 🧪 Testing

### Test Email Sending

```bash
node test-email.js user@example.com both
```

### Test API Endpoints

```bash
# Check API status
curl http://localhost:3000/

# Test checkout
curl -X POST http://localhost:3000/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test OTP request
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 📞 Support

For issues or questions:

- Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide for deployment instructions
- Review error messages in the API response
- Verify your authentication token is valid
- Ensure you have premium access for protected endpoints

---

## 🔗 Related Documentation

- [Deployment Guide](DEPLOYMENT.md) - How to deploy to production
- [Stripe Documentation](https://stripe.com/docs) - Payment integration
- [JWT.io](https://jwt.io) - Token verification

---

**Version**: 1.0.0  
**Last Updated**: February 2026
