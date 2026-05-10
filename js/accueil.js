/* js/accueil.js — Tableau de bord Accueil Responsable (SunXP Pro) */
console.log('accueil.js chargé');

function initAccueil() { renderAccueil(); if (typeof updateNavBadges === 'function') updateNavBadges(); }

function renderAccueil() {
  const container = document.getElementById('module-accueil');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;padding:0;overflow-y:auto;align-items:center;';

  const sid = window.getActiveStationId ? window.getActiveStationId() : 'default';

  // Header centré
  const header = document.createElement('div');
  header.style.cssText = 'text-align:center;padding:40px 20px 30px;width:100%;';
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  header.innerHTML = `
    <h1 style="margin:0;font-size:1.8rem;color:var(--text-primary);font-weight:800;">${greeting} 👋</h1>
    <p style="margin:6px 0 0;font-size:13px;color:var(--text-muted);">Voici le résumé de votre activité</p>
  `;
  container.appendChild(header);

  // Grid de cards organisé par poste
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;padding:0 24px 24px;width:100%;max-width:1100px;';

  // Colonne PARC
  const colParc = document.createElement('div');
  colParc.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
  const parcTitle = document.createElement('div');
  parcTitle.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;text-align:center;padding:6px 0;border-bottom:2px solid #f97316;margin-bottom:4px;';
  parcTitle.textContent = '🚛 PARC';
  colParc.appendChild(parcTitle);
  colParc.appendChild(buildProblemesCard(sid));
  colParc.appendChild(buildCTExpirationCard(sid));
  grid.appendChild(colParc);

  // Colonne DSP/CE
  const colDsp = document.createElement('div');
  colDsp.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
  const dspTitle = document.createElement('div');
  dspTitle.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;text-align:center;padding:6px 0;border-bottom:2px solid var(--accent);margin-bottom:4px;';
  dspTitle.textContent = '📋 DSP / CE';
  colDsp.appendChild(dspTitle);
  colDsp.appendChild(buildHSCard(sid));
  colDsp.appendChild(buildNear35hCard(sid));
  colDsp.appendChild(buildASTCard(sid));
  grid.appendChild(colDsp);

  // Colonne RH
  const colRh = document.createElement('div');
  colRh.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
  const rhTitle = document.createElement('div');
  rhTitle.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;text-align:center;padding:6px 0;border-bottom:2px solid #a78bfa;margin-bottom:4px;';
  rhTitle.textContent = '👤 RH';
  colRh.appendChild(rhTitle);
  colRh.appendChild(buildDemandesCard(sid));
  colRh.appendChild(buildVMExpirationCard(sid));
  colRh.appendChild(buildAcomptesVirementCard(sid));
  grid.appendChild(colRh);

  container.appendChild(grid);

  // Footer info
  const footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;padding:20px;color:var(--text-muted);font-size:11px;opacity:0.6;';
  const chauffeurs = [];
  try { const r = localStorage.getItem(sid + '-repertoire'); if (r) chauffeurs.push(...JSON.parse(r)); } catch(_) {}
  footer.textContent = `${chauffeurs.length} chauffeur${chauffeurs.length > 1 ? 's' : ''} enregistré${chauffeurs.length > 1 ? 's' : ''} • ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
  container.appendChild(footer);
}

/* ── Card Demandes en attente ─────────────────────────────── */
function buildDemandesCard(sid) {
  let repos = 0, acomptes = 0, conges = 0;
  try { repos = (JSON.parse(localStorage.getItem(sid + '-repos-demandes')) || []).filter(d => d.statut === 'en_attente').length; } catch(_) {}
  try { acomptes = (JSON.parse(localStorage.getItem(sid + '-acomptes')) || []).filter(d => d.statut === 'en_attente').length; } catch(_) {}
  try { conges = (JSON.parse(localStorage.getItem(sid + '-conges-payes')) || []).filter(d => d.statut === 'en_attente').length; } catch(_) {}
  const total = repos + acomptes + conges;

  const card = createCard('📋', 'Demandes en attente', total);
  const body = card.querySelector('.accueil-card-body');

  if (total === 0) {
    body.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin:8px 0;">✅ Aucune demande en attente</p>';
  } else {
    body.innerHTML = `
      <div style="display:flex;justify-content:center;margin:8px 0;">
        <span style="font-size:28px;font-weight:800;color:#f59e0b;">${total}</span>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;font-size:11px;color:var(--text-muted);">
        ${repos ? `<span>📅 ${repos} repos</span>` : ''}
        ${acomptes ? `<span>💶 ${acomptes} acompte${acomptes > 1 ? 's' : ''}</span>` : ''}
        ${conges ? `<span>🏖 ${conges} congé${conges > 1 ? 's' : ''}</span>` : ''}
      </div>`;
  }

  card.querySelector('.accueil-card-body').style.cursor = 'pointer';
  card.querySelector('.accueil-card-body').onclick = function() { showModule('heures'); setTimeout(function() { var btn = document.getElementById('hamburger-btn'); if (btn) btn.click(); setTimeout(function() { if (typeof setMenuTab === 'function') setMenuTab('demandes-mgr'); }, 100); }, 100); };
  return card;
}

/* ── Card Alertes H.S ─────────────────────────────────────── */
function buildHSCard(sid) {
  const card = createCard('⚠️', 'Heures Supp. (semaine -1)');
  const body = card.querySelector('.accueil-card-body');

  let overtimeData = [];
  if (typeof getOvertimeData === 'function') {
    overtimeData = getOvertimeData(sid, new Date());
  }

  if (!overtimeData.length) {
    body.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin:8px 0;">✅ Aucune heure supplémentaire</p>';
  } else {
    let html = `<div style="display:flex;justify-content:center;margin:8px 0;"><span style="font-size:28px;font-weight:800;color:#f87171;">${overtimeData.length}</span></div>`;
    html += '<div style="max-height:100px;overflow-y:auto;font-size:11px;">';
    overtimeData.slice(0, 5).forEach(item => {
      html += `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);"><span>${item.nom}</span><span style="color:#f87171;font-weight:700;">+${typeof minToTime === 'function' ? minToTime(item.supMin) : item.supMin + 'min'}</span></div>`;
    });
    if (overtimeData.length > 5) html += `<div style="text-align:center;color:var(--text-muted);font-size:10px;margin-top:4px;">+${overtimeData.length - 5} autres...</div>`;
    html += '</div>';
    body.innerHTML = html;
  }

  card.querySelector('.accueil-card-body').style.cursor = 'pointer';
  card.querySelector('.accueil-card-body').onclick = () => { showModule('heures'); };
  return card;
}

