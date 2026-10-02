/**
 * NEXORA ENTERPRISE CLOUD LICENSE MASTER
 * Apple iOS 18 Light Edition & Cryptography Core
 * (c) 2026 Nexora Enterprise Technologies. All Rights Reserved.
 */

const MASTER_SALT = 'NEXORA_ERP_ENTERPRISE_HMAC_MASTER_2026_KEY_FTA';
const DEFAULT_MASTER_PASSCODE = 'Nexa2026';
const STORAGE_KEY_PASSCODE = 'nexora_vault_master_passcode';
const STORAGE_KEY_REGISTRY = 'nexora_license_client_registry';

// State Variables
let currentSelectedTier = 'STD';
let currentSelectedDays = 365;
let currentCustomExpiry = null;
let lastGeneratedLicense = null;
let failedAttempts = 0;
let lockoutTimer = null;

// =============================================================================
// CRYPTOGRAPHIC CORE ENGINE (Web Crypto API & HMAC-SHA256)
// =============================================================================

async function computeHmacSha256(message, secret) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = enc.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return hashHex;
}

async function generateNexaLicenseKey({
  deviceId,
  tierCode,
  expiryDate,
  moduleBitmask = 0xFF
}) {
  const cleanDevId = deviceId.trim().toUpperCase();
  const devShort = cleanDevId.replace(/NX-|-/g, '').substring(0, 8);

  let expHex = 'FFFFFFFF';
  if (expiryDate instanceof Date && !isNaN(expiryDate.getTime())) {
    const epochSec = Math.round(expiryDate.getTime() / 1000);
    expHex = epochSec.toString(16).toUpperCase().padStart(8, '0');
  }

  // Exact 5-part format payload: deviceId##tierCode##expHex##devShort
  const payload = `${cleanDevId}##${tierCode}##${expHex}##${devShort}`;
  const fullSignature = await computeHmacSha256(payload, MASTER_SALT);
  const sig8 = fullSignature.substring(0, 8).toUpperCase();

  const licenseKey = `NEXA-${tierCode}-${expHex}-${devShort}-${sig8}`;

  return {
    licenseKey,
    payload,
    signature: sig8,
    fullSignature,
    expHex,
    devShort,
    expiryDate,
    tierCode,
    moduleBitmask
  };
}

async function validateLicenseKey(key, deviceId) {
  const cleanKey = key.trim().toUpperCase().replace(/\s+/g, '');
  const cleanDevId = deviceId.trim().toUpperCase().replace(/\s+/g, '');

  const parts = cleanKey.split('-');
  if (parts.length < 4 || parts[0] !== 'NEXA') {
    return { isValid: false, message: 'Invalid key structure. Must start with NEXA-' };
  }

  const tierCode = parts[1];
  let expiryDate = null;
  let devShort = '';
  let providedSig = '';
  let payloadForHmac = '';
  let isExpired = false;

  if (parts.length === 6) {
    const expHex = parts[2];
    const modHex = parts[3];
    devShort = parts[4];
    providedSig = parts[5];
    if (expHex !== 'FFFFFFFF' && expHex !== 'LIFETIME') {
      const epoch = parseInt(expHex, 16);
      expiryDate = new Date(epoch * 1000);
      if (new Date() > expiryDate) isExpired = true;
    }
    payloadForHmac = `${cleanDevId}##${tierCode}##${expHex}##${modHex}##${devShort}`;
  } else if (parts.length === 5) {
    const expHex = parts[2];
    devShort = parts[3];
    providedSig = parts[4];
    if (expHex !== 'FFFFFFFF' && expHex !== 'LIFETIME') {
      const epoch = parseInt(expHex, 16);
      expiryDate = new Date(epoch * 1000);
      if (new Date() > expiryDate) isExpired = true;
    }
    payloadForHmac = `${cleanDevId}##${tierCode}##${expHex}##${devShort}`;
  } else {
    devShort = parts[2];
    providedSig = parts[3];
    payloadForHmac = `${cleanDevId}##${tierCode}##${devShort}`;
  }

  const expectedFullSig = await computeHmacSha256(payloadForHmac, MASTER_SALT);
  const expectedSig = expectedFullSig.substring(0, 8).toUpperCase();

  const fallbackPayload = parts.slice(1, parts.length - 1).join('-');
  const fallbackFull = await computeHmacSha256(`${cleanDevId}-${fallbackPayload}`, MASTER_SALT);
  const fallbackSig = fallbackFull.substring(0, 8).toUpperCase();

  const isSigValid = (providedSig === expectedSig || providedSig === fallbackSig);

  return {
    isValid: isSigValid && !isExpired,
    isSignatureValid: isSigValid,
    isExpired,
    tierCode,
    expiryDate,
    devShort,
    expectedSig,
    providedSig,
    message: !isSigValid
      ? 'Cryptographic signature mismatch! Key is locked to a different PC.'
      : (isExpired ? `Key has expired on ${expiryDate.toLocaleDateString()}` : 'Key is authentic and cryptographically valid!')
  };
}

