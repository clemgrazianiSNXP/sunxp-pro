/* js/accueil.js — Tableau de bord Accueil Responsable (SunXP Pro) */
console.log('accueil.js chargé');

function initAccueil() { renderAccueil(); }

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
  grid.appendChild(colDsp);

  // Colonne RH
  const colRh = document.createElement('div');
  colRh.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
  const rhTitle = document.createElement('div');
  rhTitle.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;text-align:center;padding:6px 0;border-bottom:2px solid #a78bfa;margin-bottom:4px;';
  rhTitle.textContent = '👤 RH';
  colRh.appendChild(rhTitle);
  colRh.appendChild(buildDemandesCard(sid));
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
  const card = createCard('📋', 'Demandes en attente');
  const body = card.querySelector('.accueil-card-body');

  let repos = 0, acomptes = 0, conges = 0;
  try { repos = (JSON.parse(localStorage.getItem(sid + '-repos-demandes')) || []).filter(d => d.statut === 'en_attente').length; } catch(_) {}
  try { acomptes = (JSON.parse(localStorage.getItem(sid + '-acomptes')) || []).filter(d => d.statut === 'en_attente').length; } catch(_) {}
  try { conges = (JSON.parse(localStorage.getItem(sid + '-conges-payes')) || []).filter(d => d.statut === 'en_attente').length; } catch(_) {}

  const total = repos + acomptes + conges;

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

  card.style.cursor = 'pointer';
  card.onclick = () => { showModule('heures'); /* ouvrir hamburger demandes */ setTimeout(() => { const btn = document.getElementById('hamburger-btn'); if (btn) btn.click(); setTimeout(() => { if (typeof setMenuTab === 'function') setMenuTab('demandes-mgr'); }, 100); }, 100); };
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

  card.style.cursor = 'pointer';
  card.onclick = () => { showModule('heures'); };
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

  card.style.cursor = 'pointer';
  card.onclick = () => { showModule('heures'); };
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

  card.style.cursor = 'pointer';
  card.onclick = () => { showModule('flotte'); setTimeout(() => { if (typeof renderFlotte === 'function') { flotteTab = 'problemes'; renderFlotte(); } }, 50); };
  return card;
}

/* ── Helper : créer une card ──────────────────────────────── */
function createCard(icon, title) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:20px;transition:transform 0.18s,box-shadow 0.18s,border-color 0.18s;position:relative;overflow:hidden;';
  card.onmouseenter = () => { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 8px 28px rgba(0,0,0,0.25)'; card.style.borderColor = 'var(--accent)'; };
  card.onmouseleave = () => { card.style.transform = ''; card.style.boxShadow = ''; card.style.borderColor = 'var(--border)'; };

  // Glow subtil en haut de la card
  const glow = document.createElement('div');
  glow.style.cssText = 'position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0.4;border-radius:14px 14px 0 0;';
  card.appendChild(glow);

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;';
  header.innerHTML = `<span style="font-size:22px;">${icon}</span><span style="font-size:14px;font-weight:700;color:var(--text-primary);">${title}</span>`;
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'accueil-card-body';
  card.appendChild(body);

  return card;
}
