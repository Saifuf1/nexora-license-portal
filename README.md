# Nexora ERP — Cloud License Studio & AI Support Portal

> **Security Master Password**: `6969@Nkd`  
> **Cryptographic Engine**: Hardware-Locked HMAC-SHA256 (`NEXORA_ERP_ENTERPRISE_HMAC_MASTER_2026_KEY_FTA`)

---

## 🌟 Overview & Key Capabilities

1. **Custom Validity Duration**:
   - Issue keys for any duration: **10 Days**, **30 Days**, **90 Days**, **360 Days**, **365 Days (1 Year)**, or type any **custom number of days** (e.g. 45, 120, 500), or select **Lifetime Perpetual**.
   - Live expiration date calculation (`DD/MM/YYYY`) and cryptographic Unix timestamp encoding.

2. **Granular Feature Provisioning (Module Bitmasks)**:
   - Checkbox controls for individual modules:
     - 📱 **Android POS (PocketPOS / Queue Busting)** (`0x20`)
     - 📦 **Android PDA (Stock Taking & Variance Auditing)** (`0x02`)
     - 🛵 **Delivery Hub & Rider Tracking App** (`0x04`)
     - 🤖 **AI Purchase Bill Scanner & Repacking** (`0x08`)
     - 📊 **Executive AI Mobile App** (`0x10`)
     - 💬 **WhatsApp Statement & Ledger Engine** (`0x40`)
     - ☁️ **Multi-Branch Cloud Sync** (`0x80`)
     - 🖥️ **Base Supermarket POS Engine** (`0x01`)

3. **Active License & Device Roster Tracker**:
   - Tracks client name, branch, phone number (min 7 digits), and TRN.
   - Real-time validity countdown & expiring soon warnings (**< 30 Days** and **< 7 Days** alerts).
   - Tracks connected hardware stations (Master terminal, secondary POS lanes, Sunmi PDA scanners, Android tabs).
   - 1-Click Renew/Extend validity, WhatsApp Sharing, and JSON database backup/restore.

4. **Nexora AI Technical Support Chatbot**:
   - Comprehensive built-in technical guide:
     - Windows 10/11 Master Hub setup & auto-launch.
     - Port 8080 Windows Defender Firewall unblock command:
       `netsh advfirewall firewall add rule name="Nexora POS LAN Hub (Port 8080)" dir=in action=allow protocol=TCP localport=8080`
     - Android WiFi / Hotspot pairing with Master PC IP (`http://192.168.x.x:8080`).
     - ESC/POS 80mm thermal receipt printing, cash drawer kick, and barcode weight scales (`20AAAAAWWWWWX`).
     - Pure offline SQLite architecture (`nexa_retail.db`).

---

## 🚀 How to Host for Free (Zero Server Cost)

This portal is built as a self-contained Single-Page Application (SPA) using standard Web Crypto API, Tailwind CSS, and FontAwesome. It requires **zero backend servers or databases**, making it 100% free to host forever.

### Option 1: GitHub Pages (Recommended)
1. Create a new repository on GitHub (e.g. `nexora-license-portal`).
2. Upload the files inside `c:\NexaERP_Windows\nexora_license_portal\` (`index.html`).
3. In your GitHub repository:
   - Go to **Settings > Pages**.
   - Under **Branch**, select `main` / `root` and click **Save**.
4. In ~60 seconds, your portal is live at:
   `https://<your-username>.github.io/nexora-license-portal/`

### Option 2: Netlify (Instant 10-Second Drag & Drop)
1. Visit [https://app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop the `nexora_license_portal` folder into the browser window.
3. Your secure portal is deployed immediately with a free SSL certificate.

### Option 3: Cloudflare Pages / Vercel
1. Connect your GitHub repository to Cloudflare Pages or Vercel.
2. Select **Framework: None (Static HTML)** and click **Deploy**.

---

## 🔒 Security Gate & Access Control
- Access to the generator and roster is locked behind the master password:
  ```text
  6969@Nkd
  ```
- Sessions are protected via encrypted browser session tokens.
