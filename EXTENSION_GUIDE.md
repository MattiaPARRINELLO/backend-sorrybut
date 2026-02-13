# 🔌 SorryBut Chrome Extension - Integration Guide

Complete guide for building the SorryBut Chrome extension that integrates with the backend API.

**Backend API**: `https://api.mprnl.fr`

---

## 📋 Extension Overview

The SorryBut extension provides:

- Professional excuse generator
- Premium content access (2000+ excuses)
- Multilingual support (15 languages)
- One-click copy to clipboard
- Email-based authentication with OTP

---

## 🏗️ Extension Architecture

```
sorrybut-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup UI
├── popup.js              # Popup logic
├── background.js         # Background service worker
├── styles.css            # Popup styles
├── api/
│   └── client.js         # API client wrapper
├── auth/
│   ├── login.html        # Login page
│   └── login.js          # Login logic
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── locales/
    ├── en/
    │   └── messages.json
    └── fr/
        └── messages.json
```

---

## 📝 manifest.json

```json
{
  "manifest_version": 3,
  "name": "SorryBut - Professional Excuses",
  "version": "1.0.0",
  "description": "Generate professional excuses instantly with multilingual support",
  "icons": {
    "16": "assets/icon16.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "assets/icon16.png",
      "48": "assets/icon48.png"
    }
  },
  "permissions": ["storage", "clipboardWrite"],
  "host_permissions": ["https://api.mprnl.fr/*"],
  "background": {
    "service_worker": "background.js"
  },
  "default_locale": "en"
}
```

---

## 🔧 API Client (api/client.js)

Complete API wrapper for all backend endpoints.

```javascript
// API Configuration
const API_BASE_URL = "https://api.mprnl.fr";

class SorryButAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Get stored token
  async getToken() {
    const result = await chrome.storage.local.get(["authToken"]);
    return result.authToken;
  }

  // Store token
  async setToken(token) {
    await chrome.storage.local.set({ authToken: token });
  }

  // Get stored email
  async getEmail() {
    const result = await chrome.storage.local.get(["userEmail"]);
    return result.userEmail;
  }

  // Store email
  async setEmail(email) {
    await chrome.storage.local.set({ userEmail: email });
  }

  // Clear authentication
  async clearAuth() {
    await chrome.storage.local.remove(["authToken", "userEmail"]);
  }

  // Generic request handler
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = await this.getToken();

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token && !options.skipAuth) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Check premium status
  async checkPremiumStatus(email) {
    return this.request(`/auth/check?email=${encodeURIComponent(email)}`, {
      skipAuth: true,
    });
  }

  // Create checkout session
  async createCheckout(email) {
    return this.request("/checkout", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  }

  // Request OTP code
  async requestOTP(email) {
    return this.request("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  }

  // Login with OTP
  async login(email, code) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, code }),
      skipAuth: true,
    });

    // Store token and email
    await this.setToken(data.token);
    await this.setEmail(email);

    return data;
  }

  // Get random excuse
  async getRandomExcuse(lang = "en") {
    return this.request(`/premium-reasons?lang=${lang}`);
  }

  // Get UI translations
  async getTranslations(lang = "en") {
    return this.request(`/i18n?lang=${lang}`);
  }

  // Get supported languages
  async getSupportedLanguages() {
    return this.request("/languages", { skipAuth: true });
  }

  // Check if user is authenticated
  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }

  // Verify token is still valid
  async verifyToken() {
    try {
      await this.getRandomExcuse();
      return true;
    } catch (error) {
      // Token is invalid, clear auth
      await this.clearAuth();
      return false;
    }
  }
}

// Export singleton instance
const api = new SorryButAPI();
```

---

