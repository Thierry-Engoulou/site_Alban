require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');
const mailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'hq_telecom_douala_secret_salt_2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Simple système de Token pour sécuriser l'API /admin
function generateToken(username) {
  const payload = `${username}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const parts = raw.split(':');
    if (parts.length < 3) return null;
    const username = parts[0];
    const timestamp = Number(parts[1]);
    const signature = parts[2];
    
    // Validité : 24 heures
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return null;

    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(`${username}:${timestamp}`).digest('hex');
    if (expected === signature) return { username };
    return null;
  } catch (e) {
    return null;
  }
}

// Middleware d'authentification Admin
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Accès non autorisé. Veuillez vous connecter.' });
  }
  req.user = user;
  next();
}

// ==============================================================
// ROUTES PUBLIQUES
// ==============================================================

// 1. Soumission d'une demande de devis
app.post('/api/quote', async (req, res) => {
  try {
    const { client_name, company, email, phone, service_type, location, urgency, details, estimated_budget } = req.body;

    if (!client_name || !email) {
      return res.status(400).json({ error: 'Le nom et une adresse email valide sont obligatoires.' });
    }

    const newQuote = await db.createQuote({
      client_name,
      company,
      email,
      phone,
      service_type: service_type || 'Fibre Optique',
      location: location || 'Douala, Cameroun',
      urgency: urgency || 'Normal',
      details,
      estimated_budget
    });

    // Envoi de l'email de notification en arrière-plan
    mailer.notifyNewQuote(newQuote).catch(err => {
      console.error('Erreur mailer devis:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Votre demande a été enregistrée avec succès. Notre département d’ingénierie étudie votre dossier sous 24h.',
      ref_code: newQuote.ref_code,
      data: newQuote
    });
  } catch (error) {
    console.error('Erreur POST /api/quote:', error);
    return res.status(500).json({ error: 'Une erreur technique est survenue lors de l’enregistrement de votre devis.' });
  }
});

// 2. Soumission d'un message direct
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nom, email et message sont obligatoires.' });
    }

    const savedMsg = await db.createMessage({ name, email, phone, subject, message });

    mailer.notifyNewMessage(savedMsg).catch(err => {
      console.error('Erreur mailer contact:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Votre message a bien été transmis aux équipes de HIGH QUALITY.'
    });
  } catch (error) {
    console.error('Erreur POST /api/contact:', error);
    return res.status(500).json({ error: 'Impossible de transmettre le message pour le moment.' });
  }
});

// 3. Statistiques publiques affichables
app.get('/api/public-stats', async (req, res) => {
  res.json({
    expertises: 6,
    sites_construits: '450+',
    km_fibre: '3 200+',
    disponibilite: '24/7/365',
    sla_compliance: '99.98%'
  });
});

// ==============================================================
// ROUTES ADMINISTRATION (BACK-OFFICE)
// ==============================================================

// 4. Connexion administrateur
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d’utilisateur et mot de passe requis.' });
    }

    const admin = await db.verifyAdmin(username, password);
    if (!admin) {
      return res.status(401).json({ error: 'Identifiants administrateur incorrects.' });
    }

    const token = generateToken(admin.username);
    return res.json({
      success: true,
      token: token,
      user: { id: admin.id, username: admin.username }
    });
  } catch (error) {
    console.error('Erreur /api/admin/login:', error);
    return res.status(500).json({ error: 'Erreur lors de l’authentification.' });
  }
});

// 5. Récupérer les statistiques du Back-Office
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Liste des devis filtrables
app.get('/api/admin/quotes', requireAdmin, async (req, res) => {
  try {
    const { status, search, limit, offset } = req.query;
    const quotes = await db.getQuotes({ status, search, limit, offset });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Consulter un devis
app.get('/api/admin/quotes/:id', requireAdmin, async (req, res) => {
  try {
    const quote = await db.getQuoteById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Modifier le statut ou ajouter une note
app.patch('/api/admin/quotes/:id', requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updated = await db.updateQuoteStatus(req.params.id, status, notes);
    res.json({ success: true, quote: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Supprimer un devis
app.delete('/api/admin/quotes/:id', requireAdmin, async (req, res) => {
  try {
    await db.deleteQuote(req.params.id);
    res.json({ success: true, message: 'Dossier supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Export de la base en format CSV (pour Excel ou ERP)
app.get('/api/admin/export-csv', requireAdmin, async (req, res) => {
  try {
    const quotes = await db.getAllQuotesForExport();
    
    let csv = 'ID;Référence;Client;Entreprise;Email;Téléphone;Métier;Localisation;Urgence;Budget;Statut;Date;Notes\n';
    quotes.forEach(q => {
      const clean = (val) => `"${String(val || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      csv += [
        q.id,
        clean(q.ref_code),
        clean(q.client_name),
        clean(q.company),
        clean(q.email),
        clean(q.phone),
        clean(q.service_type),
        clean(q.location),
        clean(q.urgency),
        clean(q.estimated_budget),
        clean(q.status),
        clean(q.created_at),
        clean(q.notes)
      ].join(';') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="HIGH_QUALITY_DEVIS_${new Date().toISOString().slice(0,10)}.csv"`);
    // Byte Order Mark (BOM) UTF-8 pour Excel
    res.write('\uFEFF');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route d'accès au portail admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback pour toute route vers index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Lancement du serveur et initialisation de la base
async function startServer() {
  await db.initDatabase();
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 SERVEUR HIGH QUALITY TÉLÉCOMS EN LIGNE`);
    console.log(`📡 URL Principale  : http://localhost:${PORT}`);
    console.log(`🔐 Espace Admin    : http://localhost:${PORT}/admin`);
    console.log(`📧 Contact & Devis : contact@highqualityltd.com`);
    console.log(`🏢 Douala · Deido — Cameroun`);
    console.log(`================================================================`);
  });
}

// Initialisation transparente pour Vercel Serverless
db.initDatabase().catch(err => console.warn('Init DB warning:', err.message));

if (require.main === module) {
  startServer().catch(err => {
    console.error('Erreur critique au démarrage du serveur:', err);
  });
}

module.exports = app;