// =============================================================================
// macOS / iOS 18 LOCK SCREEN AUTHENTICATION (8-Character Passcode)
// =============================================================================

function handlePasscodeSubmit(e) {
  e.preventDefault();
  if (lockoutTimer) {
    showIosToast('Security lockout active. Please wait.');
    return;
  }

  const input = document.getElementById('vaultPasswordInput');
  const enteredPasscode = input.value.trim();
  const storedPasscode = localStorage.getItem(STORAGE_KEY_PASSCODE) || DEFAULT_MASTER_PASSCODE;

  if (enteredPasscode === storedPasscode) {
    failedAttempts = 0;
    document.getElementById('lockErrorMsg').textContent = '';
    document.getElementById('authGate').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    sessionStorage.setItem('nexora_vault_authenticated', 'true');
    input.value = '';
    initPortalData();
    showIosToast('Security Vault Unlocked');
  } else {
    failedAttempts++;
    const card = document.getElementById('lockCard');
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 450);

    input.value = '';
    input.focus();

    if (failedAttempts >= 5) {
      triggerLockout(30);
    } else {
      document.getElementById('lockErrorMsg').textContent = `Incorrect Passcode (${failedAttempts}/5)`;
    }
  }
}

function triggerLockout(seconds) {
  const btn = document.getElementById('btnSubmitLock');
  const input = document.getElementById('vaultPasswordInput');
  btn.disabled = true;
  input.disabled = true;
  let remaining = seconds;
  document.getElementById('lockErrorMsg').textContent = `Security Lockout. Retry in ${remaining}s`;

  lockoutTimer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(lockoutTimer);
      lockoutTimer = null;
      btn.disabled = false;
      input.disabled = false;
      failedAttempts = 0;
      document.getElementById('lockErrorMsg').textContent = '';
      input.focus();
    } else {
      document.getElementById('lockErrorMsg').textContent = `Security Lockout. Retry in ${remaining}s`;
    }
  }, 1000);
}

