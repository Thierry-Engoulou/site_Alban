# 📡 HIGH QUALITY Télécoms — Application Web & Portail d'Ingénierie

Application web d'entreprise pour **HIGH QUALITY Ltd**, bâtisseur d'infrastructures et de services télécoms au Cameroun et en Afrique centrale (Fibre optique, Transmission FH, VSAT, Génie civil, Montage de pylônes et Maintenance 24/7).

Inspirée des standards internationaux de **Camusat**, **CDS Technologies** et **Groupe SNEF**.

---

## 🌟 Fonctionnalités Principales

### 1. Site Vitrine & Ingénierie Télécom (Front-End)
- **Design Industriel & Blueprint Télécom** : Charte graphique bleu marine profond (`#072942`, `#0B3D66`) et orange d'action (`#FF7900`), typographies professionnelles (*Archivo*, *IBM Plex Sans*, *IBM Plex Mono*).
- **Mode Sombre / Clair (Dark & Light Theme)** automatique avec mémorisation des préférences utilisateur.
- **Top Bar de Télémesure & Statut NOC 24/7/365** avec badge pulsant.
- **Hero Banner dynamique** avec télémétrie des capacités opérationnelles.
- **Compteurs de statistiques animés** au défilement (Sites construits, km de fibre, SLA).
- **Section "Nos Métiers" (6 pôles majeurs)** avec fiches techniques détaillées en modale interactive (moyens matériels, livrables, normes ITU-T / ISO).
- **Savoir-Faire Terrain (Inspiration CDS Technologies)** : Comparatif technique détaillé entre la *Pose Aérienne sur Appuis* et la *Pose Souterraine sous Fourreaux*.
- **Démarche Qualité en 6 Étapes à Points d'Arrêt** avec engagement strict **QHSE & Zéro Accident**.
- **Les 5 Piliers d'Exécution** (Ambition, Excellence, Système, Croissance, Impact).
- **Références, Secteurs & Confidentialité (NDA)** avec garanties pour opérateurs et équipementiers.
- **Simulateur / Estimateur de Projet en Ligne** : Calculateur réactif permettant d'estimer instantanément le nombre d'équipes, la durée d'intervention, les livrables et la fourchette budgétaire, avec injection directe dans le devis en 1 clic.
- **Formulaire de Devis interactif** connecté à l'API backend avec génération automatique d'une référence unique (ex: `HQ-2026-XXXX`).

### 2. Backend & Base de Données
- **Serveur Express.js moderne et sécurisé**.
- **Base de Données au choix** :
  - **PostgreSQL / Neon** (recommandé sur Vercel) : activé dès que `DATABASE_URL` existe, ce que fait Vercel quand la base Neon est connectée au projet (onglet Storage).
  - **SQLite embarqué** (par défaut, zéro configuration requise, idéal pour tester immédiatement en local). Sur Vercel, il n'est pas persistant.
  - **MySQL / MariaDB** (prêt pour la production sur cPanel, phpMyAdmin ou VPS via simple variable dans le fichier `.env`).
- **Service d'Emailing Professionnel SMTP (Nodemailer)** :
  - Envoi automatique d'une notification HTML stylisée à `contact@highqualityltd.com` à chaque nouveau devis ou message.
  - Fallback gracieux si le serveur SMTP n'est pas encore configuré.