/* ── Card Proches 35h ──────────────────────────────────────── */
function buildNear35hCard(sid) {
  const card = createCard('🟡', 'Proches des 35h (semaine en cours)');
  const body = card.querySelector('.accueil-card-body');

  let near35h = [];
  if (typeof getNear35hData === 'function') {
    near35h = getNear35hData(sid, new Date());
  }

  if (!near35h.length) {
    body.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin:8px 0;">✅ Personne proche des 35h</p>';
  } else {
    let html = `<div style="display:flex;justify-content:center;margin:8px 0;"><span style="font-size:28px;font-weight:800;color:#fbbf24;">${near35h.length}</span></div>`;
    html += '<div style="max-height:100px;overflow-y:auto;font-size:11px;">';
    near35h.slice(0, 5).forEach(item => {
      html += `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);"><span>${item.nom}</span><span style="color:#fbbf24;font-weight:700;">${item.heures}</span></div>`;
    });
    if (near35h.length > 5) html += `<div style="text-align:center;color:var(--text-muted);font-size:10px;margin-top:4px;">+${near35h.length - 5} autres...</div>`;
    html += '</div>';
    body.innerHTML = html;
  }

  card.querySelector('.accueil-card-body').style.cursor = 'pointer';
  card.querySelector('.accueil-card-body').onclick = () => { showModule('heures'); };
  return card;
}

