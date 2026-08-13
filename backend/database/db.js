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
    // MODO PRUEBA AISLADA: Limpiamos la base de datos en cada reinicio para que las pruebas sean desde cero.
    // (Luego quitaremos esto cuando pasemos a producción)
    console.log('--- MODO PRUEBA: Limpiando base de datos ---');
    db.run(`DROP TABLE IF EXISTS dte_records`);
    db.run(`DROP TABLE IF EXISTS financial_statements`);
    db.run(`DROP TABLE IF EXISTS clients`);
    db.run(`DROP TABLE IF EXISTS niif_catalog`);

    // Tabla de Catálogo NIIF
    db.run(`
      CREATE TABLE IF NOT EXISTS niif_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense', etc.
        level INTEGER NOT NULL -- Nivel de jerarquía (1 = rubro, 2 = cuenta mayor, etc.)
      )
    `);

    // Poblar catálogo básico NIIF
    db.run(`INSERT OR IGNORE INTO niif_catalog (code, name, type, level) VALUES
      ('1', 'Activos', 'asset', 1),
      ('1.1', 'Activos Corrientes', 'asset', 2),
      ('1.1.1', 'Efectivo y Equivalentes de Efectivo', 'asset', 3),
      ('1.1.2', 'Cuentas por Cobrar', 'asset', 3),
      ('1.1.3', 'Inventarios', 'asset', 3),
      ('1.2', 'Activos No Corrientes', 'asset', 2),
      ('1.2.1', 'Propiedades, Planta y Equipo', 'asset', 3),
      ('2', 'Pasivos', 'liability', 1),
      ('2.1', 'Pasivos Corrientes', 'liability', 2),
      ('2.1.1', 'Cuentas por Pagar Comerciales', 'liability', 3),
      ('2.1.2', 'Préstamos a Corto Plazo', 'liability', 3),
      ('2.2', 'Pasivos No Corrientes', 'liability', 2),
      ('2.2.1', 'Préstamos a Largo Plazo', 'liability', 3),
      ('3', 'Patrimonio', 'equity', 1),
      ('3.1', 'Capital Social', 'equity', 2),
      ('3.2', 'Utilidades Retenidas', 'equity', 2),
      ('4', 'Ingresos', 'revenue', 1),
      ('4.1', 'Ingresos Ordinarios', 'revenue', 2),
      ('5', 'Gastos', 'expense', 1),
      ('5.1', 'Costos de Venta', 'expense', 2),
      ('5.2', 'Gastos de Administración', 'expense', 2),
      ('5.3', 'Gastos de Venta', 'expense', 2),
      ('5.4', 'Gastos Financieros', 'expense', 2)
    `);

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

    // Poblar clientes de prueba
    db.run(`INSERT OR IGNORE INTO clients (name, nit, nrc, sector) VALUES 
      ('Lácteos El Salvador S.A.', '0614-010190-101-1', '123456-7', 'Industria'),
      ('Ferretería La Tuerca', '0614-150685-101-2', '765432-1', 'Comercio'),
      ('Constructora Prisma', '0614-201080-101-3', '112233-4', 'Construcción')
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