function togglePasswordVisibility() {
  const input = document.getElementById('vaultPasswordInput');
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

function lockVault() {
  sessionStorage.removeItem('nexora_vault_authenticated');
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('authGate').classList.remove('hidden');
  document.getElementById('vaultPasswordInput').value = '';
  document.getElementById('lockErrorMsg').textContent = '';
  showIosToast('Vault Locked');
}

// =============================================================================
// FORM HANDLERS & TIER SELECTORS
// =============================================================================

function selectIosTier(tier, element) {
  currentSelectedTier = tier;
  document.querySelectorAll('.tier-pill-opt').forEach(opt => opt.classList.remove('active'));
  element.classList.add('active');
}

function setIosDuration(days, element) {
  currentSelectedDays = days;
  currentCustomExpiry = null;
  document.querySelectorAll('.ios-duration-chips .d-chip').forEach(c => c.classList.remove('active'));
  element.classList.add('active');
  document.getElementById('customExpiryDateIos').classList.add('hidden');
  updateExpiryCalculationLabel();
}

function showCustomDateIos(element) {
  document.querySelectorAll('.ios-duration-chips .d-chip').forEach(c => c.classList.remove('active'));
  element.classList.add('active');
  const picker = document.getElementById('customExpiryDateIos');
  picker.classList.remove('hidden');
  picker.focus();
}

function onCustomDateSelectedIos() {
  const picker = document.getElementById('customExpiryDateIos');
  if (picker.value) {
    currentCustomExpiry = new Date(picker.value + 'T23:59:59');
    currentSelectedDays = -1;
    updateExpiryCalculationLabel();
  }
}

function updateExpiryCalculationLabel() {
  const label = document.getElementById('calcExpiryLabel');
  if (!label) return;
  if (currentSelectedDays === 0) {
    label.textContent = 'Lifetime Perpetual (No Expiry)';
  } else if (currentCustomExpiry) {
    label.textContent = currentCustomExpiry.toDateString();
  } else {
    const exp = new Date();
    exp.setDate(exp.getDate() + currentSelectedDays);
    label.textContent = exp.toDateString();
  }
}

function formatHardwareId(input) {
  let val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (val.startsWith('NX')) {
    val = val.substring(2);
  }
  let formatted = 'NX';
  for (let i = 0; i < val.length && i < 16; i++) {
    if (i % 4 === 0) formatted += '-';
    formatted += val[i];
  }
  input.value = formatted;
}

async function pasteHardwareId() {
  try {
    const text = await navigator.clipboard.readText();
    const input = document.getElementById('deviceId');
    input.value = text.trim();
    formatHardwareId(input);
    showIosToast('Pasted Hardware Device ID');
  } catch (err) {
    showIosToast('Clipboard permission needed');
  }
}

// =============================================================================
// KEY GENERATION & TITANIUM PASS RENDERER
// =============================================================================

async function handleGenerateKey(e) {
  e.preventDefault();

  const orgName = document.getElementById('orgName').value.trim();
  const trn = document.getElementById('trnNumber').value.trim();
  const deviceId = document.getElementById('deviceId').value.trim().toUpperCase();
  const remarks = document.getElementById('clientRemarks').value.trim();
  const backupUrl = document.getElementById('clientBackupUrl').value.trim();

  if (!deviceId.startsWith('NX-') || deviceId.length < 18) {
    showIosToast('Invalid Device ID (Expected NX-XXXX-XXXX-XXXX-XXXX)');
    return;
  }

  let expiryDate = null;
  if (currentSelectedDays === 0) {
    expiryDate = null;
  } else if (currentCustomExpiry) {
    expiryDate = currentCustomExpiry;
  } else {
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + currentSelectedDays);
  }

  // Module Bitmask Calculation
  let bitmask = 0x01; // Base Core
  if (document.getElementById('mod_android_app').checked) bitmask |= 0x80; // Android Mobile ERP Suite
  if (document.getElementById('mod_ai').checked) bitmask |= 0x08; // AI Purchase OCR
  if (document.getElementById('mod_delivery').checked) bitmask |= 0x04; // Delivery Fleet & WhatsApp
  if (document.getElementById('mod_pda').checked) bitmask |= 0x02; // PDA Stock Auditing
  if (document.getElementById('mod_queue').checked) bitmask |= 0x20; // Queue-Busting POS

  const result = await generateNexaLicenseKey({
    deviceId,
    tierCode: currentSelectedTier,
    expiryDate,
    moduleBitmask: bitmask
  });

  lastGeneratedLicense = {
    id: 'lic_' + Date.now(),
    orgName,
    trn,
    deviceId,
    tierCode: currentSelectedTier,
    tierName: getTierTitle(currentSelectedTier),
    licenseKey: result.licenseKey,
    expiryDate: expiryDate ? expiryDate.toISOString() : null,
    formattedExpiry: expiryDate ? expiryDate.toLocaleDateString() : 'Lifetime Perpetual',
    signature: result.signature,
    bitmask,
    remarks: remarks || '',
    backupUrl: backupUrl || '',
    hasAndroidApp: (bitmask & 0x80) !== 0,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  };

  // Render Titanium Pass
  document.getElementById('emptyResultBox').classList.add('hidden');
  document.getElementById('generatedPassBox').classList.remove('hidden');

  document.getElementById('passLicenseKey').textContent = result.licenseKey;
  document.getElementById('passOrgName').textContent = orgName;
  document.getElementById('passDeviceId').textContent = deviceId;
  document.getElementById('passTierBadge').textContent = getTierTitle(currentSelectedTier).toUpperCase();
  document.getElementById('passExpiry').textContent = lastGeneratedLicense.formattedExpiry;
  document.getElementById('passSignature').textContent = `HMAC: ${result.signature} (VALID)`;

  // Remarks Banner
  const remarksStrip = document.getElementById('passRemarksStrip');
  const remarksText = document.getElementById('passRemarksText');
  if (remarks) {
    remarksStrip.classList.remove('hidden');
    remarksText.textContent = remarks;
  } else {
    remarksStrip.classList.add('hidden');
  }

  // Generate QR Code
  const qrCanvas = document.getElementById('passQrCanvas');
  const qrPayload = JSON.stringify({
    org: orgName,
    dev: deviceId,
    key: result.licenseKey,
    exp: result.expHex,
    tier: currentSelectedTier,
    android_app: (bitmask & 0x80) !== 0,
    remarks: remarks || undefined
  });

  if (window.QRCode) {
    QRCode.toCanvas(qrCanvas, qrPayload, {
      width: 110,
      margin: 1,
      color: { dark: '#1C1C1E', light: '#FFFFFF' }
    });
  }

  saveToRegistry(lastGeneratedLicense);
  showIosToast('License Key Successfully Issued');
}

