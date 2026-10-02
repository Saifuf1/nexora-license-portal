# 🛡️ Nexora Cloud License Master

> **Enterprise-Grade Cryptographic License Key Generator & Fleet Management Console**  
> Designed for **Nexora ERP & POS** ecosystem.

![Nexora License Master](https://img.shields.io/badge/Security-HMAC--SHA256-10b981?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Deploy-GitHub_Pages_%7C_Vercel-06b6d4?style=for-the-badge)
![Zero Trust](https://img.shields.io/badge/Zero_Trust-Client_Side_Crypto-8b5cf6?style=for-the-badge)

---

## 🌟 Key Features

- 🔐 **High-End Zero-Trust Security Gate**: Protected by Master PIN authentication with session brute-force lockout guard and auto-locking vault.
- ⚡ **100% Deterministic Cryptographic Key Engine**: Generates genuine `NEXA-{TIER}-{EXPIRY_HEX}-{DEV_SHORT}-{SIG}` activation keys matching the Dart `LicensingService` core in Nexora POS.
- 🔍 **Real-Time Key Inspector & Diagnostics**: Instant cryptographic validation, expiration checks, and tamper detection without contacting external servers.
- 📱 **QR Code Activation**: Instant mobile / PDA camera scan payload for fast field activations.
- 📜 **Downloadable Activation Certificates (`.nexc`)**: Signed JSON certificate files for one-click import into Nexora POS.
- 💬 **One-Click WhatsApp Client Dispatch**: Auto-formats a professional message with key, validity period, and activation steps.
- 📋 **Encrypted Client Registry Database**: Search, filter by tier, extend subscriptions, export/import JSON backups.
- 🌐 **Fully Responsive Cyber-Emerald HUD**: Flawless experience across iPhones, Android smartphones, tablets, and desktop workstations.
- 🚀 **Zero-Dependency Static Hostable**: Works on **GitHub Pages**, **Vercel**, **Netlify**, or as an offline PWA on any browser!

---

## 🔑 Cryptographic Architecture

The generator implements FIPS 180-4 standard **HMAC-SHA256** hardware fingerprint binding:

$$\text{Payload} = \text{HardwareDeviceId} \parallel \text{"\#\#"} \parallel \text{TierCode} \parallel \text{"\#\#"} \parallel \text{ExpiryHex} \parallel \text{"\#\#"} \parallel \text{DevShort}$$

$$\text{Signature} = \operatorname{HMAC-SHA256}(\text{Payload}, \text{MasterSalt})_{[0..8]}$$

### License Key Format:
```
NEXA-STD-679D6B80-A1B2C3D4-8F2E3A1B
 │    │       │        │        │
 │    │       │        │        └─► 8-Hex Cryptographic HMAC Signature
 │    │       │        └──────────► 8-Hex Machine Fingerprint Hash
 │    │       └───────────────────► Hex Unix Timestamp Expiry (or FFFFFFFF for Lifetime)
 │    └───────────────────────────► License Tier (STD = 2 Lanes, PRO = 5 Lanes, ENT = Unlimited)
 └────────────────────────────────► Ecosystem Prefix
```

---

## 🚀 Instant Deployment Guide

### Option 1: GitHub Pages (Recommended - 100% Free & Fast)
1. Push this repository to GitHub.
2. Go to your repository on GitHub: **Settings** > **Pages**.
3. Under **Branch**, select `main` and root `/`, then click **Save**.
4. Your online portal will be live at `https://<your-username>.github.io/<repo-name>/`.

### Option 2: Vercel / Netlify
1. Import repository on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Deploy with zero configuration (static site).

---

## 🔒 Security Best Practices

1. **Change Default Master PIN**: The default PIN is `7860`. Go to **Security & Vault** tab inside the portal to set your custom private PIN immediately.
2. **Never Expose Private Repositories Publicly**: If hosting on GitHub, keep the repository **Private** or enable GitHub Pages with authenticated access if using enterprise plans.
3. **Hardware Fingerprint**: Hardware Device IDs always start with `NX-` and bind the license directly to the cashier's motherboard/CPU hash, preventing unauthorized duplication.

---

© 2026 **Nexora Enterprise Technologies**. All Rights Reserved.