/* ── Card Problèmes camions ───────────────────────────────── */
function buildProblemesCard(sid) {
  const card = createCard('🚛', 'Problèmes camions (dernières 24h)');
  const body = card.querySelector('.accueil-card-body');

  let problemes = [];
  try { problemes = JSON.parse(localStorage.getItem(sid + '-problemes-camions')) || []; } catch(_) {}

  // Filtrer les problèmes des dernières 24h
  const now = Date.now();
  const recent = problemes.filter(p => p.date && (now - new Date(p.date).getTime()) < 24 * 60 * 60 * 1000);

  if (!recent.length) {
    body.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin:8px 0;">✅ Aucun problème signalé</p>';
  } else {
    let html = `<div style="display:flex;justify-content:center;margin:8px 0;"><span style="font-size:28px;font-weight:800;color:#f97316;">${recent.length}</span></div>`;
    html += '<div style="max-height:100px;overflow-y:auto;font-size:11px;">';
    recent.forEach(p => {
      const note = (p.note || '').substring(0, 40) + ((p.note || '').length > 40 ? '...' : '');
      html += `<div style="padding:3px 0;border-bottom:1px solid var(--border);"><span style="font-weight:600;">${p.plaque}</span> — <span style="color:var(--text-muted);">${note}</span></div>`;
    });
    html += '</div>';
    body.innerHTML = html;
  }

  card.querySelector('.accueil-card-body').style.cursor = 'pointer';
  card.querySelector('.accueil-card-body').onclick = () => { showModule('flotte'); setTimeout(() => { if (typeof renderFlotte === 'function') { flotteTab = 'problemes'; renderFlotte(); } }, 50); };
  return card;
}

/* ── Helper : créer une card ──────────────────────────────── */
function createCard(icon, title, badgeCount) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:0;transition:transform 0.18s,box-shadow 0.18s,border-color 0.18s;position:relative;overflow:hidden;';
  card.onmouseenter = () => { card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; card.style.borderColor = 'var(--accent)'; };
  card.onmouseleave = () => { card.style.boxShadow = ''; card.style.borderColor = 'var(--border)'; };

  const badgeHtml = badgeCount > 0 ? '<span style="background:#f87171;color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;">' + badgeCount + '</span>' : '';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;user-select:none;';
  header.innerHTML = '<span style="font-size:20px;">' + icon + '</span><span style="font-size:13px;font-weight:700;color:var(--text-primary);flex:1;">' + title + '</span>' + badgeHtml + '<span class="card-toggle" style="font-size:12px;color:var(--text-muted);transition:transform 0.2s;">▼</span>';
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'accueil-card-body';
  body.style.cssText = 'display:none;padding:0 16px 14px;';
  card.appendChild(body);

  // Toggle ouverture/fermeture
  header.onclick = function(e) {
    e.stopPropagation();
    var isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    header.querySelector('.card-toggle').style.transform = isOpen ? '' : 'rotate(180deg)';
  };

  return card;
}

