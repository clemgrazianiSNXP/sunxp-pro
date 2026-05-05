/* js/accueil.js — Tableau de bord Accueil Responsable (SunXP Pro) */
console.log('accueil.js chargé');

function initAccueil() { renderAccueil(); }

function renderAccueil() {
  const container = document.getElementById('module-accueil');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;padding:24px;overflow-y:auto;gap:20px;';

  const sid = window.getActiveStationId ? window.getActiveStationId() : 'default';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:12px;';
  header.innerHTML = `
    <img src="img/matting_2026-4-21_fa553fc4-3d99-11f1-9b2d-16737e16766a.png" style="height:36px;width:auto;opacity:0.9;">
    <div>
      <h1 style="margin:0;font-size:1.3rem;color:var(--text-primary);font-weight:700;">Bonjour 👋</h1>
      <p style="margin:0;font-size:12px;color:var(--text-muted);">Voici le résumé de votre station</p>
    </div>`;
  container.appendChild(header);

  // Grid de cards
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;';

  // 1. Demandes en attente
  grid.appendChild(buildDemandesCard(sid));

  // 2. Alertes H.S semaine précédente
  grid.appendChild(buildHSCard(sid));

  // 3. Problèmes camions remontés récemment
  grid.appendChild(buildProblemesCard(sid));

  container.appendChild(grid);
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
  card.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:16px;transition:transform 0.15s,box-shadow 0.15s;';
  card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'; };
  card.onmouseleave = () => { card.style.transform = ''; card.style.boxShadow = ''; };

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  header.innerHTML = `<span style="font-size:20px;">${icon}</span><span style="font-size:13px;font-weight:700;color:var(--text-primary);">${title}</span>`;
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'accueil-card-body';
  card.appendChild(body);

  return card;
}
