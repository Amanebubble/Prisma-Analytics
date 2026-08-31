const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function dataDir() {
  try { const { app } = require('electron'); return app.getPath('userData'); }
  catch (e) { return path.join(__dirname, '../../data/test_db'); }
}
function sqlitePath() { return path.join(dataDir(), 'data', 'prisma.sqlite'); }
function settingsPath() { return path.join(dataDir(), 'settings.json'); }
function deriveKey(password) { return crypto.scryptSync(String(password), 'prisma-backup-salt', 32); }

// Crea un contenedor cifrado AES-256-GCM con la BD + configuración.
function createBackup(password, destPath) {
  const dbBuffer = fs.readFileSync(sqlitePath());
  const settingsBuffer = fs.existsSync(settingsPath()) ? fs.readFileSync(settingsPath()) : Buffer.from('{}');
  const payload = JSON.stringify({
    version: 1,
    createdAt: new Date().toISOString(),
    prisma: dbBuffer.toString('base64'),
    settings: settingsBuffer.toString('base64')
  });
  const key = deriveKey(password);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  fs.writeFileSync(destPath, Buffer.concat([iv, tag, encrypted]));
  return { success: true, path: destPath };
}

// Descifra y restaura la BD + configuración desde un backup.
function importBackup(filePath, password) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 28) throw new Error('El archivo no es una copia de seguridad válida.');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = deriveKey(password);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let payloadText;
  try {
    payloadText = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (e) {
    throw new Error('Contraseña incorrecta o archivo dañado.');
  }
  const payload = JSON.parse(payloadText);
  fs.mkdirSync(path.dirname(sqlitePath()), { recursive: true });
  fs.writeFileSync(sqlitePath(), Buffer.from(payload.prisma, 'base64'));
  fs.writeFileSync(settingsPath(), Buffer.from(payload.settings, 'base64'));
  return { success: true, version: payload.version, createdAt: payload.createdAt };
}

module.exports = { createBackup, importBackup, dataDir };
