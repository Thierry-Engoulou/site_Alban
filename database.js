const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
// - PostgreSQL (Neon via Vercel) dès que DATABASE_URL ou POSTGRES_URL est défini : recommandé en production
// - MySQL si DB_TYPE=mysql
// - SQLite sinon (local, zéro configuration)
const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const DB_TYPE = PG_URL ? 'postgres' : (process.env.DB_TYPE || 'sqlite').toLowerCase();
let db = null;
let dialect = 'sqlite'; // 'sqlite' | 'mysql' | 'postgres'

// Sécurité : hachage des mots de passe
function hashPassword(password, salt = 'hq_telecom_salt_2026') {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

let initPromise = null;

// Initialisation de la base de données (une seule fois par instance)
function initDatabase() {
  if (!initPromise) {
    initPromise = doInit().catch(err => { initPromise = null; throw err; });
  }
  return initPromise;
}

async function doInit() {
  if (DB_TYPE === 'postgres') {
    const { Pool } = require('pg');
    db = new Pool({
      connectionString: PG_URL,
      ssl: /localhost|127\.0\.0\.1/.test(PG_URL) ? false : { rejectUnauthorized: false },
      max: 3
    });
    dialect = 'postgres';
    await createTables();
    await seedDefaultAdmin();
    console.log('✔ Connecté à la base PostgreSQL.');
    return;
  }

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
      dialect = 'mysql';
      await createTables();
      await seedDefaultAdmin();
      console.log('✔ Connecté avec succès à la base de données MySQL.');
      return;
    } catch (err) {
      console.warn('⚠ Impossible de se connecter à MySQL (' + err.message + '). Basculement automatique sur SQLite.');
    }
  }

  // SQLite (par défaut ou fallback)
  // Sur Vercel, /tmp est le seul répertoire accessible en écriture, mais il est éphémère :
  // les données n'y survivent pas. Connectez une base Postgres (Neon) en production.
  const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
  const dataDir = isVercel ? '/tmp' : path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (isVercel) console.warn('⚠ SQLite dans /tmp sur Vercel : données non persistantes. Ajoutez DATABASE_URL.');

  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(dataDir, 'highquality.db');
  db = new DatabaseSync(dbPath);
  dialect = 'sqlite';
  console.log(`✔ Base de données SQLite initialisée : ${dbPath}`);
  await createTables();
  await seedDefaultAdmin();
}

// ==============================================================
// Accès aux données, identique pour les trois moteurs.
// Les requêtes sont écrites avec des « ? » ; ils sont convertis en $1, $2… pour PostgreSQL.
// ==============================================================

function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + (++i)).replace(/ LIKE /g, ' ILIKE ');
}

async function all(sql, params = []) {
  await initDatabase();
  if (dialect === 'postgres') return (await db.query(toPg(sql), params)).rows;
  if (dialect === 'mysql') return (await db.query(sql, params))[0];
  return db.prepare(sql).all(...params);
}

async function get(sql, params = []) {
  return (await all(sql, params))[0] || null;
}

async function run(sql, params = []) {
  await initDatabase();
  if (dialect === 'postgres') return db.query(toPg(sql), params);
  if (dialect === 'mysql') return db.query(sql, params);
  return db.prepare(sql).run(...params);
}

// INSERT qui renvoie l'identifiant créé
async function insert(sql, params = []) {
  await initDatabase();
  if (dialect === 'postgres') return Number((await db.query(toPg(sql) + ' RETURNING id', params)).rows[0].id);
  if (dialect === 'mysql') return (await db.query(sql, params))[0].insertId;
  return Number(db.prepare(sql).run(...params).lastInsertRowid);
}

async function exec(sql) {
  if (dialect === 'sqlite') return db.exec(sql);
  return db.query(sql);
}

// Les COUNT(*) reviennent en texte avec PostgreSQL
const num = v => Number(v || 0);

// ==============================================================
// Tables
// ==============================================================