## 🎨 Main Popup (popup.html)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SorryBut</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>Sorry, but...</h1>
        <div class="language-selector">
          <select id="languageSelect">
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="es">🇪🇸 Español</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="it">🇮🇹 Italiano</option>
            <!-- Add more languages -->
          </select>
        </div>
      </div>

      <!-- Not Authenticated View -->
      <div id="notAuthView" class="hidden">
        <p class="info-text">Sign in to access 2000+ premium excuses</p>
        <button id="loginBtn" class="btn btn-primary">Sign In</button>
        <button id="purchaseBtn" class="btn btn-secondary">Get Premium</button>
      </div>

      <!-- Authenticated View -->
      <div id="authView" class="hidden">
        <!-- Excuse Display -->
        <div class="excuse-container">
          <div id="excuseText" class="excuse-text">
            Click "Generate" to get an excuse
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button id="generateBtn" class="btn btn-primary">
            Generate Excuse
          </button>
          <button id="copyBtn" class="btn btn-secondary" disabled>Copy</button>
        </div>

        <!-- User Info -->
        <div class="user-info">
          <span id="userEmail"></span>
          <button id="logoutBtn" class="btn-link">Logout</button>
        </div>
      </div>

      <!-- Loading -->
      <div id="loading" class="loading hidden">
        <div class="spinner"></div>
      </div>

      <!-- Error Message -->
      <div id="errorMessage" class="error-message hidden"></div>
    </div>

    <script src="api/client.js"></script>
    <script src="popup.js"></script>
  </body>
</html>
```

---

## 💻 Popup Logic (popup.js)

```javascript
// UI Elements
const notAuthView = document.getElementById("notAuthView");
const authView = document.getElementById("authView");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const excuseText = document.getElementById("excuseText");
const languageSelect = document.getElementById("languageSelect");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const loginBtn = document.getElementById("loginBtn");
const purchaseBtn = document.getElementById("purchaseBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");

// State
let currentExcuse = "";
let currentLang = "en";

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadLanguagePreference();
  await checkAuthStatus();
  setupEventListeners();
});

// Load saved language preference
async function loadLanguagePreference() {
  const result = await chrome.storage.local.get(["preferredLanguage"]);
  currentLang = result.preferredLanguage || "en";
  languageSelect.value = currentLang;
}

// Save language preference
async function saveLanguagePreference(lang) {
  await chrome.storage.local.set({ preferredLanguage: lang });
}

// Check authentication status
async function checkAuthStatus() {
  showLoading(true);

  try {
    const isAuth = await api.isAuthenticated();

    if (isAuth) {
      // Verify token is still valid
      const isValid = await api.verifyToken();

      if (isValid) {
        const email = await api.getEmail();
        showAuthenticatedView(email);
      } else {
        showNotAuthenticatedView();
      }
    } else {
      showNotAuthenticatedView();
    }
  } catch (error) {
    showError("Failed to check authentication status");
  } finally {
    showLoading(false);
  }
}

// Show authenticated view
function showAuthenticatedView(email) {
  notAuthView.classList.add("hidden");
  authView.classList.remove("hidden");
  userEmail.textContent = email;
}

// Show not authenticated view
function showNotAuthenticatedView() {
  authView.classList.add("hidden");
  notAuthView.classList.remove("hidden");
}

// Setup event listeners
function setupEventListeners() {
  generateBtn.addEventListener("click", generateExcuse);
  copyBtn.addEventListener("click", copyToClipboard);
  loginBtn.addEventListener("click", openLogin);
  purchaseBtn.addEventListener("click", purchasePremium);
  logoutBtn.addEventListener("click", logout);
  languageSelect.addEventListener("change", onLanguageChange);
}

// Generate excuse
async function generateExcuse() {
  showLoading(true);
  clearError();

  try {
    const data = await api.getRandomExcuse(currentLang);
    currentExcuse = data.reason;
    excuseText.textContent = currentExcuse;
    copyBtn.disabled = false;
  } catch (error) {
    showError(error.message || "Failed to generate excuse");

    // If unauthorized, refresh auth status
    if (error.message.includes("token") || error.message.includes("auth")) {
      await checkAuthStatus();
    }
  } finally {
    showLoading(false);
  }
}

// Copy to clipboard
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(currentExcuse);

    // Visual feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  } catch (error) {
    showError("Failed to copy to clipboard");
  }
}

// Open login page
function openLogin() {
  chrome.windows.create({
    url: chrome.runtime.getURL("auth/login.html"),
    type: "popup",
    width: 400,
    height: 600,
  });
}

// Purchase premium
async function purchasePremium() {
  const email = prompt("Enter your email address:");

  if (!email || !email.includes("@")) {
    showError("Please enter a valid email address");
    return;
  }

  showLoading(true);

  try {
    const data = await api.createCheckout(email);

    // Open checkout in new tab
    chrome.tabs.create({ url: data.checkoutUrl });

    // Save email for later login
    await api.setEmail(email);

    showError("Complete payment, then return here to login", "info");
  } catch (error) {
    showError(error.message || "Failed to create checkout session");
  } finally {
    showLoading(false);
  }
}

