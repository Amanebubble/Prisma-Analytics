const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

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
const { dialog } = require('electron');

// Basic IPC Example for health check
ipcMain.handle('get-app-info', async () => {
  return {
    name: 'Prisma Analytics',
    version: app.getVersion(),
    env: isDev ? 'development' : 'production'
  };
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

ipcMain.handle('process-dte-json', async (event, { filePath, clientId }) => {
  return await ingestService.processDteJson(filePath, clientId);
});

// Finance IPC Handlers
ipcMain.handle('get-financials', async (event, { clientId, year, type }) => {
  return await financeService.getClientFinancials(clientId, year, type);
});
