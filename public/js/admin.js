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

  // Vérifier si une session est déjà active
  if (currentToken) {
    showDashboard();
  }

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
    loadStats();
    loadQuotes();
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

  function handleAuthError() {
    sessionStorage.removeItem('hq_admin_token');
    currentToken = null;
    dashboardScreen.classList.remove('active');
    loginScreen.style.display = 'flex';
  }

});
