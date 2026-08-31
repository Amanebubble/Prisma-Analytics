const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

require('dotenv').config();

// Directorio de datos del usuario: sobrevive a actualizaciones y desinstalaciones.
function getDataDir() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'data');
  } catch (e) {
    // Fallback en modo desarrollo (sin Electron) para no romper.
    return path.join(__dirname, '../../data/test_db');
  }
}

const dbDir = getDataDir();
const dbPath = path.join(dbDir, 'prisma.sqlite');

// Solo se permite destruir la base cuando el entorno de pruebas lo solicita explícitamente.
if (process.env.RESET_DB_ON_START === 'true' && fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Base SQLite reiniciada para pruebas.');
}

// Asegurarse de que el directorio exista
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Inicializar la conexión
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error conectando a la base de datos SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
    initializeTables();
  }
});

// Función para inicializar las tablas principales (Módulo 1 y 2)
function initializeTables() {
  db.serialize(() => {
    // MODO PRUEBA AISLADA (desactivado para retener datos)
    // db.run(`DROP TABLE IF EXISTS dte_records`);
    // db.run(`DROP TABLE IF EXISTS financial_statements`);
    // db.run(`DROP TABLE IF EXISTS clients`);
    // db.run(`DROP TABLE IF EXISTS niif_catalog`);

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

    // Poblar catálogo NIIF ampliado (rubros y cuentas de nivel 2 y 3).
    db.run(`INSERT OR IGNORE INTO niif_catalog (code, name, type, level) VALUES
      ('1', 'Activos', 'asset', 1),
      ('2', 'Pasivos', 'liability', 1),
      ('3', 'Patrimonio', 'equity', 1),
      ('4', 'Ingresos', 'revenue', 1),
      ('5', 'Gastos', 'expense', 1),
      ('11', 'Efectivo y Equivalentes de Efectivo', 'asset', 2),
      ('12', 'Cuentas por Cobrar y Deudores', 'asset', 2),
      ('13', 'Inventarios', 'asset', 2),
      ('14', 'Inversiones', 'asset', 2),
      ('15', 'Propiedad, Planta y Equipo', 'asset', 2),
      ('16', 'Activos Intangibles', 'asset', 2),
      ('17', 'Activos por Impuestos', 'asset', 2),
      ('18', 'Otros Activos', 'asset', 2),
      ('21', 'Cuentas por Pagar Comerciales', 'liability', 2),
      ('22', 'Préstamos y Obligaciones', 'liability', 2),
      ('23', 'Cuentas por Pagar a Partes Relacionadas', 'liability', 2),
      ('24', 'Impuestos y Retenciones por Pagar', 'liability', 2),
      ('25', 'Obligaciones Laborales', 'liability', 2),
      ('26', 'Provisiones', 'liability', 2),
      ('27', 'Pasivos Diferidos', 'liability', 2),
      ('28', 'Otros Pasivos', 'liability', 2),
      ('31', 'Capital Social y Aportaciones', 'equity', 2),
      ('32', 'Reservas', 'equity', 2),
      ('33', 'Resultados Acumulados y del Ejercicio', 'equity', 2),
      ('41', 'Ingresos de Actividades Ordinarias', 'revenue', 2),
      ('45', 'Otros Ingresos', 'revenue', 2),
      ('51', 'Costo de Ventas', 'expense', 2),
      ('52', 'Gastos de Administración', 'expense', 2),
      ('53', 'Gastos de Venta', 'expense', 2),
      ('54', 'Gastos Financieros', 'expense', 2),
      ('55', 'Otros Gastos', 'expense', 2)
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

    // Los clientes demo solo se cargan cuando se solicitan explícitamente.
    if (process.env.SEED_DEMO_DATA === 'true') {
      db.run(`INSERT OR IGNORE INTO clients (name, nit, nrc, sector) VALUES 
        ('Lácteos El Salvador S.A.', '0614-010190-101-1', '123456-7', 'Industria'),
        ('Ferretería La Tuerca', '0614-150685-101-2', '765432-1', 'Comercio'),
        ('Constructora Prisma', '0614-201080-101-3', '112233-4', 'Construcción')
      `);
    }

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

    // Catálogo de cuentas detectadas por cliente y sus saldos históricos.
    db.run(`
      CREATE TABLE IF NOT EXISTS client_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        original_name TEXT NOT NULL,
        niif_code TEXT,
        niif_name TEXT,
        confidence TEXT DEFAULT 'pending',
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, original_name),
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS account_balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        financial_statement_id INTEGER,
        period_year INTEGER NOT NULL,
        period_month INTEGER,
        statement_type TEXT NOT NULL,
        balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(account_id, period_year, period_month, statement_type),
        FOREIGN KEY(account_id) REFERENCES client_accounts(id),
        FOREIGN KEY(financial_statement_id) REFERENCES financial_statements(id)
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

    // Documentos y declaraciones IVA procesados por período.
    db.run(`
      CREATE TABLE IF NOT EXISTS iva_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        document_type TEXT NOT NULL,
        source_filename TEXT NOT NULL,
        source_path TEXT,
        extracted_data_json TEXT NOT NULL,
        total_sales REAL DEFAULT 0,
        total_purchases REAL DEFAULT 0,
        iva_debit REAL DEFAULT 0,
        iva_credit REAL DEFAULT 0,
        declared_tax REAL DEFAULT 0,
        extraction_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    // Estados de cuenta bancarios y movimientos normalizados.
    db.run(`
      CREATE TABLE IF NOT EXISTS bank_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        source_filename TEXT NOT NULL,
        source_path TEXT,
        bank_name TEXT,
        account_number TEXT,
        currency TEXT DEFAULT 'USD',
        extracted_data_json TEXT NOT NULL,
        extraction_status TEXT DEFAULT 'processed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS bank_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_document_id INTEGER NOT NULL,
        transaction_date DATE,
        description TEXT,
        reference TEXT,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        FOREIGN KEY(bank_document_id) REFERENCES bank_documents(id)
      )
    `);

    // Tabla de Borradores de Reportes (Dictamen)
    db.run(`
      CREATE TABLE IF NOT EXISTS report_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        period_year INTEGER,
        period_month INTEGER,
        draft_content TEXT,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    // Tabla de Trabajos (Engagements) - Planificación
    db.run(`
      CREATE TABLE IF NOT EXISTS engagements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        type TEXT NOT NULL, -- Ej: 'Auditoría Financiera', 'Fiscal'
        status TEXT DEFAULT 'pending', -- 'pending', 'active', 'completed'
        description TEXT,
        deadline_date DATE,
        actual_delivery_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    // Tabla de Cobros (Billing) - Planificación
    db.run(`
      CREATE TABLE IF NOT EXISTS billing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        engagement_id INTEGER,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'paid'
        due_date DATE,
        received_at DATETIME, -- Fecha en que se recibió el pago cuando se cierra el trabajo
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(engagement_id) REFERENCES engagements(id)
      )
    `);

    // Hallazgos generados por reglas de auditoría y acciones del auditor.
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        source_key TEXT UNIQUE NOT NULL,
        test_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        impact TEXT NOT NULL,
        status TEXT DEFAULT 'Pendiente',
        observation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        planning_materiality REAL DEFAULT 0,
        execution_materiality REAL DEFAULT 0,
        trivial_threshold REAL DEFAULT 0,
        status TEXT DEFAULT 'in_review',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, period_year, period_month),
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_adjustments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        reference TEXT NOT NULL,
        kind TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'proposed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_adjustment_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adjustment_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        FOREIGN KEY(adjustment_id) REFERENCES audit_adjustments(id),
        FOREIGN KEY(account_id) REFERENCES client_accounts(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_account_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        tick_marks_json TEXT DEFAULT '[]',
        assertions_json TEXT DEFAULT '{}',
        reviewer_note TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, period_year, period_month, account_id),
        FOREIGN KEY(client_id) REFERENCES clients(id),
        FOREIGN KEY(account_id) REFERENCES client_accounts(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, period_year, period_month, account_id),
        FOREIGN KEY(client_id) REFERENCES clients(id),
        FOREIGN KEY(account_id) REFERENCES client_accounts(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_note_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(note_id) REFERENCES audit_notes(id)
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

// Borra los datos de prueba/documentos cargados conservando clientes, catálogo
// y configuración de planificación. Útil para empezar limpio sin reiniciar.
async function resetDevelopmentData() {
  const tables = [
    'audit_note_revisions', 'audit_notes', 'audit_account_reviews',
    'audit_adjustment_lines', 'audit_adjustments', 'audit_findings', 'audit_settings',
    'account_balances', 'bank_transactions', 'bank_documents',
    'iva_documents', 'dte_records', 'financial_statements', 'client_accounts', 'report_drafts'
  ];
  for (const table of tables) {
    await dbAsync.run(`DELETE FROM ${table}`);
  }
  return { success: true, cleared: tables };
}

module.exports = { db, dbAsync, resetDevelopmentData };