/* ── Card VM expirantes (RH) ──────────────────────────────── */
function buildVMExpirationCard(sid) {
  const expiring = getVMExpiringSoon(sid);
  const card = createCard('🩺', 'Visites médicales à renouveler', expiring.length);
  const body = card.querySelector('.accueil-card-body');

  if (!expiring.length) {
    body.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin:8px 0;">✅ Toutes les VM sont à jour</p>';
  } else {
    let html = `<div style="display:flex;justify-content:center;margin:8px 0;"><span style="font-size:28px;font-weight:800;color:#f87171;">${expiring.length}</span></div>`;
    html += '<div style="max-height:100px;overflow-y:auto;font-size:11px;">';
    expiring.forEach(item => {
      const color = item.expired ? '#f87171' : '#fbbf24';
      const label = item.expired ? 'Expirée' : 'J-' + item.daysLeft;
      html += `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);"><span>${item.nom}</span><span style="color:${color};font-weight:700;">${label}</span></div>`;
    });
    html += '</div>';
    body.innerHTML = html;
  }

  card.querySelector('.accueil-card-body').style.cursor = 'pointer';
  card.querySelector('.accueil-card-body').onclick = () => { showModule('rh'); setTimeout(() => { rhTab = 'suivi-papiers'; renderRH(); }, 50); };
  return card;
}

/* ── Card CT expirantes (PARC) ────────────────────────────── */
function buildCTExpirationCard(sid) {
  const expiring = getCTExpiringSoon(sid);
  const card = createCard('📋', 'CT à renouveler', expiring.length);
  const body = card.querySelector('.accueil-card-body');

  if (!expiring.length) {
    body.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin:8px 0;">✅ Tous les CT sont à jour</p>';
  } else {
    let html = `<div style="display:flex;justify-content:center;margin:8px 0;"><span style="font-size:28px;font-weight:800;color:#f87171;">${expiring.length}</span></div>`;
    html += '<div style="max-height:100px;overflow-y:auto;font-size:11px;">';
    expiring.forEach(item => {
      const color = item.expired ? '#f87171' : '#fbbf24';
      const label = item.expired ? 'Expiré' : 'J-' + item.daysLeft;
      html += `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);"><span>${item.plaque}</span><span style="color:${color};font-weight:700;">${label}</span></div>`;
    });
    html += '</div>';
    body.innerHTML = html;
  }

  card.querySelector('.accueil-card-body').style.cursor = 'pointer';
  card.querySelector('.accueil-card-body').onclick = () => { showModule('flotte'); setTimeout(() => { flotteTab = 'entretien'; renderFlotte(); }, 50); };
  return card;
}

