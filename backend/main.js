require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let dictamenWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Prisma Analytics',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity in this initial phase
      enableRemoteModule: true
    }
  });

  if (isDev) {
    // In development mode, load the Vite dev server URL
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Consola web desactivada por defecto
  } else {
    // In production, load the built React app
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function openDictamenWindow(opinionKey, clientId, periodYear, periodMonth, company) {
  // Evitar abrir varias ventanas del editor al mismo tiempo.
  if (dictamenWindow && !dictamenWindow.isDestroyed()) {
    dictamenWindow.focus();
    return true;
  }
  const query = `opinionKey=${encodeURIComponent(opinionKey)}&clientId=${clientId}&periodYear=${periodYear}&periodMonth=${periodMonth}&company=${encodeURIComponent(company || '')}`;
  dictamenWindow = new BrowserWindow({
    width: 1280,
    height: 920,
    title: 'Editor de Dictamen — Prisma Analytics',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  if (isDev) {
    dictamenWindow.loadURL(`http://localhost:5173/#dictamen?${query}`);
  } else {
    dictamenWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'), { hash: `dictamen?${query}` });
  }
  dictamenWindow.on('closed', () => { dictamenWindow = null; });
  return true;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Importar base de datos y servicios (esto inicializa la DB)
require('./database/db');
const clientService = require('./services/clientService');
const ingestService = require('./services/ingestService');
const financeService = require('./services/financeService');
const crmService = require('./services/crmService');
const reportService = require('./services/reportService');
const ivaService = require('./services/ivaService');
const ratioService = require('./services/ratioService');
const auditService = require('./services/auditService');
const bankService = require('./services/bankService');
const { setApiKeys } = require('./services/aiParserEngine');
const { validateIvaCsv } = require('./services/ivaCsvValidator');
const workingPaperService = require('./services/workingPaperService');
const documentService = require('./services/documentService');
const historyService = require('./services/historyService');
const authService = require('./services/authService');
const backupService = require('./services/backupService');
const { dialog } = require('electron');

// Basic IPC Example for health check
ipcMain.handle('get-app-info', async () => {
  return {
    name: 'Prisma Analytics',
    version: app.getVersion(),
    env: isDev ? 'development' : 'production'
  };
});

ipcMain.handle('save-ai-keys', async (event, { llamaParseKey, geminiKey, googleClientSecret, password }) => {
  // Se cifran con la contraseña maestra y se guardan en el archivo de configuración seguro.
  authService.saveSecrets({ llamaParseKey, geminiKey, googleClientSecret }, password);
  setApiKeys({ llamaParseKey, geminiKey });
  return { success: true };
});

ipcMain.handle('get-ai-keys', async (event, password) => {
  const keys = authService.getSecrets(password);
  return { success: true, ...keys };
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

// Autenticación local
ipcMain.handle('auth-status', async () => {
  const disabled = process.env.AUTH_DISABLED === 'true';
  return { success: true, hasPassword: authService.hasPassword(), disabled };
});

ipcMain.handle('auth-setup', async (event, password) => {
  const result = authService.setupPassword(password);
  return result;
});

ipcMain.handle('auth-login', async (event, password) => {
  const result = authService.verifyPassword(password);
  if (result.success) {
    // Cargar claves descifradas en el motor de IA al iniciar sesión.
    const keys = authService.getSecrets(password);
    setApiKeys(keys);
  }
  return result;
});

ipcMain.handle('auth-recover', async (event, { recoveryCode, newPassword }) => {
  const check = authService.verifyRecoveryCode(recoveryCode);
  if (!check.success) return { success: false, error: 'Código de recuperación inválido.' };
  return authService.resetPassword(newPassword);
});

ipcMain.handle('auth-change-password', async (event, { currentPassword, newPassword }) => {
  const check = authService.verifyPassword(currentPassword);
  if (!check.success) return { success: false, error: 'La contraseña actual es incorrecta.' };
  return authService.resetPassword(newPassword);
});

// Copias de seguridad cifradas con la contraseña maestra.
ipcMain.handle('create-backup', async (event, { password }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar copia de seguridad',
    defaultPath: `prisma-backup-${new Date().toISOString().slice(0, 10)}.pbackup`,
    filters: [{ name: 'Prisma Backup', extensions: ['pbackup'] }]
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };
  try {
    return backupService.createBackup(password, result.filePath);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-backup', async (event, { password }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona una copia de seguridad',
    properties: ['openFile'],
    filters: [{ name: 'Prisma Backup', extensions: ['pbackup'] }]
  });
  if (result.canceled || !result.filePaths?.length) return { success: false, canceled: true };
  try {
    const restored = backupService.importBackup(result.filePaths[0], password);
    // Reiniciar la app para que levante la base restaurada.
    app.relaunch();
    app.exit();
    return { success: true, ...restored };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Dialog IPC Handlers
ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    ...options
  });
  return result;
});

// Clients IPC Handlers
ipcMain.handle('get-clients', async () => {
  return await clientService.getAllClients();
});

ipcMain.handle('create-client', async (event, clientData) => {
  return await clientService.createClient(clientData);
});

// Ingest IPC Handlers
ipcMain.handle('process-excel', async (event, { filePath, clientId, year, type }) => {
  return await ingestService.processFinancialExcel(filePath, clientId, year, type);
});

ipcMain.handle('analyze-financial-document', async (event, { filePath }) => {
  return await ingestService.analyzeFinancialDocument(filePath);
});

ipcMain.handle('process-dte-json', async (event, { filePath, clientId }) => {
  return await ingestService.processDteJson(filePath, clientId);
});

// IVA and tax document ingestion
ipcMain.handle('process-iva-document', async (event, { filePath, clientId, periodYear, periodMonth, documentType }) => {
  return await ivaService.processIvaDocument(filePath, clientId, periodYear, periodMonth, documentType);
});

ipcMain.handle('analyze-iva-document', async (event, { filePath, documentType, fallbackYear, fallbackMonth }) => {
  return await ivaService.analyzeIvaDocument(filePath, documentType, fallbackYear, fallbackMonth);
});

ipcMain.handle('analyze-iva-csv', async (event, { filePath, documentType, periodYear, periodMonth }) => {
  return validateIvaCsv(filePath, documentType, periodYear, periodMonth);
});

ipcMain.handle('save-iva-document', async (event, { clientId, periodYear, periodMonth, documentType, analysis }) => {
  return await ivaService.saveIvaDocument(clientId, periodYear, periodMonth, documentType, analysis);
});

ipcMain.handle('get-iva-documents', async (event, { clientId, periodYear, periodMonth }) => {
  return await ivaService.getIvaDocuments(clientId, periodYear, periodMonth);
});

ipcMain.handle('analyze-bank-document', async (event, { filePath }) => {
  return await bankService.analyzeBankDocument(filePath);
});

ipcMain.handle('save-bank-document', async (event, { clientId, periodYear, periodMonth, analysis }) => {
  return await bankService.saveBankDocument(clientId, periodYear, periodMonth, analysis);
});

ipcMain.handle('get-bank-documents', async (event, { clientId, periodYear, periodMonth }) => {
  return await bankService.getBankDocuments(clientId, periodYear, periodMonth);
});

ipcMain.handle('get-iva-reconciliation', async (event, { clientId, periodYear, periodMonth }) => {
  return await ivaService.getIvaReconciliation(clientId, periodYear, periodMonth);
});

ipcMain.handle('get-financial-ratios', async (event, { clientId, periodYear, periodMonth }) => {
  return await ratioService.getFinancialRatios(clientId, periodYear, periodMonth);
});

ipcMain.handle('get-client-summary', async (event, clientId) => {
  return await ratioService.getClientSummary(clientId);
});

ipcMain.handle('run-audit-engine', async (event, { clientId, periodYear, periodMonth }) => {
  return await auditService.runAudit(clientId, periodYear, periodMonth);
});

ipcMain.handle('get-audit-findings', async (event, { clientId, periodYear, periodMonth }) => {
  return await auditService.getAuditFindings(clientId, periodYear, periodMonth);
});

ipcMain.handle('update-audit-finding', async (event, { findingId, status, observation }) => {
  return await auditService.updateFinding(findingId, status, observation);
});

ipcMain.handle('get-audit-settings', async (event, { clientId, periodYear, periodMonth }) => {
  return workingPaperService.getSettings(clientId, periodYear, periodMonth);
});

ipcMain.handle('save-audit-settings', async (event, { clientId, periodYear, periodMonth, values }) => {
  return workingPaperService.saveSettings(clientId, periodYear, periodMonth, values);
});

ipcMain.handle('get-working-paper', async (event, { clientId, periodYear, periodMonth }) => {
  return workingPaperService.getWorkingPaper(clientId, periodYear, periodMonth);
});

ipcMain.handle('create-audit-adjustment', async (event, { clientId, periodYear, periodMonth, data }) => {
  return workingPaperService.createAdjustment(clientId, periodYear, periodMonth, data);
});

ipcMain.handle('save-account-review', async (event, { clientId, periodYear, periodMonth, accountId, data }) => {
  return workingPaperService.saveAccountReview(clientId, periodYear, periodMonth, accountId, data);
});

ipcMain.handle('save-audit-note', async (event, { clientId, periodYear, periodMonth, accountId, title, content }) => {
  return workingPaperService.saveNote(clientId, periodYear, periodMonth, accountId, title, content);
});

ipcMain.handle('get-audit-note-revisions', async (event, noteId) => {
  return workingPaperService.getNoteRevisions(noteId);
});

ipcMain.handle('get-document-registry', async (event, { clientId, query, sort }) => {
  return documentService.getDocumentRegistry(clientId, query, sort);
});

ipcMain.handle('get-client-has-data', async (event, clientId) => {
  return documentService.clientHasData(clientId);
});

ipcMain.handle('reset-dev-data', async () => {
  const { resetDevelopmentData } = require('./database/db');
  return resetDevelopmentData();
});

// Finance IPC Handlers
ipcMain.handle('get-financials', async (event, { clientId, year, type }) => {
  return await financeService.getClientFinancials(clientId, year, type);
});

ipcMain.handle('save-financial-data', async (event, { clientId, periodYear, periodMonth, mappedData, statementType, metadata }) => {
  return await financeService.saveFinancialData(clientId, periodYear, periodMonth, mappedData, statementType, metadata);
});

ipcMain.handle('get-client-accounts', async (event, { clientId, periodYear, periodMonth }) => {
  return await financeService.getClientAccounts(clientId, periodYear, periodMonth);
});

ipcMain.handle('get-niif-catalog', async () => {
  return await financeService.getNiifCatalog();
});

// CRM IPC Handlers
ipcMain.handle('get-engagements', async (event, clientId) => {
  return await crmService.getEngagements(clientId);
});

ipcMain.handle('create-engagement', async (event, { clientId, type, description, deadlineDate, amount }) => {
  return await crmService.createEngagement(clientId, type, description, deadlineDate, amount);
});

ipcMain.handle('add-billing', async (event, { engagementId, amount, dueDate }) => {
  return await crmService.addBilling(engagementId, amount, dueDate);
});

ipcMain.handle('update-engagement-status', async (event, { engagementId, status }) => {
  return await crmService.updateEngagementStatus(engagementId, status);
});

ipcMain.handle('update-billing-status', async (event, { billingId, status }) => {
  return await crmService.updateBillingStatus(billingId, status);
});

ipcMain.handle('get-all-billing', async (event, { month, year }) => {
  return await crmService.getAllBilling(month, year);
});

ipcMain.handle('get-all-engagements', async () => {
  return await crmService.getAllEngagements();
});

ipcMain.handle('get-income-by-month', async (event, { month, year }) => {
  return await crmService.getIncomeByMonth(month, year);
});

ipcMain.handle('get-client-importance', async () => {
  return await crmService.getClientImportance();
});

ipcMain.handle('get-history', async (event, { clientId, query, sort }) => {
  return historyService.getHistory(clientId, query, sort);
});

// Report Drafts IPC Handlers
ipcMain.handle('get-report-draft', async (event, { clientId, periodYear, periodMonth }) => {
  return await reportService.getReportDraft(clientId, periodYear, periodMonth);
});

ipcMain.handle('save-report-draft', async (event, { clientId, periodYear, periodMonth, draftContent }) => {
  return await reportService.saveReportDraft(clientId, periodYear, periodMonth, draftContent);
});

ipcMain.handle('get-opinion-diagnosis', async (event, { clientId, periodYear, periodMonth }) => {
  return reportService.getOpinionDiagnosis(clientId, periodYear, periodMonth);
});

ipcMain.handle('get-opinion-template', async (event, { opinionKey, clientId, periodYear, periodMonth }) => {
  return reportService.getOpinionTemplate(opinionKey, clientId, periodYear, periodMonth);
});

ipcMain.handle('get-opinion-drafts', async (event, clientId) => {
  return reportService.getOpinionDrafts(clientId);
});

ipcMain.handle('open-opinion-window', async (event, { opinionKey, clientId, periodYear, periodMonth, company }) => {
  openDictamenWindow(opinionKey, clientId, periodYear, periodMonth, company);
  return { success: true };
});

ipcMain.handle('close-opinion-window', async () => {
  if (dictamenWindow && !dictamenWindow.isDestroyed()) dictamenWindow.close();
  return { success: true };
});

let dataEntryWindow = null;

function openDataEntryWindow(clientId = 0) {
  if (dataEntryWindow && !dataEntryWindow.isDestroyed()) {
    dataEntryWindow.focus();
    return true;
  }
  dataEntryWindow = new BrowserWindow({
    width: 1280,
    height: 920,
    title: 'Creación de Datos — Prisma Analytics',
    webPreferences: { nodeIntegration: true, contextIsolation: false, enableRemoteModule: true }
  });
  const query = `clientId=${clientId}`;
  if (isDev) dataEntryWindow.loadURL(`http://localhost:5173/#data-entry?${query}`);
  else dataEntryWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'), { hash: `data-entry?${query}` });
  dataEntryWindow.on('closed', () => { dataEntryWindow = null; });
  return true;
}

ipcMain.handle('open-data-entry-window', async (event, { clientId }) => {
  openDataEntryWindow(clientId);
  return { success: true };
});

ipcMain.handle('close-data-entry-window', async () => {
  if (dataEntryWindow && !dataEntryWindow.isDestroyed()) dataEntryWindow.close();
  return { success: true };
});