// Logout
async function logout() {
  if (confirm("Are you sure you want to logout?")) {
    await api.clearAuth();
    currentExcuse = "";
    excuseText.textContent = 'Click "Generate" to get an excuse';
    copyBtn.disabled = true;
    showNotAuthenticatedView();
  }
}

// Language change handler
async function onLanguageChange(e) {
  currentLang = e.target.value;
  await saveLanguagePreference(currentLang);

  // Regenerate excuse in new language if one is displayed
  if (currentExcuse) {
    await generateExcuse();
  }
}

// Show/hide loading
function showLoading(show) {
  if (show) {
    loading.classList.remove("hidden");
  } else {
    loading.classList.add("hidden");
  }
}

// Show error message
function showError(message, type = "error") {
  errorMessage.textContent = message;
  errorMessage.className = `error-message ${type}`;
  errorMessage.classList.remove("hidden");

  setTimeout(() => {
    errorMessage.classList.add("hidden");
  }, 5000);
}

// Clear error message
function clearError() {
  errorMessage.classList.add("hidden");
}
```

---

## 🔐 Login Page (auth/login.html)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SorryBut - Login</title>
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <div class="container login-container">
      <h1>Sign In to SorryBut</h1>

      <!-- Step 1: Enter Email -->
      <div id="emailStep">
        <p>Enter your email to receive a login code</p>
        <input type="email" id="emailInput" placeholder="your@email.com" />
        <button id="sendCodeBtn" class="btn btn-primary">Send Code</button>
      </div>

      <!-- Step 2: Enter Code -->
      <div id="codeStep" class="hidden">
        <p>
          Enter the 6-digit code sent to <strong id="emailDisplay"></strong>
        </p>
        <input type="text" id="codeInput" placeholder="123456" maxlength="6" />
        <button id="verifyCodeBtn" class="btn btn-primary">
          Verify & Login
        </button>
        <button id="resendCodeBtn" class="btn-link">Resend Code</button>
      </div>

      <!-- Success -->
      <div id="successStep" class="hidden">
        <p class="success-message">✓ Login successful!</p>
        <p>You can close this window now.</p>
      </div>

      <!-- Loading -->
      <div id="loading" class="loading hidden">
        <div class="spinner"></div>
      </div>

      <!-- Error -->
      <div id="errorMessage" class="error-message hidden"></div>
    </div>

    <script src="../api/client.js"></script>
    <script src="login.js"></script>
  </body>
</html>
```

---

## 🔐 Login Logic (auth/login.js)

```javascript
// UI Elements
const emailStep = document.getElementById("emailStep");
const codeStep = document.getElementById("codeStep");
const successStep = document.getElementById("successStep");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const emailInput = document.getElementById("emailInput");
const codeInput = document.getElementById("codeInput");
const emailDisplay = document.getElementById("emailDisplay");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const verifyCodeBtn = document.getElementById("verifyCodeBtn");
const resendCodeBtn = document.getElementById("resendCodeBtn");

let currentEmail = "";

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Load saved email if exists
  const savedEmail = await api.getEmail();
  if (savedEmail) {
    emailInput.value = savedEmail;
  }

  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  sendCodeBtn.addEventListener("click", sendCode);
  verifyCodeBtn.addEventListener("click", verifyCode);
  resendCodeBtn.addEventListener("click", sendCode);

  // Enter key handlers
  emailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendCode();
  });

  codeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") verifyCode();
  });

  // Auto-format code input
  codeInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
  });
}

// Send OTP code
async function sendCode() {
  const email = emailInput.value.trim();

  if (!email || !email.includes("@")) {
    showError("Please enter a valid email address");
    return;
  }

  showLoading(true);
  clearError();

  try {
    // Check if user has premium first
    const { hasPremium } = await api.checkPremiumStatus(email);

    if (!hasPremium) {
      showError("No premium access found. Please purchase premium first.");
      showLoading(false);
      return;
    }

    // Send OTP
    await api.requestOTP(email);

    currentEmail = email;
    emailDisplay.textContent = email;

    // Move to code step
    emailStep.classList.add("hidden");
    codeStep.classList.remove("hidden");

    // Focus code input
    setTimeout(() => codeInput.focus(), 100);
  } catch (error) {
    showError(error.message || "Failed to send code");
  } finally {
    showLoading(false);
  }
}

// Verify OTP code
async function verifyCode() {
  const code = codeInput.value.trim();

  if (code.length !== 6) {
    showError("Please enter a 6-digit code");
    return;
  }

  showLoading(true);
  clearError();

  try {
    await api.login(currentEmail, code);

    // Show success
    codeStep.classList.add("hidden");
    successStep.classList.remove("hidden");

    // Close window after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    showError(error.message || "Invalid or expired code");
    codeInput.value = "";
    codeInput.focus();
  } finally {
    showLoading(false);
  }
}

// Show/hide loading
function showLoading(show) {
  if (show) {
    loading.classList.remove("hidden");
    sendCodeBtn.disabled = true;
    verifyCodeBtn.disabled = true;
  } else {
    loading.classList.add("hidden");
    sendCodeBtn.disabled = false;
    verifyCodeBtn.disabled = false;
  }
}

// Show error
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

// Clear error
function clearError() {
  errorMessage.classList.add("hidden");
}
```

