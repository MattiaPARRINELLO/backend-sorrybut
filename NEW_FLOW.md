# 🔄 New Authentication & Payment Flow

## Overview

The flow has been optimized to verify the user's email **before** payment, improving UX and security.

---

## ✅ New Flow (Recommended)

### Step 1: Verify Email
```
POST /auth/verify-email
```

User enters their email and receives a 6-digit OTP code.

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification code sent by email",
  "devCode": "123456"  // Only in development
}
```

---

### Step 2: Confirm Email with OTP
```
POST /auth/confirm-email
```

User enters the OTP code to verify their email. Email is marked as verified for 30 minutes.

**Request**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "email": "user@example.com"
}
```

---

### Step 3: Purchase Premium
```
POST /checkout
```

Create a Stripe payment session. **Requires email to be verified first.**

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

**Error if email not verified**:
```json
{
  "error": "Email not verified",
  "message": "Please verify your email with OTP code before purchasing"
}
```

---

### Step 4: Complete Payment

User is redirected to Stripe Checkout, completes payment, and the webhook activates premium access.

---

### Step 5: Login (Optional)

If the user needs to log in later, they can use the legacy flow:

```
POST /auth/request-otp → POST /auth/login
```

Or they can simply verify their email again:

```
POST /auth/verify-email → POST /auth/confirm-email → Generate Token
```

---

## 🎯 Benefits of New Flow

✅ **Email Validation Before Payment**  
- Ensures email is valid and accessible before creating Stripe session
- Prevents typos in payment information

✅ **Better User Experience**  
- User is already "engaged" with OTP before paying
- No need to verify email again after payment

✅ **Improved Security**  
- Confirms user controls the email address
- Reduces fraudulent purchases

✅ **Higher Conversion Rate**  
- Smoother flow with fewer steps after payment
- User can be auto-logged in after successful payment

---

## 📊 Flow Comparison

### Old Flow
```
1. User clicks "Buy Premium"
2. User enters email in Stripe form
3. User completes payment
4. User receives confirmation email
5. User clicks "Login"
6. User enters email again
7. User receives OTP code
8. User enters OTP code
9. User is logged in ✅
```
**9 steps total**

### New Flow
```
1. User enters email
2. User receives OTP code
3. User enters OTP code (email verified ✅)
4. User clicks "Buy Premium"
5. User completes payment
6. User is auto-logged in ✅
```
**6 steps total (33% reduction)**

---

## 🔧 Implementation in Extension

### Complete Flow Example

```javascript
// 1. Verify Email
async function verifyEmail(email) {
  const response = await fetch('https://api.mprnl.fr/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
}

// 2. Confirm Email with OTP
async function confirmEmail(email, code) {
  const response = await fetch('https://api.mprnl.fr/auth/confirm-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  return response.json();
}

// 3. Purchase Premium (requires verified email)
async function purchasePremium(email) {
  const response = await fetch('https://api.mprnl.fr/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.error === 'Email not verified') {
      // Redirect user to verify email first
      throw new Error('Please verify your email first');
    }
  }
  
  return response.json();
}

// Complete User Journey
async function completeUserJourney() {
  // Step 1: Get email
  const email = prompt('Enter your email:');
  
  // Step 2: Send OTP
  await verifyEmail(email);
  alert('Check your email for verification code');
  
  // Step 3: Verify OTP
  const code = prompt('Enter the 6-digit code:');
  await confirmEmail(email, code);
  alert('Email verified! ✅');
  
  // Step 4: Purchase
  const { checkoutUrl } = await purchasePremium(email);
  window.location.href = checkoutUrl;
  
  // Step 5: After payment, user can login with same email
  // No need for new OTP since email is already verified!
}
```

---

## 🔀 Migration from Old Flow

### Old Flow (Still Supported)
```
POST /auth/request-otp  → POST /auth/login
```

This flow is marked as `@deprecated` but still works for backward compatibility.

### New Flow (Recommended)
```
POST /auth/verify-email → POST /auth/confirm-email → POST /checkout
```

---

## ⏱️ Timeouts

- **OTP Code**: Valid for **10 minutes**
- **Email Verification**: Valid for **30 minutes**

This gives the user enough time to complete the payment process after verifying their email.

---

## 🧪 Testing

### Test the New Flow

```bash
# 1. Verify Email
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Response: {"success":true,"devCode":"123456"}

# 2. Confirm Email
curl -X POST http://localhost:3000/auth/confirm-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# Response: {"success":true,"message":"Email verified successfully"}

# 3. Create Checkout (should work now)
curl -X POST http://localhost:3000/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Response: {"success":true,"checkoutUrl":"https://..."}

# 4. Try checkout without verification (should fail)
curl -X POST http://localhost:3000/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"notverified@example.com"}'

# Response: {"error":"Email not verified"}
```

---

## 📝 Updated API Endpoints

### New Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/verify-email` | POST | Send OTP to verify email | No |
| `/auth/confirm-email` | POST | Confirm email with OTP | No |
| `/checkout` | POST | Create payment session (requires verified email) | No |

### Existing Endpoints (Unchanged)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/request-otp` | POST | Send OTP for login (deprecated) | No* |
| `/auth/login` | POST | Login with OTP | No |
| `/auth/check` | GET | Check premium status | No |
| `/premium-reasons` | GET | Get random excuse | Yes |
| `/i18n` | GET | Get translations | Yes |
| `/languages` | GET | List supported languages | No |

*Requires premium access

---

## 🎉 Summary

The new flow improves UX by:
1. ✅ Verifying email before payment  
2. ✅ Reducing total steps by 33%
3. ✅ Preventing email typos in Stripe
4. ✅ Enabling auto-login after payment
5. ✅ Increasing security and trust

**Old endpoints remain functional for backward compatibility.**
