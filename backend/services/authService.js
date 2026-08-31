const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Ruta del archivo de configuración segura en el directorio de datos del usuario.
function settingsPath() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'settings.json');
  } catch (e) {
    return path.join(__dirname, '../../data/test_db/settings.json');
  }
}

function readSettings() {
  const file = settingsPath();
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return {}; }
}

function writeSettings(data) {
  const file = settingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  // scrypt: seguro y nativo de Node (sin dependencias externas).
  const derived = crypto.scryptSync(password, salt, 64);
  return derived.toString('hex');
}

function generateCode() {
  // Código de recuperación legible (ej: PRISMA-XXXX-XXXX).
  const part = () => crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PRISMA-${part()}-${part()}`;
}

function hasPassword() {
  const settings = readSettings();
  return Boolean(settings.auth && settings.auth.salt && settings.auth.passwordHash);
}

// Configura la contraseña por primera vez y devuelve el código de recuperación.
function setupPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const recoveryCode = generateCode();
  const recoveryHash = hashPassword(recoveryCode, salt);
  const settings = readSettings();
  settings.auth = { salt, passwordHash, recoveryHash };
  writeSettings(settings);
  return { success: true, recoveryCode };
}

function verifyPassword(password) {
  const settings = readSettings();
  const auth = settings.auth;
  if (!auth) return { success: false, error: 'No hay contraseña configurada.' };
  const hash = hashPassword(password, auth.salt);
  const ok = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(auth.passwordHash, 'hex'));
  return { success: ok, recoveryCode: null };
}

function verifyRecoveryCode(code) {
  const settings = readSettings();
  const auth = settings.auth;
  if (!auth) return { success: false, error: 'No hay contraseña configurada.' };
  const hash = hashPassword(String(code).trim(), auth.salt);
  const ok = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(auth.recoveryHash, 'hex'));
  return { success: ok };
}

function resetPassword(newPassword) {
  // Solo se llama después de validar el código de recuperación.
  const settings = readSettings();
  if (!settings.auth) return { success: false, error: 'No hay contraseña configurada.' };
  const salt = crypto.randomBytes(16).toString('hex');
  settings.auth.salt = salt;
  settings.auth.passwordHash = hashPassword(newPassword, salt);
  settings.auth.recoveryHash = hashPassword(settings.auth.recoveryCode || generateCode(), salt);
  writeSettings(settings);
  return { success: true };
}

// Cifrado / descifrado de secretos (API keys) con clave derivada de la contraseña.
function deriveKey(password) {
  return crypto.scryptSync(password, 'prisma-secrets-salt', 32);
}

function encryptSecret(value, password) {
  const key = deriveKey(password);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptSecret(payload, password) {
  try {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const key = deriveKey(password);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (e) {
    return '';
  }
}

function saveSecrets(secrets, password) {
  const settings = readSettings();
  settings.secrets = {};
  for (const [key, value] of Object.entries(secrets || {})) {
    if (value) settings.secrets[key] = encryptSecret(value, password);
  }
  writeSettings(settings);
  return { success: true };
}

function getSecrets(password) {
  const settings = readSettings();
  const secrets = {};
  for (const [key, value] of Object.entries(settings.secrets || {})) {
    secrets[key] = value ? decryptSecret(value, password) : '';
  }
  return secrets;
}

module.exports = {
  hasPassword,
  setupPassword,
  verifyPassword,
  verifyRecoveryCode,
  resetPassword,
  saveSecrets,
  getSecrets
};