---

## 🎨 Styles (styles.css)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 350px;
  min-height: 400px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    sans-serif;
  background: #f5f5f5;
}

.container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 24px;
  color: #333;
}

.language-selector select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.excuse-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.excuse-text {
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  text-align: center;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4caf50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #2196f3;
  color: white;
}

.btn-secondary:hover {
  background: #1976d2;
}

.btn-secondary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-link {
  background: none;
  border: none;
  color: #2196f3;
  text-decoration: underline;
  cursor: pointer;
  padding: 5px;
  font-size: 12px;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #ddd;
  font-size: 12px;
  color: #666;
}

.info-text {
  text-align: center;
  margin-bottom: 15px;
  color: #666;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 20px;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-message {
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  font-size: 13px;
}

.error-message.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef5350;
}

.error-message.info {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #42a5f5;
}

.success-message {
  color: #4caf50;
  font-size: 18px;
  text-align: center;
  margin-bottom: 10px;
}

.hidden {
  display: none !important;
}

/* Login page specific */
.login-container {
  width: 380px;
  padding: 30px;
}

.login-container h1 {
  margin-bottom: 20px;
  text-align: center;
}

.login-container input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 15px;
}

.login-container input:focus {
  outline: none;
  border-color: #4caf50;
}

.login-container p {
  margin-bottom: 15px;
  color: #666;
  text-align: center;
}
```

---

## 🔄 Background Service Worker (background.js)

```javascript
// Listen for extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log("SorryBut extension installed");
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openCheckout") {
    chrome.tabs.create({ url: request.url });
    sendResponse({ success: true });
  }

  return true;
});

// Handle authentication updates
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    if (changes.authToken) {
      console.log("Authentication status changed");
      // You can add notifications or badge updates here
    }
  }
});
```

---

## 📦 Complete Integration Example

### Full User Flow Implementation

```javascript
// Complete integration example showing all API interactions

class SorryButExtension {
  constructor() {
    this.api = api; // From client.js
    this.init();
  }

  async init() {
    // Check if user is authenticated
    const isAuth = await this.api.isAuthenticated();

    if (isAuth) {
      await this.loadPremiumContent();
    } else {
      await this.showWelcomeScreen();
    }
  }

  async showWelcomeScreen() {
    // Show options: Login or Purchase
    const hasAccount = confirm("Do you have a SorryBut Premium account?");

    if (hasAccount) {
      await this.handleLogin();
    } else {
      await this.handlePurchase();
    }
  }