### 3. Portail d'Administration Back-Office (`/admin`)
- Accessible via l'URL : `http://localhost:3000/admin`
- **Authentification sécurisée** par jeton de session HMAC-SHA256 (identifiants définis par `ADMIN_USER` et `ADMIN_PASS` dans `.env` ou dans les variables d'environnement Vercel).
- **Tableau de bord KPI** : Total demandes, Nouveaux devis, En cours d'étude, Devis signés/validés.
- **Recherche temps réel et filtres dynamiques** par statut.
- **Modale d'examen de dossier** : consultation complète du cahier des charges, coordonnées client, budget estimé.
- **Mise à jour du statut en un clic** (`NOUVEAU`, `EN_COURS`, `DEVIS_TRANSMIS`, `SIGNE`, `ARCHIVE`).
- **Export CSV en un clic** pour intégration directe dans Excel ou votre logiciel ERP/Comptabilité.
- **Onglets Messages et Candidatures** : lecture, réponse par e-mail, suppression.
- **Onglet Visiteurs** : personnes en ligne (rafraîchi toutes les 10 s), visites par jour, provenance, pays, villes, appareils, pages vues et parcours des dernières visites.
  La mesure est anonyme : un identifiant aléatoire par onglet, effacé à sa fermeture, sans cookie ni adresse IP enregistrée. Les visites des navigateurs connectés à l'admin ne sont pas comptées. Les visites de plus de 13 mois sont supprimées automatiquement.

---

## 📁 Structure du Projet

```text
site_Alban/
├── .env                  # Configuration active (Port, DB, SMTP, Admin)
├── .env.example          # Modèle de configuration pour la production
├── package.json          # Dépendances Node.js
├── server.js             # Serveur Express, API REST et routage
├── database.js           # Couche de données (SQLite natif + MySQL)
├── mailer.js             # Service d'envoi d'emails professionnels
├── data/
│   └── highquality.db    # Base SQLite (créée automatiquement au démarrage)
├── public/               # Interface Web
│   ├── index.html        # Accueil
│   ├── metiers.html      # Les six métiers
│   ├── references.html   # Clients, zones d'intervention, chantiers types
│   ├── entreprise.html   # Histoire, valeurs, démarche qualité, QHSE
│   ├── carrieres.html    # Postes et formulaire de candidature
│   ├── contact.html      # Demande de devis et message
│   ├── admin.html        # Interface du portail d'administration
│   ├── img/favicon.svg
│   ├── css/
│   │   ├── site.css      # Feuille de styles du site public
│   │   └── admin.css     # Styles du tableau de bord d'administration
│   └── js/
│       ├── site.js       # Interactions du site public (menu, formulaires, carte…)
│       ├── carte-data.js # Contours des régions du Cameroun (geoBoundaries, CC BY 4.0)
│       └── admin.js      # Logique du dashboard admin

> En-tête et pied de page sont répétés dans chaque page HTML : pensez à modifier les six fichiers.
> Photos : Unsplash (licence libre, usage commercial autorisé, sans attribution obligatoire).
└── README.md             # Guide complet d'utilisation et de déploiement
```

---

## 🚀 Démarrage Rapide en Local

### 1. Prérequis
- Node.js (version 18, 20 ou 22+)
- Les dépendances sont déjà installées dans le dossier.

### 2. Lancement du serveur
Ouvrez un terminal dans le dossier `site_Alban` et exécutez :
```bash
npm start
```

### 3. Accès aux pages
- **Site public** : [http://localhost:3000](http://localhost:3000)
- **Espace Administration** : [http://localhost:3000/admin](http://localhost:3000/admin)
  - Utilisateur : `admin`
  - Mot de passe : celui défini par `ADMIN_PASS` dans votre fichier `.env`

---

## ⚙️ Configuration du Domaine, Email et Base de Données

Modifiez le fichier `.env` selon vos accès hébergeur :

### A. Connexion à votre Base de Données MySQL (cPanel / phpMyAdmin)
1. Créez votre base de données sur cPanel (ex: `u123456_highquality`).
2. Dans le fichier `.env`, modifiez :
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=votre_utilisateur_mysql
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=u123456_highquality
```
*Toutes les tables (`quotes`, `messages`, `admin_users`) et le compte administrateur seront créés automatiquement dès le premier démarrage !*

### B. Configuration de l'Email Professionnel (`contact@highqualityltd.com`)
Dans le fichier `.env` :
```env
SMTP_HOST=mail.highqualityltd.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@highqualityltd.com
SMTP_PASS=votre_mot_de_passe_email
MAIL_FROM="HIGH QUALITY Télécoms" <contact@highqualityltd.com>
MAIL_TO=contact@highqualityltd.com
```

### C. Sécurité du Back-Office
Modifiez les identifiants administrateur dans `.env` :
```env
ADMIN_USER=admin
ADMIN_PASS=VotreMotDePasseTresSecurise2026!
SESSION_SECRET=cle_secrete_aleatoire_a_changer
```

---

## 🌐 Déploiement en Production

### Option 1 : Déploiement sur cPanel (Setup Node.js App)
1. Connectez-vous à votre cPanel et allez dans **Setup Node.js App**.
2. Créez une application :
   - **Node.js version** : 20.x ou 22.x
   - **Application mode** : Production
   - **Application root** : `site_Alban` (ou le dossier où vous téléversez les fichiers)
   - **Application startup file** : `server.js`
3. Téléversez les fichiers du projet par FTP ou le Gestionnaire de Fichiers.
4. Cliquez sur **Run NPM Install** ou assurez-vous que les dépendances sont présentes.
5. Cliquez sur **Restart Application**. Le site est en ligne avec HTTPS sous votre nom de domaine !

### Option 2 : Déploiement sur VPS Linux (Ubuntu / Debian avec PM2)
```bash
# Installation de PM2 (gestionnaire de processus)
npm install -g pm2

# Lancement de l'application
pm2 start server.js --name "highquality-web"

# Sauvegarde pour redémarrage automatique en cas de reboot
pm2 save
pm2 startup
```

---

## 📞 Support & Contacts HIGH QUALITY Ltd
- **Siège Social** : Douala — Deido, Cameroun
- **Email Officiel** : `contact@highqualityltd.com`
- **Astreinte Technique** : 24h/24, 7j/7, 365j/an