/* ── Card AST + Heures Supp (DSP/CE) ──────────────────────── */
function buildASTCard(sid) {
  // Calculer les données pour le badge
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const data = typeof loadPlanning === 'function' ? loadPlanning(sid, year, month) : {};
  let chauffeurs = [];
  try { chauffeurs = JSON.parse(localStorage.getItem(sid + '-repertoire')) || []; } catch (_) {}
  const eligible = chauffeurs.filter(c => ['Chauffeur', 'Formateur'].includes(c.role));
  const monday = new Date(now);
  const dow = monday.getDay() || 7;
  monday.setDate(monday.getDate() - dow + 1);

  const astList = [];
  eligible.forEach(c => {
    const nom = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
    let rstdCount = 0;
    let alreadyAstreinte = false;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(d.getDate() + i);
      if (d.getMonth() !== month) continue;
      const statut = data[nom + '_' + d.getDate()] || '';
      if (statut === 'RSTD') rstdCount++;
      // Vérifier si déjà mis en Astreinte dans Heures cette semaine
      const dk = sid + '-heures-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      try {
        const raw = localStorage.getItem(dk);
        if (raw) {
          const hData = JSON.parse(raw);
          if (hData.rows) {
            const row = Object.values(hData.rows).find(r => r.nom && r.nom.trim() === nom);
            if (row && row.statut === 'Astreinte') alreadyAstreinte = true;
          }
        }
      } catch (_) {}
    }
    if (rstdCount >= 5 && !alreadyAstreinte) astList.push({ nom, rstdCount });
  });

  let overtimeData = [];
  if (typeof getOvertimeData === 'function') {
    overtimeData = getOvertimeData(sid, now);
  }
  overtimeData.sort((a, b) => b.supMin - a.supMin);

  const badgeCount = astList.length + overtimeData.filter(o => !astList.find(a => a.nom === o.nom)).length;
  const card = createCard('📞', 'Chauffeurs à mettre en AST', badgeCount);
  const body = card.querySelector('.accueil-card-body');

  let html = '';

  // AST
  if (astList.length) {
    html += '<div style="font-size:11px;font-weight:700;color:#f97316;margin-bottom:6px;">📞 Astreintes cette semaine (' + astList.length + ')</div>';
    astList.forEach(a => {
      // Chercher les HS de ce chauffeur
      const hs = overtimeData.find(o => o.nom === a.nom);
      html += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:1px solid var(--border);"><span>' + a.nom + ' <span style="color:#f97316;">(' + a.rstdCount + 'j)</span></span>';
      if (hs) html += '<span style="color:#f87171;font-weight:700;">+' + (typeof minToTime === 'function' ? minToTime(hs.supMin) : hs.supMin + 'min') + '</span>';
      html += '</div>';
    });
  } else {
    html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">✅ Aucune astreinte cette semaine</div>';
  }

  // HS semaine -1 (ceux qui ne sont pas déjà dans AST)
  const hsOnly = overtimeData.filter(o => !astList.find(a => a.nom === o.nom));
  if (hsOnly.length) {
    html += '<div style="font-size:11px;font-weight:700;color:#f87171;margin:10px 0 6px;">⚠️ Heures supp. semaine -1</div>';
    hsOnly.forEach(item => {
      html += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:1px solid var(--border);"><span>' + item.nom + '</span><span style="color:#f87171;font-weight:700;">+' + (typeof minToTime === 'function' ? minToTime(item.supMin) : item.supMin + 'min') + '</span></div>';
    });
  }

  if (!astList.length && !overtimeData.length) {
    html = '<div style="font-size:11px;color:var(--text-muted);text-align:center;">✅ RAS</div>';
  }

  body.innerHTML = html;

  card.querySelector('.accueil-card-body').style.cursor = 'pointer';
  card.querySelector('.accueil-card-body').onclick = () => { showModule('planning'); };
  return card;
}

/* ── Card Virements acomptes (RH) ─────────────────────────── */
function buildAcomptesVirementCard(sid) {
  const virements = getAcomptesVirements(sid);
  const totalVirements = virements.virement15.length + virements.virement22.length;
  const card = createCard('💶', 'Virements acomptes', totalVirements);
  const body = card.querySelector('.accueil-card-body');

  if (!virements.virement15.length && !virements.virement22.length) {
    body.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin:8px 0;">✅ Aucun virement à faire</p>';
  } else {
    let html = '';
    if (virements.virement15.length) {
      const total15 = virements.virement15.reduce((s, v) => s + v.montant, 0);
      html += '<div style="font-size:11px;font-weight:700;color:#f59e0b;margin:6px 0 4px;">💸 Virement le 15 — ' + total15 + '€</div>';
      html += '<div style="max-height:60px;overflow-y:auto;font-size:11px;">';
      virements.virement15.forEach(v => {
        html += '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border);"><span>' + v.nom + '</span><span style="font-weight:700;color:#f59e0b;">' + v.montant + '€</span></div>';
      });
      html += '</div>';
    }
    if (virements.virement22.length) {
      const total22 = virements.virement22.reduce((s, v) => s + v.montant, 0);
      html += '<div style="font-size:11px;font-weight:700;color:#f59e0b;margin:6px 0 4px;">💸 Virement le 22 — ' + total22 + '€</div>';
      html += '<div style="max-height:60px;overflow-y:auto;font-size:11px;">';
      virements.virement22.forEach(v => {
        html += '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border);"><span>' + v.nom + '</span><span style="font-weight:700;color:#f59e0b;">' + v.montant + '€</span></div>';
      });
      html += '</div>';
    }
    body.innerHTML = html;
  }

  card.querySelector('.accueil-card-body').style.cursor = 'pointer';
  card.querySelector('.accueil-card-body').onclick = () => { showModule('heures'); setTimeout(() => { const btn = document.getElementById('hamburger-btn'); if (btn) btn.click(); setTimeout(() => { if (typeof setMenuTab === 'function') setMenuTab('demandes-mgr'); }, 100); }, 100); };
  return card;
}

