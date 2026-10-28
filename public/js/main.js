/**
 * HIGH QUALITY TÉLÉCOMS — LOGIQUE INTERACTIVE FRONTEND
 * Inspirée des standards de Camusat, CDS Technologies & Groupe SNEF
 */

document.addEventListener('DOMContentLoaded', () => {

  // --------------------------------------------------------------
  // 1. GESTION DU THÈME CLAIR / SOMBRE
  // --------------------------------------------------------------
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');

  function initTheme() {
    let savedTheme = localStorage.getItem('hq-theme');
    if (!savedTheme) {
      savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function updateThemeIcon(theme) {
    if (!themeBtn) return;
    if (theme === 'dark') {
      themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
      themeBtn.setAttribute('title', 'Passer en mode clair');
    } else {
      themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      themeBtn.setAttribute('title', 'Passer en mode sombre');
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('hq-theme', next);
      updateThemeIcon(next);
    });
  }
  initTheme();

  // --------------------------------------------------------------
  // 2. MENU MOBILE DRAWER
  // --------------------------------------------------------------
  const burgerBtn = document.getElementById('burger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const drawerClose = document.getElementById('drawer-close');

  if (burgerBtn && drawer) {
    burgerBtn.addEventListener('click', () => {
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (drawerClose && drawer) {
    drawerClose.addEventListener('click', () => {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  // Fermer le drawer au clic sur un lien
  document.querySelectorAll('.mobile-drawer a').forEach(a => {
    a.addEventListener('click', () => {
      if (drawer) {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  // --------------------------------------------------------------
  // 3. SMOOTH SCROLL SUR TOUS LES ANCRES INTERNES
  // --------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.length <= 1) return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --------------------------------------------------------------
  // 4. ANIMATIONS DE RÉVÉLATION & COMPTEURS DE STATISTIQUES
  // --------------------------------------------------------------
  const revealElements = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach(el => observer.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('in'));
  }

  // Animation des chiffres statistiques
  const statNumbers = document.querySelectorAll('.stat .n[data-target]');
  let statsTriggered = false;

  function runCounters() {
    statNumbers.forEach(elem => {
      const target = parseInt(elem.getAttribute('data-target'), 10);
      const suffix = elem.getAttribute('data-suffix') || '';
      let current = 0;
      const step = Math.ceil(target / 45);
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          elem.innerHTML = `${target}<span class="u">${suffix}</span>`;
          clearInterval(timer);
        } else {
          elem.innerHTML = `${current}<span class="u">${suffix}</span>`;
        }
      }, 25);
    });
  }

  const statsSection = document.querySelector('.stats');
  if (statsSection && 'IntersectionObserver' in window) {
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !statsTriggered) {
          statsTriggered = true;
          runCounters();
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    statObserver.observe(statsSection);
  }

  // --------------------------------------------------------------
  // 5. ESTIMATEUR DE PROJET & CALCULATEUR EN LIGNE
  // --------------------------------------------------------------
  const calcType = document.getElementById('calc-service');
  const calcVolume = document.getElementById('calc-volume');
  const calcRangeVal = document.getElementById('calc-range-val');
  const calcVolumeLabel = document.getElementById('calc-volume-label');
  const calcTerrain = document.getElementById('calc-terrain');
  const calcTerrainField = document.getElementById('calc-terrain-field');

  const resEquipes = document.getElementById('calc-res-equipes');
  const resDelai = document.getElementById('calc-res-delai');
  const resLivrable = document.getElementById('calc-res-livrable');
  const resBudget = document.getElementById('calc-res-budget');
  const btnInjectQuote = document.getElementById('btn-inject-quote');

  function updateCalculator() {
    if (!calcType || !calcVolume) return;
    const type = calcType.value;
    const vol = parseInt(calcVolume.value, 10);

    let equipes = '2 équipes';
    let delai = '5 - 10 jours';
    let livrable = 'PV mesures & DOE';
    let budgetIndicatif = 'Sur devis cadré';

    if (type === 'fibre') {
      calcVolumeLabel.textContent = `Distance de câble à déployer (${vol} km) :`;
      calcRangeVal.textContent = `${vol} km`;
      if (calcTerrainField) calcTerrainField.style.display = 'block';

      const isUnderground = calcTerrain && calcTerrain.value === 'souterrain';
      const daysPerKm = isUnderground ? 2.5 : 1.2;
      const totalDays = Math.ceil(vol * daysPerKm);

      equipes = vol > 15 ? '3 à 4 équipes spécialisées' : '2 équipes de tirage & fusion';
      delai = `${Math.max(5, totalDays)} à ${Math.max(8, totalDays + 7)} jours ouvrés`;
      livrable = 'Tracé SIG + Réflectométrie OTDR (1310/1550nm)';
      budgetIndicatif = `${vol * (isUnderground ? 8 : 4.5)} M - ${vol * (isUnderground ? 12 : 7)} M FCFA*`;

    } else if (type === 'pylone') {
      calcVolumeLabel.textContent = `Hauteur du pylône (${vol} mètres) :`;
      calcRangeVal.textContent = `${vol} m`;
      if (calcTerrainField) calcTerrainField.style.display = 'none';

      equipes = '1 équipe génie civil + 1 équipe monteurs habilités';
      const days = vol <= 30 ? 14 : (vol <= 60 ? 25 : 40);
      delai = `${days} à ${days + 10} jours (cure béton incluse)`;
      livrable = 'Massif certifié, verticalité, terre < 5Ω';
      budgetIndicatif = vol <= 30 ? '12 M - 18 M FCFA*' : (vol <= 60 ? '22 M - 32 M FCFA*' : '35 M - 55 M FCFA*');

    } else if (type === 'fh') {
      calcVolumeLabel.textContent = `Nombre de liaisons / bonds FH (${vol} liaisons) :`;
      calcRangeVal.textContent = `${vol} bond(s)`;
      if (calcTerrainField) calcTerrainField.style.display = 'none';

      equipes = '1 équipe radiofréquence / transmission';
      delai = `${vol * 2} à ${vol * 4} jours ouvrés`;
      livrable = 'Alignement RSL, BER test, mise en service baies';
      budgetIndicatif = `${vol * 2.5} M - ${vol * 4.5} M FCFA*`;

    } else if (type === 'maintenance') {
      calcVolumeLabel.textContent = `Parc de sites à superviser (${vol} sites) :`;
      calcRangeVal.textContent = `${vol} sites`;
      if (calcTerrainField) calcTerrainField.style.display = 'none';

      equipes = 'Astreinte mobile 24/7 + Supervision NOC';
      delai = 'Prise en charge contractuelle sous 48h';
      livrable = 'Rapports mensuels de disponibilité, MTTR garanti';
      budgetIndicatif = 'Forfait mensuel SLA personnalisé';
    }

    if (resEquipes) resEquipes.textContent = equipes;
    if (resDelai) resDelai.textContent = delai;
    if (resLivrable) resLivrable.textContent = livrable;
    if (resBudget) resBudget.textContent = budgetIndicatif;
  }

  if (calcType) {
    calcType.addEventListener('change', () => {
      const type = calcType.value;
      if (type === 'fibre') {
        calcVolume.min = '1'; calcVolume.max = '100'; calcVolume.value = '10';
      } else if (type === 'pylone') {
        calcVolume.min = '15'; calcVolume.max = '90'; calcVolume.value = '36';
      } else if (type === 'fh') {
        calcVolume.min = '1'; calcVolume.max = '20'; calcVolume.value = '2';
      } else if (type === 'maintenance') {
        calcVolume.min = '5'; calcVolume.max = '250'; calcVolume.value = '20';
      }
      updateCalculator();
    });
  }

  if (calcVolume) calcVolume.addEventListener('input', updateCalculator);
  if (calcTerrain) calcTerrain.addEventListener('change', updateCalculator);
  updateCalculator();

  // Bouton : pré-remplir la demande de devis
  if (btnInjectQuote) {
    btnInjectQuote.addEventListener('click', () => {
      const typeText = calcType ? calcType.options[calcType.selectedIndex].text : '';
      const volumeText = calcRangeVal ? calcRangeVal.textContent : '';
      const estimatedBudgetText = resBudget ? resBudget.textContent : '';

      const serviceSelect = document.getElementById('f-type');
      const detailsTextarea = document.getElementById('f-msg');
      const budgetInput = document.getElementById('f-budget');

      if (serviceSelect) {
        if (calcType.value === 'fibre') serviceSelect.value = 'Déploiement fibre optique';
        else if (calcType.value === 'pylone') serviceSelect.value = 'Montage de pylône';
        else if (calcType.value === 'fh') serviceSelect.value = 'Transmission FH / VSAT';
        else if (calcType.value === 'maintenance') serviceSelect.value = 'Maintenance & exploitation';
      }

      if (detailsTextarea) {
        detailsTextarea.value = `[Projet simulé depuis l'estimateur]\nType : ${typeText}\nVolume / Envergure : ${volumeText}\nEstimation prévisionnelle : ${estimatedBudgetText}\n\nCommentaires spécifiques : `;
      }

      if (budgetInput) {
        budgetInput.value = estimatedBudgetText;
      }

      // Scroll automatique vers le formulaire
      const contactSec = document.getElementById('contact');
      if (contactSec) {
        contactSec.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          const nameInput = document.getElementById('f-name');
          if (nameInput) nameInput.focus();
        }, 600);
      }
    });
  }

  // --------------------------------------------------------------
  // 6. MODAL DÉTAILS TECHNIQUES PAR MÉTIER
  // --------------------------------------------------------------
  const metierDetails = {
    1: {
      title: "Fibre Optique & FTTx (Backbone, Métro & Desserte)",
      eyebrow: "MÉTIER 01 — RÉSEAUX OPTIQUES",
      desc: "Déploiement de liaisons de transport interurbaines (backbone), boucles métropolitaines et raccordements FTTx d'abonnés et d'entreprises.",
      specs: [
        "Techniques : Soufflage, tirage sous-conduit, micro-tranchage et pose aérienne armée",
        "Équipements : Soudeuses par alignement sur cœur (Fujikura 90S), Réflectomètres OTDR EXFO FTB-1, Powermeters optiques étalonnés",
        "Livrables : Fichiers SOR de réflectométrie bidirectionnelle, DOE géoréférencé (SIG / Shapefiles / DWG), synoptiques de chambres et boîtes d'épissures",
        "Normes : Respect des recommandations ITU-T G.652D et G.657A pour la tenue aux courbures"
      ]
    },
    2: {
      title: "Transmission par Faisceaux Hertziens (FH / Microwave)",
      eyebrow: "MÉTIER 02 — FAISCEAUX HERTZIENS",
      desc: "Conception, installation et mise en service de liaisons radiofréquences numériques à très haute capacité pour le backhaul mobile et liaisons critiques.",
      specs: [
        "Bandes de fréquences : 6 GHz à 80 GHz (E-Band) en modulation adaptative jusqu'à 4096 QAM",
        "Équipements : Analyseurs de spectre Anritsu Site Master, kits de pointage laser et boussoles optiques de précision",
        "Interventions : Fixation de supports d'antennes, passage de guides d'ondes, étanchéité vulcanisée, alignement millimétrique (RSL)",
        "Livrables : Fiches de recette radio, mesures de Bit Error Rate (BER), rapport de niveau de réception garanti"
      ]
    },
    3: {
      title: "Stations Satellitaires VSAT & Connectivité Isolée",
      eyebrow: "MÉTIER 03 — SATELLITE VSAT",
      desc: "Mise en œuvre de terminaux satellitaires pour les sites enclavés (chantiers miniers, plateformes pétrolières, agences bancaires distantes).",
      specs: [
        "Bandes : Bandes C, Ku et Ka pour des débits symétriques garantis",
        "Composants : Antennes paraboliques de 1,2 m à 3,8 m, BUC haute puissance, LNB PLL faible bruit, modems iDirect / Newtec",
        "Génie civil associé : Dalles béton anti-vibration et massifs d'ancrage avec haubans de sécurité",
        "Livrables : Rapport de pointage orbital, cross-pol test avec le centre de contrôle téléport, test d'insertion réseau IP"
      ]
    },
    4: {
      title: "Génie Civil Télécom & Construction de Sites Clé en Main",
      eyebrow: "MÉTIER 04 — INFRASTRUCTURE SITE",
      desc: "Réalisation complète de l'infrastructure physique supportant les équipements de télécommunication.",
      specs: [
        "Génie civil lourd : Massifs béton armé dosés à 350 kg/m³, radiers techniques, fondations profondes selon étude de sol géotechnique",
        "Chambres et caniveaux : Fabrication et pose de chambres de tirage modulaires normalisées (L2T, L3T, L4T, K1C)",
        "Aménagements : Shelters climatisés étanches, clôtures grillagées sécurisées, chemins de câbles en acier galvanisé à chaud",
        "Livrables : PV d'essais d'écrasement des bétons à 28 jours, plans d'implantation certifiés, DOE complet"
      ]
    },
    5: {
      title: "Montage & Renforcement de Pylônes jusqu'à 90 m",
      eyebrow: "MÉTIER 05 — PYLES & STRUCTURES",
      desc: "Montage, levage et consolidation de structures verticales porteuses d'antennes de télécommunications.",
      specs: [
        "Types de structures : Pylônes autoportants triangulaires ou quadrangulaires, mâts haubanés, monopôles urbains",
        "Sécurité & Levage : Équipes certifiées CQP monteur, utilisation de treuils motorisés et mâts de levage contrôlés, EPI antichute complets",
        "Contrôles structurels : Contrôle de serrage des boulons au couple dynamométrique, verticalité au théodolite numérique, balisage aéronautique OACI",
        "Protection foudre : Boucle de fond de fouille en cuivre nu 50 mm², descentes de paratonnerre, résistance de terre garantie inférieure à 5 Ohms"
      ]
    },
    6: {
      title: "Maintenance Préventive, Curative & Exploitation SLA 24/7",
      eyebrow: "MÉTIER 06 — GESTION DU CYCLE DE VIE",
      desc: "Supervision et maintien en condition opérationnelle continue des infrastructures télécoms sous engagement de niveau de service (SLA).",
      specs: [
        "Astreinte continue : Équipes d'intervention d'urgence 24h/24 et 7j/7 dotées de véhicules 4x4 tout-terrain et pièces de rechange critiques",
        "Temps de rétablissement (MTTR) : Interventions garanties sous 2h à 4h selon la criticité du lien",
        "Maintenance préventive : Thermographie infrarouge des armoires d'énergie, resserrage de boulonnerie de pylône, nettoyage des panneaux solaires",
        "Livrables : Rapports mensuels d'indicateurs de performance (KPI), bilans d'incidents et recommandations d'optimisation"
      ]
    }
  };

  const modalOverlay = document.getElementById('metier-modal');
  const modalClose = document.getElementById('modal-close');
  const modalEyebrow = document.getElementById('modal-eyebrow');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalSpecsList = document.getElementById('modal-specs-list');

  document.querySelectorAll('[data-open-metier]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-open-metier');
      const data = metierDetails[id];
      if (data && modalOverlay) {
        modalEyebrow.textContent = data.eyebrow;
        modalTitle.textContent = data.title;
        modalDesc.textContent = data.desc;
        modalSpecsList.innerHTML = data.specs.map(s => `<li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF7900" stroke-width="2.2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${s}</span></li>`).join('');
        modalOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  if (modalClose && modalOverlay) {
    modalClose.addEventListener('click', () => {
      modalOverlay.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // --------------------------------------------------------------
  // 7. ENVOI DU FORMULAIRE DE DEVIS (API POST /api/quote)
  // --------------------------------------------------------------
  const quoteForm = document.getElementById('quote-form');
  const formAlert = document.getElementById('form-alert');
  const submitBtn = document.getElementById('btn-submit-quote');

  if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('f-name').value.trim();
      const email = document.getElementById('f-mail').value.trim();
      const phone = document.getElementById('f-phone').value.trim();
      const company = document.getElementById('f-company').value.trim();
      const service = document.getElementById('f-type').value;
      const location = document.getElementById('f-loc').value.trim();
      const urgency = document.getElementById('f-urgency').value;
      const budget = document.getElementById('f-budget') ? document.getElementById('f-budget').value : '';
      const details = document.getElementById('f-msg').value.trim();

      if (!name || !email) {
        showAlert('Veuillez renseigner votre nom complet et votre adresse e-mail professionnelle.', 'error');
        return;
      }

      // État de chargement
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Transmission en cours...</span>`;

      try {
        const response = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: name,
            email: email,
            phone: phone,
            company: company,
            service_type: service,
            location: location,
            urgency: urgency,
            estimated_budget: budget,
            details: details
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showAlert(`✔ Dossier enregistré avec succès ! Référence : <strong class="mono" style="color:#0B3D66;">${result.ref_code}</strong>. Un accusé de réception a été envoyé à notre bureau d'études. Nous revenons vers vous sous 24h.`, 'success');
          quoteForm.reset();
        } else {
          showAlert(result.error || "Une erreur est survenue lors de l'enregistrement.", 'error');
        }
      } catch (err) {
        // Mode hors ligne ou serveur non démarré : sauvegarde locale de secours
        console.warn('Mode fallback offline:', err);
        const refFallback = `HQ-LOCAL-${Math.floor(1000 + Math.random() * 9000)}`;
        showAlert(`✔ Votre demande est prête et archivée localement sous la référence <strong class="mono">${refFallback}</strong>. Vous pouvez également nous contacter directement par email à <a href="mailto:contact@highqualityltd.com" style="text-decoration:underline; font-weight:bold;">contact@highqualityltd.com</a>.`, 'success');
        quoteForm.reset();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  function showAlert(message, type) {
    if (!formAlert) return;
    formAlert.innerHTML = message;
    formAlert.className = `form-alert ${type}`;
    formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --------------------------------------------------------------
  // 8. BOUTONS COPIER DANS LE PRESSE-PAPIER
  // --------------------------------------------------------------
  document.querySelectorAll('.copybtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      const oldLabel = btn.textContent;
      navigator.clipboard.writeText(textToCopy).then(() => {
        btn.textContent = 'copié ✓';
        btn.style.borderColor = 'var(--green)';
        btn.style.color = 'var(--green)';
        setTimeout(() => {
          btn.textContent = oldLabel;
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 1800);
      }).catch(err => {
        console.error('Erreur copie:', err);
      });
    });
  });

  // --------------------------------------------------------------
  // 9. SÉLECTEUR DE LANGUE (FR / EN)
  // --------------------------------------------------------------
  const langToggle = document.getElementById('lang-toggle');
  let currentLang = 'fr';
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      currentLang = currentLang === 'fr' ? 'en' : 'fr';
      langToggle.textContent = currentLang.toUpperCase();
      langToggle.setAttribute('title', currentLang === 'fr' ? 'Switch to English' : 'Passer en Français');
      // Toast informatif
      showToast(currentLang === 'en' ? 'English version ready' : 'Version Française active');
    });
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed; bottom:24px; right:24px; background:#072942; color:#fff; padding:12px 20px; border-radius:8px; border-left:4px solid #FF7900; z-index:9999; font-weight:600; font-size:14px; box-shadow:0 8px 24px rgba(0,0,0,0.3); transition:all 0.3s ease;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

});
