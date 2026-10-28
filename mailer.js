const nodemailer = require('nodemailer');

// Création du transporteur SMTP
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // SMTP non configuré
  }

  const isSecure = process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465;

  return nodemailer.createTransport({
    host: host,
    port: parseInt(process.env.SMTP_PORT || (isSecure ? '465' : '587')),
    secure: isSecure,
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Notification d'une nouvelle demande de devis
async function notifyNewQuote(quote) {
  const transporter = getTransporter();
  const mailTo = process.env.MAIL_TO || 'contact@highqualityltd.com';
  const mailFrom = process.env.MAIL_FROM || `"HIGH QUALITY Télécoms" <contact@highqualityltd.com>`;

  const htmlContent = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:650px; margin:0 auto; background:#ffffff; border:1px solid #e1e8ed; border-radius:12px; overflow:hidden;">
      <div style="background:#072942; padding:24px 30px; border-bottom:4px solid #FF7900;">
        <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:800; letter-spacing:0.5px;">HIGH QUALITY <span style="color:#FF7900; font-size:14px; font-weight:normal; font-family:monospace;">// NOUVEAU DOSSIER DEVIS</span></h1>
        <p style="color:#9fc0d8; margin:6px 0 0; font-size:13px;">Référence du dossier : <strong style="color:#ffffff; font-family:monospace;">${quote.ref_code}</strong></p>
      </div>

      <div style="padding:28px 30px; color:#10222f; font-size:15px; line-height:1.6;">
        <p style="margin-top:0;">Une nouvelle demande d'ingénierie / devis vient d'être enregistrée sur la plateforme web :</p>
        
        <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:14px;">
          <tr style="border-bottom:1px solid #eef2f5;">
            <td style="padding:10px 0; color:#5b6b77; font-weight:600; width:35%;">Client / Contact :</td>
            <td style="padding:10px 0; font-weight:700; color:#072942;">${quote.client_name}</td>
          </tr>
          <tr style="border-bottom:1px solid #eef2f5;">
            <td style="padding:10px 0; color:#5b6b77; font-weight:600;">Entreprise / Entité :</td>
            <td style="padding:10px 0;">${quote.company || 'Non renseigné'}</td>
          </tr>
          <tr style="border-bottom:1px solid #eef2f5;">
            <td style="padding:10px 0; color:#5b6b77; font-weight:600;">Email professionnel :</td>
            <td style="padding:10px 0;"><a href="mailto:${quote.email}" style="color:#0B3D66; text-decoration:none; font-weight:600;">${quote.email}</a></td>
          </tr>
          <tr style="border-bottom:1px solid #eef2f5;">
            <td style="padding:10px 0; color:#5b6b77; font-weight:600;">Téléphone :</td>
            <td style="padding:10px 0; font-family:monospace; font-weight:600;">${quote.phone || 'Non renseigné'}</td>
          </tr>
          <tr style="border-bottom:1px solid #eef2f5;">
            <td style="padding:10px 0; color:#5b6b77; font-weight:600;">Domaine d'expertise :</td>
            <td style="padding:10px 0;"><span style="background:#eaf2f8; color:#0B3D66; padding:3px 10px; border-radius:6px; font-weight:700; font-size:13px;">${quote.service_type}</span></td>
          </tr>
          <tr style="border-bottom:1px solid #eef2f5;">
            <td style="padding:10px 0; color:#5b6b77; font-weight:600;">Localisation du site :</td>
            <td style="padding:10px 0;">${quote.location || 'Douala / National'}</td>
          </tr>
          <tr style="border-bottom:1px solid #eef2f5;">
            <td style="padding:10px 0; color:#5b6b77; font-weight:600;">Degré d'urgence :</td>
            <td style="padding:10px 0;"><strong style="color:${quote.urgency === 'Urgent' ? '#c00007' : '#0B3D66'};">${quote.urgency}</strong></td>
          </tr>
        </table>

        <div style="background:#f5f7f9; border-left:4px solid #FF7900; padding:16px 20px; border-radius:0 8px 8px 0; margin:22px 0;">
          <h4 style="margin:0 0 8px; color:#072942; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">Cahier des charges & Détails du besoin :</h4>
          <p style="margin:0; white-space:pre-wrap; font-size:14px; color:#334155;">${quote.details || 'Aucun détail supplémentaire précisé.'}</p>
        </div>

        <p style="margin:25px 0 0; font-size:13px; color:#64748b;">
          Ce dossier est consultable et administrable directement depuis votre espace de gestion interne : <br>
          <a href="http://localhost:3000/admin" style="display:inline-block; margin-top:10px; background:#0B3D66; color:#ffffff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:700;">Accéder au tableau de bord</a>
        </p>
      </div>

      <div style="background:#eef2f5; padding:16px 30px; font-size:12px; color:#64748b; text-align:center; border-top:1px solid #dce4ea;">
        HIGH QUALITY Ltd · Bâtisseur d'Infrastructures & Services Télécoms · Douala, Cameroun
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`ℹ [MAIL SIMULÉ] Devis reçu pour ${quote.client_name} (${quote.ref_code}). Configuration SMTP en attente dans .env`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: mailFrom,
      to: mailTo,
      replyTo: quote.email,
      subject: `[DEVIS TÉLÉCOM] ${quote.ref_code} - ${quote.client_name} (${quote.service_type})`,
      html: htmlContent
    });
    console.log('✔ Email de notification de devis expédié avec succès :', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('⚠ Erreur lors de l’envoi de l’email de devis :', err.message);
    return { success: false, error: err.message };
  }
}

// Notification d'un message direct
async function notifyNewMessage(msg) {
  const transporter = getTransporter();
  const mailTo = process.env.MAIL_TO || 'contact@highqualityltd.com';
  const mailFrom = process.env.MAIL_FROM || `"HIGH QUALITY Télécoms" <contact@highqualityltd.com>`;

  if (!transporter) {
    console.log(`ℹ [MAIL SIMULÉ] Message reçu de ${msg.name} <${msg.email}>: "${msg.subject}"`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: mailFrom,
      to: mailTo,
      replyTo: msg.email,
      subject: `[CONTACT WEB] ${msg.subject || 'Nouveau message'} - ${msg.name}`,
      text: `De: ${msg.name} <${msg.email}>\nTél: ${msg.phone || 'Non renseigné'}\n\nMessage:\n${msg.message}`
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('⚠ Erreur envoi email contact :', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  notifyNewQuote,
  notifyNewMessage
};