/* ── Helper virements acomptes ────────────────────────────── */
function getAcomptesVirements(sid) {
  let acomptes = [];
  try { acomptes = JSON.parse(localStorage.getItem(sid + '-acomptes')) || []; } catch (_) {}

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filtrer les acomptes acceptés du mois en cours
  const accepted = acomptes.filter(a => {
    if (a.statut !== 'acceptee') return false;
    const d = new Date(a.dateDemande || a.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const virement15 = []; // demandes du 1 au 14
  const virement22 = []; // demandes du 15 au 22

  accepted.forEach(a => {
    const d = new Date(a.dateDemande || a.date);
    const day = d.getDate();
    const montant = parseFloat(a.montant) || 0;
    if (montant <= 0) return;
    const nom = a.chauffeurNom || '?';
    if (day >= 1 && day <= 14) virement15.push({ nom, montant });
    else if (day >= 15 && day <= 22) virement22.push({ nom, montant });
  });

  return { virement15, virement22 };
}

/* ── Helpers alertes VM et CT ─────────────────────────────── */
function getVMExpiringSoon(sid) {
  let papiers = [];
  try { papiers = JSON.parse(localStorage.getItem(sid + '-suivi-papiers')) || []; } catch (_) {}
  const now = new Date();
  return papiers
    .filter(p => p.type === 'VM' && p.dateFin && !p.rdvPris)
    .map(p => {
      const exp = new Date(p.dateFin);
      const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      return { nom: p.chauffeurNom, dateFin: p.dateFin, daysLeft, expired: daysLeft <= 0 };
    })
    .filter(p => p.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function getCTExpiringSoon(sid) {
  let entretiens = [];
  try { entretiens = JSON.parse(localStorage.getItem(sid + '-suivi-entretien')) || []; } catch (_) {}
  const now = new Date();
  return entretiens
    .filter(e => e.type === 'ct' && e.dateFin && !e.rdvPris)
    .map(e => {
      const exp = new Date(e.dateFin);
      const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      return { plaque: e.plaque, dateFin: e.dateFin, daysLeft, expired: daysLeft <= 0 };
    })
    .filter(e => e.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/* ── Badges de notification sur les onglets ───────────────── */
function updateNavBadges() {
  const sid = window.getActiveStationId ? window.getActiveStationId() : 'default';
  if (sid === 'default') return; // Pas de station sélectionnée

  const vmCount = getVMExpiringSoon(sid).length;
  const ctCount = getCTExpiringSoon(sid).length;

  // Badge sur onglet RH
  const rhTabEl = document.querySelector('.nav-tab[data-module="rh"]');
  if (rhTabEl) {
    rhTabEl.querySelector('.nav-badge')?.remove();
    if (vmCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.style.cssText = 'position:absolute;top:2px;right:2px;background:#f87171;color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px;';
      badge.textContent = vmCount;
      rhTabEl.style.position = 'relative';
      rhTabEl.appendChild(badge);
    }
  }

  // Badge sur onglet Flotte
  const flotteTabEl = document.querySelector('.nav-tab[data-module="flotte"]');
  if (flotteTabEl) {
    flotteTabEl.querySelector('.nav-badge')?.remove();
    if (ctCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.style.cssText = 'position:absolute;top:2px;right:2px;background:#f87171;color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px;';
      badge.textContent = ctCount;
      flotteTabEl.style.position = 'relative';
      flotteTabEl.appendChild(badge);
    }
  }
}

// Mettre à jour les badges au chargement, après sélection de station, et à chaque rendu accueil
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateNavBadges, 1500);
  setTimeout(updateNavBadges, 3000);
});
