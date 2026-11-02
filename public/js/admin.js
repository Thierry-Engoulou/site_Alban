/**
 * HIGH QUALITY TÉLÉCOMS — DASHBOARD ADMINISTRATEUR & GESTION DES DEVIS
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('login-screen');
  const dashboardScreen = document.getElementById('dashboard-screen');
  const loginForm = document.getElementById('admin-login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const exportCsvBtn = document.getElementById('btn-export-csv');

  // Éléments du dashboard
  const kpiTotal = document.getElementById('kpi-total');
  const kpiNouveau = document.getElementById('kpi-nouveau');
  const kpiEnCours = document.getElementById('kpi-encours');
  const kpiValide = document.getElementById('kpi-valide');
  const tableBody = document.getElementById('quotes-table-body');
  const searchInput = document.getElementById('admin-search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // Modal détail devis
  const leadModal = document.getElementById('lead-modal');
  const leadModalClose = document.getElementById('lead-modal-close');
  const leadModalBody = document.getElementById('lead-modal-body');

  let currentToken = sessionStorage.getItem('hq_admin_token') || null;
  let currentStatusFilter = 'TOUS';
  let currentSearchQuery = '';
  let quotesCache = [];

  // 1. Soumission connexion
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('admin-user').value.trim();
      const pass = document.getElementById('admin-pass').value.trim();

      loginError.style.display = 'none';

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass })
        });

        const data = await res.json();
        if (res.ok && data.token) {
          currentToken = data.token;
          sessionStorage.setItem('hq_admin_token', currentToken);
          showDashboard();
        } else {
          loginError.textContent = data.error || 'Identifiants invalides.';
          loginError.style.display = 'block';
        }
      } catch (err) {
        loginError.textContent = 'Erreur de connexion au serveur.';
        loginError.style.display = 'block';
      }
    });
  }

  // 2. Déconnexion
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      stopPolling();
      sessionStorage.removeItem('hq_admin_token');
      currentToken = null;
      dashboardScreen.classList.remove('active');
      loginScreen.style.display = 'flex';
    });
  }

  // 3. Afficher le dashboard et charger les données
  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardScreen.classList.add('active');
    // Ce navigateur appartient à l'équipe : ses visites du site public ne sont pas comptées
    try { localStorage.setItem('hq-admin', '1'); } catch (e) {}
    loadStats();
    loadQuotes();
    loadAnalytics();
    startLivePolling();
  }

  // 4. Charger les statistiques KPI
  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (!res.ok) {
        handleAuthError();
        return;
      }
      const stats = await res.json();
      if (kpiTotal) kpiTotal.textContent = stats.total_quotes || 0;
      if (kpiNouveau) kpiNouveau.textContent = stats.nouveaux_quotes || 0;
      if (kpiEnCours) kpiEnCours.textContent = stats.en_cours_quotes || 0;
      if (kpiValide) kpiValide.textContent = stats.valides_quotes || 0;
      setBadge('badge-quotes', stats.nouveaux_quotes);
      setBadge('badge-messages', stats.total_messages);
      setBadge('badge-candidatures', stats.total_candidatures);
    } catch (e) {
      console.error('Erreur chargement stats:', e);
    }
  }

  // 5. Charger la liste des devis
  async function loadQuotes() {
    try {
      let url = `/api/admin/quotes?status=${encodeURIComponent(currentStatusFilter)}`;
      if (currentSearchQuery) {
        url += `&search=${encodeURIComponent(currentSearchQuery)}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (!res.ok) {
        handleAuthError();
        return;
      }

      quotesCache = await res.json();
      renderTable(quotesCache);
    } catch (e) {
      console.error('Erreur chargement devis:', e);
    }
  }

  // 6. Rendu HTML du tableau
  function renderTable(quotes) {
    if (!tableBody) return;
    if (!quotes || quotes.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#64748b;">Aucun dossier de devis trouvé.</td></tr>`;
      return;
    }

    tableBody.innerHTML = quotes.map(q => {
      const dateStr = q.created_at ? new Date(q.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      return `
        <tr>
          <td><strong class="mono" style="color:#0B3D66;">${escapeHtml(q.ref_code)}</strong></td>
          <td>
            <strong>${escapeHtml(q.client_name)}</strong><br>
            <span style="font-size:0.8rem; color:#64748b;">${escapeHtml(q.company || 'Particulier/Indép.')}</span>
          </td>
          <td><span style="font-weight:600;">${escapeHtml(q.service_type)}</span></td>
          <td><span style="font-size:0.85rem; color:#475569;">${escapeHtml(q.location || 'Douala')}</span></td>
          <td><span class="status-badge ${q.status}">${formatStatus(q.status)}</span></td>
          <td style="font-size:0.84rem; color:#64748b;">${dateStr}</td>
          <td>
            <div class="action-btns">
              <button class="btn-view" onclick="window.viewQuote(${q.id})">Examiner</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function formatStatus(status) {
    switch (status) {
      case 'NOUVEAU': return 'Nouveau';
      case 'EN_COURS': return 'En étude';
      case 'DEVIS_TRANSMIS': return 'Devis envoyé';
      case 'SIGNE': return 'Validé / Signé';
      case 'ARCHIVE': return 'Archivé';
      default: return status || 'Nouveau';
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 7. Filtres par statut
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.getAttribute('data-status');
      loadQuotes();
    });
  });

  // 8. Recherche avec debounce
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearchQuery = searchInput.value.trim();
        loadQuotes();
      }, 300);
    });
  }

  // 9. Examiner un devis en modal
  window.viewQuote = async function (id) {
    const q = quotesCache.find(item => item.id === id);
    if (!q || !leadModalBody) return;

    document.getElementById('lead-modal-title').textContent = "Détail du Dossier d'Ingénierie";
    leadModalBody.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <span class="mono" style="background:#eaf2f8; color:#0B3D66; font-weight:800; padding:4px 10px; border-radius:6px;">${escapeHtml(q.ref_code)}</span>
        <span class="status-badge ${q.status}">${formatStatus(q.status)}</span>
      </div>

      <table class="lead-details-table">
        <tr><td>Nom complet :</td><td><strong>${escapeHtml(q.client_name)}</strong></td></tr>
        <tr><td>Organisation / Société :</td><td>${escapeHtml(q.company || 'Non renseigné')}</td></tr>
        <tr><td>Email professionnel :</td><td><a href="mailto:${escapeHtml(q.email)}" style="color:#0B3D66; font-weight:600;">${escapeHtml(q.email)}</a></td></tr>
        <tr><td>Téléphone / WhatsApp :</td><td><span class="mono" style="font-weight:700;">${escapeHtml(q.phone || 'Non renseigné')}</span></td></tr>
        <tr><td>Métier concerné :</td><td><strong>${escapeHtml(q.service_type)}</strong></td></tr>
        <tr><td>Localisation du chantier :</td><td>${escapeHtml(q.location || 'Douala / National')}</td></tr>
        <tr><td>Degré d'urgence :</td><td><strong style="color:${q.urgency === 'Urgent' ? '#d92d20' : '#0B3D66'}">${escapeHtml(q.urgency)}</strong></td></tr>
        <tr><td>Budget prévisionnel :</td><td><span class="mono">${escapeHtml(q.estimated_budget || 'À définir')}</span></td></tr>
        <tr><td>Date de dépôt :</td><td>${new Date(q.created_at).toLocaleString('fr-FR')}</td></tr>
      </table>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:20px;">
        <h5 style="margin:0 0 6px; color:#072942; font-size:0.85rem; text-transform:uppercase; font-family:monospace;">Détails & Cahier des charges :</h5>
        <p style="margin:0; white-space:pre-wrap; font-size:0.92rem; color:#334155;">${escapeHtml(q.details || 'Aucune précision complémentaire fournie.')}</p>
      </div>

      <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:16px; margin-bottom:20px;">
        <label style="display:block; font-size:0.82rem; font-weight:700; color:#92400e; margin-bottom:6px;">Mettre à jour le statut du dossier :</label>
        <div style="display:flex; gap:10px;">
          <select id="modal-status-select" style="padding:8px 12px; border:1px solid #d97706; border-radius:6px; font-weight:700; flex:1;">
            <option value="NOUVEAU" ${q.status === 'NOUVEAU' ? 'selected' : ''}>Nouveau</option>
            <option value="EN_COURS" ${q.status === 'EN_COURS' ? 'selected' : ''}>En étude technique</option>
            <option value="DEVIS_TRANSMIS" ${q.status === 'DEVIS_TRANSMIS' ? 'selected' : ''}>Devis chiffré transmis</option>
            <option value="SIGNE" ${q.status === 'SIGNE' ? 'selected' : ''}>Chantier Validé / Signé</option>
            <option value="ARCHIVE" ${q.status === 'ARCHIVE' ? 'selected' : ''}>Archivé</option>
          </select>
          <button onclick="window.saveQuoteStatus(${q.id})" style="background:#072942; color:#fff; border:0; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">Enregistrer</button>
        </div>
      </div>
    `;

    leadModal.classList.add('open');
  };

  // 10. Sauvegarder la mise à jour de statut
  window.saveQuoteStatus = async function (id) {
    const sel = document.getElementById('modal-status-select');
    if (!sel) return;
    const newStatus = sel.value;

    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        leadModal.classList.remove('open');
        loadStats();
        loadQuotes();
      } else {
        alert('Erreur lors de la mise à jour.');
      }
    } catch (err) {
      alert('Erreur réseau.');
    }
  };

  if (leadModalClose && leadModal) {
    leadModalClose.addEventListener('click', () => {
      leadModal.classList.remove('open');
    });
    leadModal.addEventListener('click', (e) => {
      if (e.target === leadModal) leadModal.classList.remove('open');
    });
  }

  // 11. Exporter en CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      window.location.href = `/api/admin/export-csv?token=${encodeURIComponent(currentToken)}`;
    });
  }

  // ==================== 12. ONGLETS ====================
  const tabs = document.querySelectorAll('.admin-tab');
  let currentKind = 'messages';

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      document.querySelectorAll('.admin-panel').forEach(p => { p.hidden = p.id !== tab.dataset.panel; });
      if (tab.dataset.panel === 'panel-messages') { currentKind = tab.dataset.kind; loadMessages(); }
      if (tab.dataset.panel === 'panel-quotes') { loadStats(); loadQuotes(); }
      if (tab.dataset.panel === 'panel-visits') loadAnalytics();
    });
  });

  function setBadge(id, n) {
    const el = document.getElementById(id);
    if (el) el.textContent = n ? n : '';
  }

  async function authGet(url) {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });
    if (res.status === 401) { handleAuthError(); throw new Error('auth'); }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  const TZ = 'Africa/Douala';
  function fmtDateTime(value) {
    if (!value) return '-';
    const d = new Date(typeof value === 'string' && !/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value.replace(' ', 'T') + 'Z' : value);
    return d.toLocaleString('fr-FR', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // ==================== 13. MESSAGES & CANDIDATURES ====================
  const msgBody = document.getElementById('msg-table-body');
  const msgSearch = document.getElementById('msg-search-input');
  let msgCache = [];

  async function loadMessages() {
    try {
      let url = `/api/admin/messages?kind=${encodeURIComponent(currentKind)}`;
      if (msgSearch.value.trim()) url += `&search=${encodeURIComponent(msgSearch.value.trim())}`;
      msgCache = await authGet(url);
      renderMessages();
    } catch (e) {
      if (e.message !== 'auth') msgBody.innerHTML = `<tr><td colspan="6" class="empty">Impossible de charger les messages.</td></tr>`;
    }
  }

  function renderMessages() {
    if (!msgCache.length) {
      msgBody.innerHTML = `<tr><td colspan="6" class="empty">${currentKind === 'candidatures' ? 'Aucune candidature reçue.' : 'Aucun message reçu.'}</td></tr>`;
      return;
    }
    msgBody.innerHTML = msgCache.map(m => `
      <tr>
        <td style="font-size:0.84rem; color:#64748b; white-space:nowrap;">${fmtDateTime(m.created_at)}</td>
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td style="font-size:0.85rem;"><a href="mailto:${escapeHtml(m.email)}" style="color:#0B3D66; font-weight:600;">${escapeHtml(m.email)}</a>${m.phone ? `<br><span class="mono">${escapeHtml(m.phone)}</span>` : ''}</td>
        <td style="font-size:0.88rem;">${escapeHtml((m.subject || '—').replace(/^Candidature — /, ''))}</td>
        <td><div class="msg-cut">${escapeHtml(m.message)}</div></td>
        <td><div class="action-btns">
          <button class="btn-view" onclick="window.viewMessage(${m.id})">Lire</button>
          <button class="btn-del" onclick="window.deleteMessage(${m.id})">Supprimer</button>
        </div></td>
      </tr>`).join('');
  }

  window.viewMessage = function (id) {
    const m = msgCache.find(x => x.id === id);
    if (!m) return;
    document.getElementById('lead-modal-title').textContent = /^Candidature/.test(m.subject || '') ? 'Candidature' : 'Message';
    leadModalBody.innerHTML = `
      <table class="lead-details-table">
        <tr><td>Nom :</td><td><strong>${escapeHtml(m.name)}</strong></td></tr>
        <tr><td>E-mail :</td><td><a href="mailto:${escapeHtml(m.email)}" style="color:#0B3D66; font-weight:600;">${escapeHtml(m.email)}</a></td></tr>
        <tr><td>Téléphone :</td><td><span class="mono" style="font-weight:700;">${escapeHtml(m.phone || 'Non renseigné')}</span></td></tr>
        <tr><td>Objet :</td><td>${escapeHtml(m.subject || '—')}</td></tr>
        <tr><td>Reçu le :</td><td>${fmtDateTime(m.created_at)}</td></tr>
      </table>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
        <p style="margin:0; white-space:pre-wrap; font-size:0.92rem; color:#334155;">${escapeHtml(m.message)}</p>
      </div>
      <p style="margin-top:16px;"><a href="mailto:${escapeHtml(m.email)}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Votre message'))}" style="display:inline-block; background:#072942; color:#fff; padding:9px 16px; border-radius:6px; font-weight:700; text-decoration:none;">Répondre par e-mail</a></p>`;
    leadModal.classList.add('open');
  };

  window.deleteMessage = async function (id) {
    if (!confirm('Supprimer définitivement ce message ?')) return;
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
      if (!res.ok) throw new Error();
      loadMessages();
      loadStats();
    } catch (e) {
      alert('La suppression a échoué.');
    }
  };

  let msgTimer;
  msgSearch.addEventListener('input', () => {
    clearTimeout(msgTimer);
    msgTimer = setTimeout(loadMessages, 300);
  });

  // ==================== 14. VISITEURS ====================
  let rangeDays = 30;
  let liveTimer = null;
  let fullTimer = null;
  const PAGE_NAMES = { '/': 'Accueil', '/metiers': 'Métiers', '/references': 'Références', '/entreprise': 'Entreprise', '/carrieres': 'Carrières', '/contact': 'Contact' };
  const pageName = p => PAGE_NAMES[p] || p;
  let regionNames = null;
  try { regionNames = new Intl.DisplayNames(['fr'], { type: 'region' }); } catch (e) {}
  function countryName(code) {
    if (!code) return 'Inconnu';
    try { if (regionNames) return regionNames.of(code); } catch (e) {}
    return code;
  }

  document.querySelectorAll('#v-range .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#v-range .filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      rangeDays = Number(btn.dataset.days);
      loadAnalytics();
    });
  });

  function renderBars(id, items, label) {
    const el = document.getElementById(id);
    if (!items || !items.length) { el.innerHTML = '<div class="none">Pas encore de données.</div>'; return; }
    const max = Math.max(...items.map(i => i.count));
    el.innerHTML = items.map(i => `
      <div class="bar-row">
        <div class="top"><span title="${escapeHtml(label(i.key))}">${escapeHtml(label(i.key))}</span><b>${i.count}</b></div>
        <div class="track"><div class="fill" style="width:${Math.round(i.count / max * 100)}%"></div></div>
      </div>`).join('');
  }

  function renderLive(data) {
    document.getElementById('live-count').textContent = data.live;
    document.getElementById('v-live').textContent = data.live;
    renderBars('v-now', data.pages.map(p => ({ key: p.path, count: p.count })), pageName);
    if (!data.live) document.getElementById('v-now').innerHTML = '<div class="none">Personne sur le site en ce moment.</div>';
  }

  async function loadLive() {
    try { renderLive(await authGet('/api/admin/live')); } catch (e) { /* nouvel essai au prochain tour */ }
  }

  async function loadAnalytics() {
    try {
      const a = await authGet(`/api/admin/analytics?days=${rangeDays}`);
      document.getElementById('storage-warn').hidden = a.storage === 'postgres' || a.storage === 'mysql';
      document.getElementById('v-today').textContent = a.today.visits;
      document.getElementById('v-today-views').textContent = a.today.views;
      document.getElementById('v-period').textContent = a.period.visits;
      document.getElementById('v-period-views').textContent = a.period.views;
      document.getElementById('v-depth').textContent = a.period.visits ? (a.period.views / a.period.visits).toFixed(1).replace('.', ',') : '0';
      renderLive(a);
      renderChart(a.series);
      renderBars('v-sources', a.sources, k => k);
      renderBars('v-countries', a.countries, countryName);
      renderBars('v-cities', a.cities, k => k);
      renderBars('v-devices', a.devices, k => k);
      renderBars('v-pages', a.top_pages, pageName);
      renderSessions(a.sessions);
    } catch (e) {
      if (e.message !== 'auth') console.error('Erreur fréquentation:', e);
    }
  }

  let lastSeries = null;
  function renderChart(series) {
    lastSeries = series;
    const box = document.getElementById('v-chart');
    const W = box.clientWidth || 800, H = 220, L = 34, B = 24, T = 8;
    const max = Math.max(1, ...series.map(s => s.visits));
    const step = Math.max(1, Math.ceil(max / 4));
    const top = step * Math.ceil(max / step);
    const y = v => T + (H - T - B) * (1 - v / top);
    const band = (W - L) / series.length;
    const bw = Math.max(2, band - Math.max(2, band * 0.25));
    const labelEvery = Math.ceil(series.length / 8);
    let svg = '';
    for (let v = 0; v <= top; v += step) {
      svg += `<line class="grid" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    series.forEach((s, i) => {
      const x = L + i * band + (band - bw) / 2;
      svg += `<rect class="bar-hit" data-i="${i}" x="${L + i * band}" y="${T}" width="${band}" height="${H - T - B}"/>`;
      if (s.visits > 0) {
        const yt = y(s.visits), base = y(0), r = Math.min(4, bw / 2, base - yt);
        svg += `<path class="bar" d="M${x},${base}V${yt + r}Q${x},${yt} ${x + r},${yt}H${x + bw - r}Q${x + bw},${yt} ${x + bw},${yt + r}V${base}Z"/>`;
      } else {
        svg += '<g class="bar"></g>';
      }
      const isLast = i === series.length - 1;
      if ((i % labelEvery === 0 && series.length - 1 - i >= labelEvery / 2) || isLast) {
        const [, m, d] = s.day.split('-');
        svg += `<text class="axis" x="${L + i * band + band / 2}" y="${H - 6}" text-anchor="middle">${d}/${m}</text>`;
      }
    });
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${svg}</svg><div class="chart-tip"></div>`;
    const tip = box.querySelector('.chart-tip');
    box.querySelectorAll('.bar-hit').forEach(hit => {
      hit.addEventListener('mouseenter', () => {
        const s = series[hit.dataset.i];
        const date = new Date(s.day + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
        tip.innerHTML = `<b>${s.visits} visite${s.visits > 1 ? 's' : ''}</b>${s.views} page${s.views > 1 ? 's' : ''} vue${s.views > 1 ? 's' : ''} · ${date}`;
        const i = Number(hit.dataset.i);
        tip.style.left = (L + i * band + band / 2) / W * 100 + '%';
        tip.style.top = Math.max(y(s.visits), T + 20) + 'px';
        tip.style.display = 'block';
      });
      hit.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    });
  }

  function renderSessions(sessions) {
    const body = document.getElementById('v-sessions');
    if (!sessions || !sessions.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">Aucune visite enregistrée pour le moment.</td></tr>';
      return;
    }
    const fmtTime = ts => new Date(ts).toLocaleString('fr-FR', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const dur = s => {
      const min = Math.round((s.last_ts - s.first_ts) / 60000);
      return s.views < 2 ? '—' : min < 1 ? '< 1 min' : min + ' min';
    };
    body.innerHTML = sessions.map((s, i) => `
      <tr class="sess" data-i="${i}">
        <td style="white-space:nowrap; font-size:0.85rem;">${fmtTime(s.last_ts)}</td>
        <td>${escapeHtml([s.city, s.country ? countryName(s.country) : ''].filter(Boolean).join(', ') || 'Inconnu')}</td>
        <td style="font-size:0.85rem;">${escapeHtml(s.device || '')}<br><span style="color:#64748b;">${escapeHtml([s.os, s.browser].filter(Boolean).join(' · '))}</span></td>
        <td>${escapeHtml(s.source || 'Accès direct')}</td>
        <td><strong>${s.views}</strong></td>
        <td>${dur(s)}</td>
      </tr>
      <tr class="trail" data-for="${i}" hidden><td colspan="6"><ol>${(s.pages || []).map(p =>
        `<li><span>${new Date(p.ts).toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}</span>${escapeHtml(pageName(p.path))}</li>`).join('')}</ol></td></tr>`).join('');
    body.querySelectorAll('tr.sess').forEach(row => {
      row.addEventListener('click', () => {
        const trail = body.querySelector(`tr.trail[data-for="${row.dataset.i}"]`);
        trail.hidden = !trail.hidden;
      });
    });
  }

  function startLivePolling() {
    stopPolling();
    liveTimer = setInterval(() => { if (!document.hidden) loadLive(); }, 10000);
    fullTimer = setInterval(() => {
      if (!document.hidden && !document.getElementById('panel-visits').hidden) loadAnalytics();
    }, 60000);
  }

  function stopPolling() {
    clearInterval(liveTimer);
    clearInterval(fullTimer);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (lastSeries) renderChart(lastSeries); }, 200);
  });

  function handleAuthError() {
    stopPolling();
    sessionStorage.removeItem('hq_admin_token');
    currentToken = null;
    dashboardScreen.classList.remove('active');
    loginScreen.style.display = 'flex';
  }

  // Vérifier si une session est déjà active (en dernier : tout ce qui précède doit être prêt)
  if (currentToken) {
    showDashboard();
  }

});
