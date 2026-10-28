const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();
let db = null;
let isMysql = false;

// Sécurité : hachage des mots de passe
function hashPassword(password, salt = 'hq_telecom_salt_2026') {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

let isInitialized = false;

// Initialisation de la base de données
async function initDatabase() {
  if (isInitialized) return;

  if (DB_TYPE === 'mysql') {
    try {
      const mysql = require('mysql2/promise');
      db = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'highquality_telecoms',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      isMysql = true;
      console.log('✔ Connecté avec succès à la base de données MySQL.');
      await createMysqlTables();
      await seedDefaultAdmin();
      isInitialized = true;
      return;
    } catch (err) {
      console.warn('⚠ Impossible de se connecter à MySQL (' + err.message + '). Basculement automatique sur SQLite.');
    }
  }

  // SQLite (par défaut ou fallback)
  // Sur Vercel ou serverless Linux, le répertoire /tmp est le seul accessible en écriture
  const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
  const dataDir = isVercel ? '/tmp' : path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(dataDir, 'highquality.db');
  db = new DatabaseSync(dbPath);
  isMysql = false;
  console.log(`✔ Base de données SQLite initialisée : ${dbPath}`);
  createSqliteTables();
  await seedDefaultAdmin();
  isInitialized = true;
}

// Tables SQLite
function createSqliteTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_code TEXT UNIQUE,
      client_name TEXT NOT NULL,
      company TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      service_type TEXT NOT NULL,
      location TEXT,
      urgency TEXT,
      details TEXT,
      estimated_budget TEXT,
      status TEXT DEFAULT 'NOUVEAU',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Tables MySQL
async function createMysqlTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ref_code VARCHAR(32) UNIQUE,
      client_name VARCHAR(150) NOT NULL,
      company VARCHAR(150),
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(50),
      service_type VARCHAR(100) NOT NULL,
      location VARCHAR(150),
      urgency VARCHAR(50),
      details TEXT,
      estimated_budget VARCHAR(50),
      status VARCHAR(50) DEFAULT 'NOUVEAU',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(50),
      subject VARCHAR(150),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(256) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// Création de l'administrateur par défaut
async function seedDefaultAdmin() {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'HighQuality2026!';
  const hash = hashPassword(adminPass);

  if (isMysql) {
    const [rows] = await db.query('SELECT id FROM admin_users WHERE username = ?', [adminUser]);
    if (rows.length === 0) {
      await db.query('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', [adminUser, hash]);
      console.log(`✔ Compte administrateur initialisé [MySQL] : utilisateur="${adminUser}"`);
    }
  } else {
    const row = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(adminUser);
    if (!row) {
      db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(adminUser, hash);
      console.log(`✔ Compte administrateur initialisé [SQLite] : utilisateur="${adminUser}"`);
    }
  }
}

// Enregistrement d'une demande de devis
async function createQuote(data) {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const refCode = `HQ-${new Date().getFullYear()}-${randomSuffix}`;

  const payload = {
    ref_code: refCode,
    client_name: (data.client_name || '').trim(),
    company: (data.company || '').trim(),
    email: (data.email || '').trim().toLowerCase(),
    phone: (data.phone || '').trim(),
    service_type: data.service_type || 'Fibre Optique',
    location: (data.location || '').trim(),
    urgency: data.urgency || 'Normal',
    details: (data.details || '').trim(),
    estimated_budget: data.estimated_budget || 'À définir',
    status: 'NOUVEAU',
    notes: ''
  };

  if (isMysql) {
    const [res] = await db.query(
      `INSERT INTO quotes 
       (ref_code, client_name, company, email, phone, service_type, location, urgency, details, estimated_budget, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.ref_code, payload.client_name, payload.company, payload.email, payload.phone,
        payload.service_type, payload.location, payload.urgency, payload.details,
        payload.estimated_budget, payload.status, payload.notes
      ]
    );
    return { id: res.insertId, ...payload };
  } else {
    const stmt = db.prepare(`
      INSERT INTO quotes 
      (ref_code, client_name, company, email, phone, service_type, location, urgency, details, estimated_budget, status, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      payload.ref_code, payload.client_name, payload.company, payload.email, payload.phone,
      payload.service_type, payload.location, payload.urgency, payload.details,
      payload.estimated_budget, payload.status, payload.notes
    );
    return { id: Number(res.lastInsertRowid), ...payload };
  }
}

// Enregistrement d'un message de contact
async function createMessage(data) {
  const payload = {
    name: (data.name || '').trim(),
    email: (data.email || '').trim().toLowerCase(),
    phone: (data.phone || '').trim(),
    subject: (data.subject || '').trim(),
    message: (data.message || '').trim()
  };

  if (isMysql) {
    const [res] = await db.query(
      'INSERT INTO messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [payload.name, payload.email, payload.phone, payload.subject, payload.message]
    );
    return { id: res.insertId, ...payload };
  } else {
    const stmt = db.prepare('INSERT INTO messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)');
    const res = stmt.run(payload.name, payload.email, payload.phone, payload.subject, payload.message);
    return { id: Number(res.lastInsertRowid), ...payload };
  }
}

// Récupération des devis pour le tableau de bord
async function getQuotes({ status, search, limit = 100, offset = 0 } = {}) {
  let query = 'SELECT * FROM quotes WHERE 1=1';
  const params = [];

  if (status && status !== 'TOUS') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (client_name LIKE ? OR company LIKE ? OR email LIKE ? OR ref_code LIKE ? OR service_type LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  if (isMysql) {
    const [rows] = await db.query(query, params);
    return rows;
  } else {
    return db.prepare(query).all(...params);
  }
}

// Récupérer un devis précis
async function getQuoteById(id) {
  if (isMysql) {
    const [rows] = await db.query('SELECT * FROM quotes WHERE id = ?', [id]);
    return rows[0] || null;
  } else {
    return db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) || null;
  }
}

// Mettre à jour le statut d'un devis
async function updateQuoteStatus(id, status, notes = null) {
  if (isMysql) {
    if (notes !== null) {
      await db.query('UPDATE quotes SET status = ?, notes = ? WHERE id = ?', [status, notes, id]);
    } else {
      await db.query('UPDATE quotes SET status = ? WHERE id = ?', [status, id]);
    }
  } else {
    if (notes !== null) {
      db.prepare('UPDATE quotes SET status = ?, notes = ? WHERE id = ?').run(status, notes, id);
    } else {
      db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run(status, id);
    }
  }
  return getQuoteById(id);
}

// Supprimer un devis
async function deleteQuote(id) {
  if (isMysql) {
    await db.query('DELETE FROM quotes WHERE id = ?', [id]);
  } else {
    db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
  }
  return true;
}

// Statistiques globales pour le tableau de bord
async function getStats() {
  if (isMysql) {
    const [totalRes] = await db.query('SELECT COUNT(*) as cnt FROM quotes');
    const [nouveauRes] = await db.query("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'NOUVEAU'");
    const [enCoursRes] = await db.query("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'EN_COURS'");
    const [valideRes] = await db.query("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'SIGNE' OR status = 'DEVIS_TRANSMIS'");
    const [messagesRes] = await db.query('SELECT COUNT(*) as cnt FROM messages');

    return {
      total_quotes: totalRes[0].cnt,
      nouveaux_quotes: nouveauRes[0].cnt,
      en_cours_quotes: enCoursRes[0].cnt,
      valides_quotes: valideRes[0].cnt,
      total_messages: messagesRes[0].cnt
    };
  } else {
    const total = db.prepare('SELECT COUNT(*) as cnt FROM quotes').get().cnt;
    const nouveaux = db.prepare("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'NOUVEAU'").get().cnt;
    const enCours = db.prepare("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'EN_COURS'").get().cnt;
    const valides = db.prepare("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'SIGNE' OR status = 'DEVIS_TRANSMIS'").get().cnt;
    const messages = db.prepare('SELECT COUNT(*) as cnt FROM messages').get().cnt;

    return {
      total_quotes: total,
      nouveaux_quotes: nouveaux,
      en_cours_quotes: enCours,
      valides_quotes: valides,
      total_messages: messages
    };
  }
}

// Export de tous les devis (pour CSV)
async function getAllQuotesForExport() {
  const query = 'SELECT * FROM quotes ORDER BY id DESC';
  if (isMysql) {
    const [rows] = await db.query(query);
    return rows;
  } else {
    return db.prepare(query).all();
  }
}

// Authentification administrateur
async function verifyAdmin(username, password) {
  const hash = hashPassword(password);
  if (isMysql) {
    const [rows] = await db.query('SELECT id, username FROM admin_users WHERE username = ? AND password_hash = ?', [username, hash]);
    return rows[0] || null;
  } else {
    return db.prepare('SELECT id, username FROM admin_users WHERE username = ? AND password_hash = ?').get(username, hash) || null;
  }
}

module.exports = {
  initDatabase,
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuoteStatus,
  deleteQuote,
  createMessage,
  getStats,
  getAllQuotesForExport,
  verifyAdmin
};