function getTierTitle(code) {
  if (code === 'PRO') return 'Supermarket Pro';
  if (code === 'ENT') return 'Enterprise Hypermarket';
  return 'Standard POS';
}

function copyGeneratedKey() {
  if (!lastGeneratedLicense) return;
  navigator.clipboard.writeText(lastGeneratedLicense.licenseKey);
  const label = document.getElementById('copyBtnLabel');
  label.textContent = 'Copied to Clipboard!';
  setTimeout(() => { label.textContent = 'Copy License Key'; }, 2000);
  showIosToast('Copied License Key');
}

function downloadCertificateFile() {
  if (!lastGeneratedLicense) return;
  const certData = {
    schema: 'https://nexoraerp.com/schemas/license-v1.json',
    organization: lastGeneratedLicense.orgName,
    tax_registration: lastGeneratedLicense.trn,
    hardware_device_id: lastGeneratedLicense.deviceId,
    tier: lastGeneratedLicense.tierCode,
    license_key: lastGeneratedLicense.licenseKey,
    expiry_date: lastGeneratedLicense.expiryDate,
    hmac_signature: lastGeneratedLicense.signature,
    android_mobile_erp: lastGeneratedLicense.hasAndroidApp,
    remarks: lastGeneratedLicense.remarks,
    cloud_backup_vault: lastGeneratedLicense.backupUrl,
    issued_at: lastGeneratedLicense.createdAt,
    issuer: 'Nexora Enterprise Cloud Engine'
  };

  const blob = new Blob([JSON.stringify(certData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NEXORA_CERT_${lastGeneratedLicense.orgName.replace(/[^A-Za-z0-9]/g, '_')}.nexc`;
  a.click();
  URL.revokeObjectURL(url);
  showIosToast('Certificate Downloaded (.nexc)');
}

function shareViaWhatsApp() {
  if (!lastGeneratedLicense) return;
  let msg = `*NEXORA ENTERPRISE ACTIVATION CERTIFICATE*\n\n` +
    `🏢 *Client:* ${lastGeneratedLicense.orgName}\n` +
    `💻 *Hardware ID:* ${lastGeneratedLicense.deviceId}\n` +
    `🛡️ *License Tier:* ${lastGeneratedLicense.tierName}\n` +
    `📅 *Validity:* ${lastGeneratedLicense.formattedExpiry}\n`;

  if (lastGeneratedLicense.hasAndroidApp) {
    msg += `📱 *Android Mobile ERP:* Enabled & Connected\n`;
  }
  if (lastGeneratedLicense.remarks) {
    msg += `📝 *Notes/Features:* ${lastGeneratedLicense.remarks}\n`;
  }

  msg += `\n🔑 *License Key:*\n\`${lastGeneratedLicense.licenseKey}\`\n\n` +
    `*Activation Instructions:*\n` +
    `1. Open Nexora POS on your Windows terminal.\n` +
    `2. Enter your Organization Name & paste this License Key.\n` +
    `3. Click *Activate Software*.\n\n` +
    `Nexora Enterprise Cloud Support`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// =============================================================================
// KEY INSPECTOR
// =============================================================================

async function handleInspectKey() {
  const key = document.getElementById('inspectKey').value.trim();
  const devId = document.getElementById('inspectDeviceId').value.trim();

  if (!key || !devId) {
    showIosToast('Enter both License Key and Device ID');
    return;
  }

  const result = await validateLicenseKey(key, devId);
  const box = document.getElementById('inspectResultBox');
  box.classList.remove('hidden');

  if (result.isValid) {
    box.innerHTML = `
      <div style="color: var(--apple-green); font-weight: 700; margin-bottom: 10px;">
        ✓ 100% AUTHENTIC & CRYPTOGRAPHICALLY VALID
      </div>
      <div class="ios-cell-static"><span>Tier:</span> <strong>${result.tierCode}</strong></div>
      <div class="ios-cell-static"><span>Expiration:</span> <strong>${result.expiryDate ? result.expiryDate.toLocaleDateString() : 'Lifetime Perpetual'}</strong></div>
      <div class="ios-cell-static"><span>HMAC Verification:</span> <code style="color: var(--apple-green);">${result.providedSig} (MATCH)</code></div>
    `;
  } else {
    box.innerHTML = `
      <div style="color: var(--apple-red); font-weight: 700; margin-bottom: 10px;">
        ✕ INVALID OR TAMPERED KEY
      </div>
      <div class="ios-cell-static"><span>Diagnostic:</span> <strong style="color: var(--apple-red);">${result.message}</strong></div>
      <div class="ios-cell-static"><span>Expected HMAC:</span> <code>${result.expectedSig}</code></div>
      <div class="ios-cell-static"><span>Provided HMAC:</span> <code>${result.providedSig}</code></div>
    `;
  }
}

// =============================================================================
// REGISTRY & CLIENT DATABASE (WITH REMARKS & CLOUD BACKUP VAULT ACCESS)
// =============================================================================

function getRegistry() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTRY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveToRegistry(item) {
  const registry = getRegistry();
  const index = registry.findIndex(r => r.deviceId === item.deviceId && r.licenseKey === item.licenseKey);
  if (index >= 0) {
    registry[index] = item;
  } else {
    registry.unshift(item);
  }
  localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(registry));
  updateRegistryCountPill();
  renderRegistryTable();
  renderQuickBackupList();
}

function updateRegistryCountPill() {
  const pill = document.getElementById('registryCountPill');
  if (pill) pill.textContent = getRegistry().length;
}

function renderRegistryTable() {
  const tbody = document.getElementById('registryTableBody');
  if (!tbody) return;

  const registry = getRegistry();
  const search = (document.getElementById('registrySearch')?.value || '').toLowerCase();

  const filtered = registry.filter(item => {
    return item.orgName.toLowerCase().includes(search) ||
      item.deviceId.toLowerCase().includes(search) ||
      item.licenseKey.toLowerCase().includes(search) ||
      (item.remarks && item.remarks.toLowerCase().includes(search)) ||
      (item.trn && item.trn.toLowerCase().includes(search));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-tertiary);">No client records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td>
        <strong style="color: var(--text-primary);">${escapeHtml(item.orgName)}</strong>
        <div style="font-size: 0.7rem; color: var(--text-secondary);">${item.trn ? 'TRN: ' + escapeHtml(item.trn) : 'Standard Client'}</div>
      </td>
      <td><code>${escapeHtml(item.deviceId)}</code></td>
      <td>
        <span class="pill-badge">${escapeHtml(item.tierCode)}</span>
        ${item.hasAndroidApp ? '<span class="pill-badge" style="background: rgba(52, 199, 89, 0.15); color: var(--apple-green); margin-left: 2px;">📱 Android</span>' : ''}
      </td>
      <td>
        <div class="remarks-text-cell">
          ${item.remarks ? escapeHtml(item.remarks) : '<span style="color: var(--text-tertiary); font-style: italic;">No notes</span>'}
        </div>
      </td>
      <td>
        ${item.backupUrl ? `
          <a href="${escapeHtml(item.backupUrl)}" target="_blank" class="backup-btn-link" title="Open Google Drive / Backup Vault">
            ☁️ Open Vault
          </a>
        ` : '<span style="color: var(--text-tertiary); font-size: 0.72rem;">No Link</span>'}
      </td>
      <td>${escapeHtml(item.formattedExpiry)}</td>
      <td class="text-right">
        <button class="btn-ios-secondary" onclick="openEditModal('${item.id}')" title="Edit Remarks & Backup URL">Edit</button>
        <button class="btn-ios-secondary" onclick="copyTableKey('${escapeHtml(item.licenseKey)}')">Copy</button>
        <button class="btn-ios-secondary" onclick="deleteRegistryItem('${item.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderQuickBackupList() {
  const container = document.getElementById('quickBackupList');
  if (!container) return;

  const registry = getRegistry();
  const withBackups = registry.filter(r => r.backupUrl && r.backupUrl.trim().length > 0);

  if (withBackups.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 0.85rem;">
        No client backup links configured yet. You can add a Google Drive or Cloud Backup link during key generation or by clicking "Edit" in the Registry tab.
      </div>
    `;
    return;
  }

  container.innerHTML = withBackups.map(item => `
    <div class="quick-backup-row">
      <div>
        <strong>${escapeHtml(item.orgName)}</strong>
        <small>Device: ${escapeHtml(item.deviceId)} • Tier: ${escapeHtml(item.tierCode)}</small>
      </div>
      <a href="${escapeHtml(item.backupUrl)}" target="_blank" class="btn-ios-primary" style="width: auto; padding: 8px 16px; font-size: 0.8rem;">
        ☁️ Access Cloud Backup
      </a>
    </div>
  `).join('');
}

function openEditModal(id) {
  const registry = getRegistry();
  const item = registry.find(r => r.id === id);
  if (!item) return;

  document.getElementById('editClientId').value = item.id;
  document.getElementById('editClientOrg').value = item.orgName || '';
  document.getElementById('editClientTrn').value = item.trn || '';
  document.getElementById('editClientRemarks').value = item.remarks || '';
  document.getElementById('editClientBackupUrl').value = item.backupUrl || '';

  document.getElementById('editClientModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editClientModal').classList.add('hidden');
}

function saveClientEdits(e) {
  e.preventDefault();
  const id = document.getElementById('editClientId').value;
  const org = document.getElementById('editClientOrg').value.trim();
  const trn = document.getElementById('editClientTrn').value.trim();
  const remarks = document.getElementById('editClientRemarks').value.trim();
  const backupUrl = document.getElementById('editClientBackupUrl').value.trim();

  let registry = getRegistry();
  const index = registry.findIndex(r => r.id === id);
  if (index >= 0) {
    registry[index].orgName = org;
    registry[index].trn = trn;
    registry[index].remarks = remarks;
    registry[index].backupUrl = backupUrl;

    localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(registry));
    renderRegistryTable();
    renderQuickBackupList();
    closeEditModal();
    showIosToast('Client Record Updated Successfully');
  }
}

function copyTableKey(key) {
  navigator.clipboard.writeText(key);
  showIosToast('Copied License Key');
}

function deleteRegistryItem(id) {
  if (!confirm('Remove this client license record?')) return;
  let registry = getRegistry().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(registry));
  updateRegistryCountPill();
  renderRegistryTable();
  renderQuickBackupList();
  showIosToast('Record Removed');
}

function exportRegistryJson() {
  const registry = getRegistry();
  const blob = new Blob([JSON.stringify(registry, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NEXORA_REGISTRY_BACKUP_${new Date().toISOString().substring(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showIosToast('Backup Exported');
}

function triggerImportJson() {
  document.getElementById('importFileInput').click();
}

function handleImportJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(data));
        updateRegistryCountPill();
        renderRegistryTable();
        renderQuickBackupList();
        showIosToast(`Imported ${data.length} records`);
      } else {
        showIosToast('Invalid backup format');
      }
    } catch (_) {
      showIosToast('Corrupt JSON file');
    }
  };
  reader.readAsText(file);
}

// =============================================================================
// SETTINGS & PASSCODE UPDATE (8+ Chars Alphanumeric)
// =============================================================================

function handleChangeMasterPasscode(e) {
  e.preventDefault();
  const curr = document.getElementById('currentPasscode').value.trim();
  const next = document.getElementById('newPasscode').value.trim();
  const confirm = document.getElementById('confirmNewPasscode').value.trim();

  const stored = localStorage.getItem(STORAGE_KEY_PASSCODE) || DEFAULT_MASTER_PASSCODE;

  if (curr !== stored) {
    showIosToast('Current Passcode Incorrect');
    return;
  }

  if (next !== confirm) {
    showIosToast('Passcodes do not match');
    return;
  }

  const hasLetter = /[a-zA-Z]/.test(next);
  const hasNumber = /[0-9]/.test(next);

  if (next.length < 8 || !hasLetter || !hasNumber) {
    showIosToast('Passcode must be at least 8 characters with letters and numbers');
    return;
  }

  localStorage.setItem(STORAGE_KEY_PASSCODE, next);
  document.getElementById('currentPasscode').value = '';
  document.getElementById('newPasscode').value = '';
  document.getElementById('confirmNewPasscode').value = '';
  showIosToast('Passcode Updated Successfully');
}

function handleWipeVaultData() {
  if (!confirm('Erase all client records and reset passcode?')) return;
  localStorage.removeItem(STORAGE_KEY_REGISTRY);
  localStorage.removeItem(STORAGE_KEY_PASSCODE);
  updateRegistryCountPill();
  renderRegistryTable();
  renderQuickBackupList();
  showIosToast('Vault Erased & Reset');
}

// =============================================================================
// NAVIGATION & MODALS
// =============================================================================

function switchIosTab(tabId, element) {
  document.querySelectorAll('.seg-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.ios-tab-view').forEach(view => view.classList.remove('active'));

  element.classList.add('active');
  const targetView = document.getElementById(`tab-${tabId}`);
  if (targetView) targetView.classList.add('active');

  if (tabId === 'registry') {
    renderRegistryTable();
  } else if (tabId === 'backups') {
    renderQuickBackupList();
  }
}

function openHardwareGuide() {
  document.getElementById('hwModal').classList.remove('hidden');
}

function closeHardwareGuide() {
  document.getElementById('hwModal').classList.add('hidden');
}

function showIosToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'ios-toast';
  toast.innerHTML = `<span>●</span> <span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initPortalData() {
  updateExpiryCalculationLabel();
  updateRegistryCountPill();
  renderRegistryTable();
  renderQuickBackupList();
}

window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('nexora_vault_authenticated') === 'true') {
    document.getElementById('authGate').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    initPortalData();
  }
});