async function createTables() {
  const T = {
    sqlite:   { id: 'INTEGER PRIMARY KEY AUTOINCREMENT', ts: "TEXT DEFAULT (datetime('now'))", s: n => 'TEXT', end: '' },
    mysql:    { id: 'INT AUTO_INCREMENT PRIMARY KEY',    ts: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', s: n => `VARCHAR(${n})`, end: ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' },
    postgres: { id: 'SERIAL PRIMARY KEY',                ts: 'TIMESTAMPTZ DEFAULT now()', s: n => `VARCHAR(${n})`, end: '' }
  }[dialect];
  const { id, ts, s, end } = T;

  const stmts = [
    `CREATE TABLE IF NOT EXISTS quotes (
      id ${id},
      ref_code ${s(32)} UNIQUE,
      client_name ${s(150)} NOT NULL,
      company ${s(150)},
      email ${s(150)} NOT NULL,
      phone ${s(50)},
      service_type ${s(100)} NOT NULL,
      location ${s(150)},
      urgency ${s(50)},
      details TEXT,
      estimated_budget ${s(50)},
      status ${s(50)} DEFAULT 'NOUVEAU',
      notes TEXT,
      created_at ${ts}
    )${end}`,
    `CREATE TABLE IF NOT EXISTS messages (
      id ${id},
      name ${s(150)} NOT NULL,
      email ${s(150)} NOT NULL,
      phone ${s(50)},
      subject ${s(150)},
      message TEXT NOT NULL,
      created_at ${ts}
    )${end}`,
    `CREATE TABLE IF NOT EXISTS admin_users (
      id ${id},
      username ${s(50)} UNIQUE NOT NULL,
      password_hash ${s(256)} NOT NULL,
      created_at ${ts}
    )${end}`,
    // Pages vues, anonymes : aucune adresse IP n'est enregistrée
    `CREATE TABLE IF NOT EXISTS visits (
      id ${id},
      sid ${s(40)} NOT NULL,
      day ${s(10)} NOT NULL,
      ts BIGINT NOT NULL,
      path ${s(200)},
      source ${s(80)},
      country ${s(8)},
      city ${s(80)},
      device ${s(20)},
      browser ${s(30)},
      os ${s(30)}
    )${end}`,
    // Qui est sur le site en ce moment (dernier signal de chaque session)
    `CREATE TABLE IF NOT EXISTS presence (
      sid ${s(40)} PRIMARY KEY,
      ts BIGINT NOT NULL,
      path ${s(200)}
    )${end}`
  ];
  for (const sql of stmts) await exec(sql);

  const idx = ['CREATE INDEX idx_visits_day ON visits (day)', 'CREATE INDEX idx_visits_ts ON visits (ts)'];
  for (const sql of idx) {
    try { await exec(dialect === 'mysql' ? sql : sql.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS')); }
    catch (e) { /* index déjà présent (MySQL) */ }
  }
}

// Compte administrateur : le mot de passe de .env / Vercel fait foi, il est remis à jour à chaque démarrage
async function seedDefaultAdmin() {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS;
  if (!adminPass) {
    console.warn('⚠ ADMIN_PASS non défini : aucun compte administrateur créé. Renseignez-le dans .env ou sur Vercel.');
    return;
  }
  const hash = hashPassword(adminPass);
  const row = await getRaw('SELECT id, password_hash FROM admin_users WHERE username = ?', [adminUser]);
  if (!row) {
    await runRaw('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', [adminUser, hash]);
    console.log(`✔ Compte administrateur initialisé : utilisateur="${adminUser}"`);
  } else if (row.password_hash !== hash) {
    await runRaw('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, row.id]);
    console.log(`✔ Mot de passe administrateur mis à jour : utilisateur="${adminUser}"`);
  }
}

// Variantes sans attente de l'initialisation (utilisées pendant l'initialisation elle-même)
async function getRaw(sql, params) {
  if (dialect === 'postgres') return (await db.query(toPg(sql), params)).rows[0] || null;
  if (dialect === 'mysql') return (await db.query(sql, params))[0][0] || null;
  return db.prepare(sql).get(...params) || null;
}
async function runRaw(sql, params) {
  if (dialect === 'postgres') return db.query(toPg(sql), params);
  if (dialect === 'mysql') return db.query(sql, params);
  return db.prepare(sql).run(...params);
}

// ==============================================================
// Devis et messages
// ==============================================================

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

  const id = await insert(
    `INSERT INTO quotes
     (ref_code, client_name, company, email, phone, service_type, location, urgency, details, estimated_budget, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.ref_code, payload.client_name, payload.company, payload.email, payload.phone,
      payload.service_type, payload.location, payload.urgency, payload.details,
      payload.estimated_budget, payload.status, payload.notes
    ]
  );
  return { id, ...payload };
}

async function createMessage(data) {
  const payload = {
    name: (data.name || '').trim(),
    email: (data.email || '').trim().toLowerCase(),
    phone: (data.phone || '').trim(),
    subject: (data.subject || '').trim(),
    message: (data.message || '').trim()
  };
  const id = await insert(
    'INSERT INTO messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
    [payload.name, payload.email, payload.phone, payload.subject, payload.message]
  );
  return { id, ...payload };
}

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
  return all(query, params);
}

async function getQuoteById(id) {
  return get('SELECT * FROM quotes WHERE id = ?', [id]);
}

async function updateQuoteStatus(id, status, notes = null) {
  if (notes !== null) {
    await run('UPDATE quotes SET status = ?, notes = ? WHERE id = ?', [status, notes, id]);
  } else {
    await run('UPDATE quotes SET status = ? WHERE id = ?', [status, id]);
  }
  return getQuoteById(id);
}

async function deleteQuote(id) {
  await run('DELETE FROM quotes WHERE id = ?', [id]);
  return true;
}

// Messages et candidatures (les candidatures ont un objet qui commence par « Candidature »)
async function getMessages({ kind, search } = {}) {
  let query = 'SELECT * FROM messages WHERE 1=1';
  const params = [];
  if (kind === 'candidatures') query += " AND subject LIKE 'Candidature%'";
  if (kind === 'messages') query += " AND (subject IS NULL OR subject NOT LIKE 'Candidature%')";
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  query += ' ORDER BY id DESC LIMIT 300';
  return all(query, params);
}

async function deleteMessage(id) {
  await run('DELETE FROM messages WHERE id = ?', [id]);
  return true;
}

async function getStats() {
  const c = async (sql) => num((await get(sql)).cnt);
  return {
    total_quotes: await c('SELECT COUNT(*) as cnt FROM quotes'),
    nouveaux_quotes: await c("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'NOUVEAU'"),
    en_cours_quotes: await c("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'EN_COURS'"),
    valides_quotes: await c("SELECT COUNT(*) as cnt FROM quotes WHERE status = 'SIGNE' OR status = 'DEVIS_TRANSMIS'"),
    total_messages: await c("SELECT COUNT(*) as cnt FROM messages WHERE subject IS NULL OR subject NOT LIKE 'Candidature%'"),
    total_candidatures: await c("SELECT COUNT(*) as cnt FROM messages WHERE subject LIKE 'Candidature%'")
  };
}

async function getAllQuotesForExport() {
  return all('SELECT * FROM quotes ORDER BY id DESC');
}

async function verifyAdmin(username, password) {
  const hash = hashPassword(password);
  return get('SELECT id, username FROM admin_users WHERE username = ? AND password_hash = ?', [username, hash]);
}

// ==============================================================
// Fréquentation du site (anonyme)
// ==============================================================

const LIVE_WINDOW_MS = 100 * 1000;

// Journée calendaire à Douala (UTC+1, pas d'heure d'été)
function doualaDay(ts) {
  return new Date(ts + 3600 * 1000).toISOString().slice(0, 10);
}

async function touchPresence(sid, ts, pagePath) {
  if (dialect === 'mysql') {
    await run('INSERT INTO presence (sid, ts, path) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE ts = VALUES(ts), path = VALUES(path)', [sid, ts, pagePath]);
  } else {
    await run('INSERT INTO presence (sid, ts, path) VALUES (?, ?, ?) ON CONFLICT (sid) DO UPDATE SET ts = excluded.ts, path = excluded.path', [sid, ts, pagePath]);
  }
}

// Une page vue (type 'view') ou un simple signal de présence (type 'ping')
async function recordHit(hit) {
  const ts = Date.now();
  await touchPresence(hit.sid, ts, hit.path);
  if (hit.type !== 'view') return;
  await run(
    `INSERT INTO visits (sid, day, ts, path, source, country, city, device, browser, os)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [hit.sid, doualaDay(ts), ts, hit.path, hit.source, hit.country, hit.city, hit.device, hit.browser, hit.os]
  );
}

async function getLive() {
  const since = Date.now() - LIVE_WINDOW_MS;
  const pages = await all('SELECT path, COUNT(*) as cnt FROM presence WHERE ts > ? GROUP BY path ORDER BY cnt DESC', [since]);
  return {
    live: pages.reduce((s, p) => s + num(p.cnt), 0),
    pages: pages.map(p => ({ path: p.path, count: num(p.cnt) }))
  };
}

async function getAnalytics({ days = 30 } = {}) {
  const now = Date.now();
  days = Math.min(Math.max(parseInt(days) || 30, 1), 365);
  const today = doualaDay(now);
  const from = doualaDay(now - (days - 1) * 86400000);

  // Nettoyage : présence de plus d'un jour, visites de plus de 13 mois
  await run('DELETE FROM presence WHERE ts < ?', [now - 86400000]);
  await run('DELETE FROM visits WHERE ts < ?', [now - 395 * 86400000]);

  const totals = async (cond, params) => {
    const r = await get(`SELECT COUNT(*) as views, COUNT(DISTINCT sid) as visits FROM visits WHERE ${cond}`, params);
    return { views: num(r.views), visits: num(r.visits) };
  };
  const top = async (col, limit = 8) => (await all(
    `SELECT ${col} as k, COUNT(DISTINCT sid) as cnt FROM visits WHERE day >= ? AND ${col} IS NOT NULL AND ${col} <> '' GROUP BY ${col} ORDER BY cnt DESC LIMIT ${limit}`,
    [from]
  )).map(r => ({ key: r.k, count: num(r.cnt) }));

  const seriesRows = await all('SELECT day, COUNT(*) as views, COUNT(DISTINCT sid) as visits FROM visits WHERE day >= ? GROUP BY day', [from]);
  const byDay = {};
  seriesRows.forEach(r => { byDay[r.day] = { views: num(r.views), visits: num(r.visits) }; });
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = doualaDay(now - i * 86400000);
    series.push({ day: d, ...(byDay[d] || { views: 0, visits: 0 }) });
  }

  const topPages = (await all(
    'SELECT path as k, COUNT(*) as cnt FROM visits WHERE day >= ? GROUP BY path ORDER BY cnt DESC LIMIT 10', [from]
  )).map(r => ({ key: r.k, count: num(r.cnt) }));

  // Les 60 dernières visites (sessions), avec leur parcours
  const sessions = (await all(
    `SELECT sid, MIN(ts) as first_ts, MAX(ts) as last_ts, COUNT(*) as views,
            MAX(source) as source, MAX(country) as country, MAX(city) as city,
            MAX(device) as device, MAX(browser) as browser, MAX(os) as os
     FROM visits WHERE ts > ? GROUP BY sid ORDER BY last_ts DESC LIMIT 60`,
    [now - 7 * 86400000]
  )).map(r => ({
    sid: r.sid, first_ts: num(r.first_ts), last_ts: num(r.last_ts), views: num(r.views),
    source: r.source, country: r.country, city: r.city, device: r.device, browser: r.browser, os: r.os
  }));
  if (sessions.length) {
    const marks = sessions.map(() => '?').join(',');
    const trail = await all(`SELECT sid, path, ts FROM visits WHERE sid IN (${marks}) ORDER BY ts ASC`, sessions.map(s => s.sid));
    const bySid = {};
    trail.forEach(t => { (bySid[t.sid] = bySid[t.sid] || []).push({ path: t.path, ts: num(t.ts) }); });
    sessions.forEach(s => { s.pages = bySid[s.sid] || []; });
  }

  return {
    days,
    today: await totals('day = ?', [today]),
    period: await totals('day >= ?', [from]),
    series,
    top_pages: topPages,
    sources: await top('source'),
    countries: await top('country'),
    cities: await top('city'),
    devices: await top('device', 4),
    browsers: await top('browser', 6),
    sessions,
    ...(await getLive())
  };
}

module.exports = {
  initDatabase,
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuoteStatus,
  deleteQuote,
  createMessage,
  getMessages,
  deleteMessage,
  getStats,
  getAllQuotesForExport,
  verifyAdmin,
  recordHit,
  getLive,
  getAnalytics,
  get dialect() { return dialect; }
};
