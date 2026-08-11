const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Calculamos la ruta de la base de datos basándonos en la ubicación del backend
// Aseguramos que los datos se guarden en 'data/test_db' de forma relativa
const dbDir = path.join(__dirname, '../../data/test_db');
const dbPath = path.join(dbDir, 'prisma.sqlite');

// Asegurarse de que el directorio exista
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Inicializar la conexión
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error conectando a la base de datos SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite en:', dbPath);
    initializeTables();
  }
});

// Función para inicializar las tablas principales (Módulo 1 y 2)
function initializeTables() {
  db.serialize(() => {
    // Tabla de Clientes
    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        nit TEXT,
        nrc TEXT,
        sector TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de Estados Financieros (Balances / Estado de Resultados)
    db.run(`
      CREATE TABLE IF NOT EXISTS financial_statements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        period_year INTEGER NOT NULL,
        period_month INTEGER,
        type TEXT NOT NULL, -- 'balance', 'results'
        raw_data_json TEXT, -- Los datos mapeados a NIIF en JSON
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    // Tabla de Documentos Tributarios Electrónicos (Facturas, Compras, etc.)
    db.run(`
      CREATE TABLE IF NOT EXISTS dte_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        uuid TEXT UNIQUE NOT NULL, -- UUIDv4 de Hacienda
        type TEXT NOT NULL, -- 'sales', 'purchases', 'retentions'
        issue_date DATE,
        total REAL,
        sello_recibido TEXT, -- Para validar cumplimiento legal
        json_data TEXT, -- El DTE crudo
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);
    
    console.log('Tablas inicializadas correctamente.');
  });
}

// Funciones utilitarias envueltas en Promesas para facilitar su uso con async/await
const dbAsync = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this); // 'this' contains lastID and changes
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = { db, dbAsync };