  async handlePurchase() {
    const email = prompt("Enter your email:");

    if (!email) return;

    try {
      // Create checkout session
      const { checkoutUrl } = await this.api.createCheckout(email);

      // Open payment page
      window.open(checkoutUrl, "_blank");

      alert("After payment, return here and click Login");
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }

  async handleLogin() {
    const email = prompt("Enter your email:");

    if (!email) return;

    try {
      // Check premium status
      const { hasPremium } = await this.api.checkPremiumStatus(email);

      if (!hasPremium) {
        alert("No premium access. Please purchase first.");
        return;
      }

      // Request OTP
      await this.api.requestOTP(email);

      // Get code from user
      const code = prompt("Enter the code sent to your email:");

      if (!code) return;

      // Login
      await this.api.login(email, code);

      alert("Login successful!");

      // Load premium content
      await this.loadPremiumContent();
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  }

  async loadPremiumContent() {
    try {
      // Get user's preferred language
      const { preferredLanguage } = await chrome.storage.local.get([
        "preferredLanguage",
      ]);
      const lang = preferredLanguage || "en";

      // Load translations
      const { strings } = await this.api.getTranslations(lang);

      // Update UI with translations
      this.updateUITranslations(strings);

      // Generate first excuse
      await this.generateExcuse(lang);
    } catch (error) {
      console.error("Failed to load content:", error);

      // If token invalid, logout
      if (error.message.includes("token")) {
        await this.api.clearAuth();
        await this.showWelcomeScreen();
      }
    }
  }

  async generateExcuse(lang = "en") {
    try {
      const { reason } = await this.api.getRandomExcuse(lang);

      // Display excuse in UI
      this.displayExcuse(reason);
    } catch (error) {
      alert(`Failed to generate: ${error.message}`);
    }
  }

  updateUITranslations(strings) {
    // Update all UI elements with translated strings
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (strings[key]) {
        el.textContent = strings[key];
      }
    });
  }

  displayExcuse(excuse) {
    const excuseElement = document.getElementById("excuseText");
    if (excuseElement) {
      excuseElement.textContent = excuse;
    }
  }
}

// Initialize extension
const extension = new SorryButExtension();
```

---

## 🧪 Testing Your Extension

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your extension folder

### 2. Test Authentication Flow

```javascript
// In browser console
(async () => {
  // Test API client
  const testEmail = "test@example.com";

  // 1. Check premium status
  const status = await api.checkPremiumStatus(testEmail);
  console.log("Premium status:", status);

  // 2. Request OTP (if has premium)
  if (status.hasPremium) {
    await api.requestOTP(testEmail);
    console.log("OTP sent");

    // 3. Login (enter actual code)
    const code = prompt("Enter OTP code:");
    const result = await api.login(testEmail, code);
    console.log("Login result:", result);

    // 4. Get excuse
    const excuse = await api.getRandomExcuse("en");
    console.log("Excuse:", excuse.reason);
  }
})();
```

### 3. Test Error Handling

```javascript
// Test invalid token
await chrome.storage.local.set({ authToken: "invalid_token" });
const result = await api.verifyToken();
console.log("Token valid:", result); // Should be false

// Test rate limiting
for (let i = 0; i < 15; i++) {
  try {
    await api.getRandomExcuse();
  } catch (error) {
    console.log(`Request ${i}: ${error.message}`);
  }
}
```

---

## 🚀 Deployment Checklist

- [ ] Update `manifest.json` with correct API URL
- [ ] Add all required icons (16x16, 48x48, 128x128)
- [ ] Test all authentication flows
- [ ] Test all language options
- [ ] Test error handling
- [ ] Test clipboard functionality
- [ ] Verify rate limiting behavior
- [ ] Test on multiple screen sizes
- [ ] Prepare Chrome Web Store screenshots
- [ ] Write privacy policy
- [ ] Package extension as .zip

---

## 📊 API Rate Limits

Remember to handle these limits in your extension:

- `/auth/request-otp`: 5 requests per 15 min
- `/auth/login`: 5 requests per 15 min
- `/premium-reasons`: 30 requests per minute
- Other endpoints: 10 requests per 15 min

---

## 🔧 Troubleshooting

### Common Issues

**"Missing token" error**:

- Check if token is stored: `chrome.storage.local.get(['authToken'])`
- Verify token is being sent in Authorization header

**"Premium access required" error**:

- User hasn't completed payment
- Check premium status: `api.checkPremiumStatus(email)`

**CORS errors**:

- Ensure `https://api.mprnl.fr` is in `host_permissions` in manifest.json

**Rate limit errors**:

- Implement exponential backoff
- Cache responses when appropriate
- Show user-friendly message

---

## 📞 Support

- Backend API Docs: [API_USAGE.md](API_USAGE.md)
- Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Chrome Extension Docs: https://developer.chrome.com/docs/extensions/

---

**Happy Coding! 🎉**
