/* js/chauffeur-accueil.js — Accueil chauffeur (SunXP Pro) */
console.log('chauffeur-accueil.js chargé');

/* ── Rendu accueil chauffeur ──────────────────────────────── */
function portalAccueil() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:20px;padding-bottom:24px;';

  const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();
  const sid = portalStationId;
  const now = new Date();

  // ── Section Planning S et S+1 ──
  wrap.appendChild(buildPortalPlanning(sid, nom, now));

  // ── Section Matériel du jour ──
  wrap.appendChild(buildPortalMateriel(sid, nom, now));

  // ── Bouton Pause ──
  wrap.appendChild(buildPortalPause(sid, nom, now));

  // ── Cards navigation (remplace les onglets) ──
  const cardsTitle = document.createElement('div');
  cardsTitle.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);margin-top:8px;';
  cardsTitle.textContent = '📂 Mon espace';
  wrap.appendChild(cardsTitle);

  const cardsGrid = document.createElement('div');
  cardsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;';

  const navCards = [
    { id: 'heures', icon: '⏱', label: 'Mes Heures', color: '#60a5fa' },
    { id: 'stats', icon: '📊', label: 'Mes Stats', color: '#4ade80' },
    { id: 'prime', icon: '💰', label: 'Ma Prime', color: '#fbbf24' },
    { id: 'prod', icon: '📋', label: 'Ma Prod', color: '#a78bfa' },
    { id: 'degats', icon: '🔧', label: 'Mes Dégâts', color: '#f87171' },
    { id: 'rapport', icon: '📋', label: 'Mon Rapport', color: '#f97316' },
    { id: 'badges', icon: '🏆', label: 'Mes Badges', color: '#38bdf8' }
  ];

  navCards.forEach(c => {
    const card = document.createElement('div');
    card.style.cssText = `background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:18px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;transition:all 0.18s;border-left:3px solid ${c.color};`;
    card.innerHTML = `<span style="font-size:28px;">${c.icon}</span><span style="font-size:12px;font-weight:700;color:var(--text-primary);">${c.label}</span>`;
    card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'; };
    card.onmouseleave = () => { card.style.transform = ''; card.style.boxShadow = ''; };
    card.onclick = () => { portalTab = c.id; renderPortal(); };
    cardsGrid.appendChild(card);
  });

  wrap.appendChild(cardsGrid);
  return wrap;
}

/* ── Planning S et S+1 ────────────────────────────────────── */
function buildPortalPlanning(sid, nom, now) {
  const section = document.createElement('div');
  section.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent);margin-bottom:12px;';
  title.textContent = '📅 Mon planning';
  section.appendChild(title);

  // Calculer lundi de la semaine en cours
  const monday = getMondayOfPortal(now);
  // Semaine S+1
  const mondayNext = new Date(monday);
  mondayNext.setDate(mondayNext.getDate() + 7);

  // Vérifier si les semaines sont publiées
  const publishedWeeks = getPublishedWeeks(sid);

  // Semaine en cours
  const weekNum = getWeekNumPortal(monday);
  const weekNextNum = getWeekNumPortal(mondayNext);

  const isCurrentPublished = isWeekPublished(publishedWeeks, monday);
  const isNextPublished = isWeekPublished(publishedWeeks, mondayNext);

  section.appendChild(buildWeekRow(sid, nom, monday, weekNum, 'Semaine en cours', isCurrentPublished));
  section.appendChild(buildWeekRow(sid, nom, mondayNext, weekNextNum, 'Semaine prochaine', isNextPublished));

  return section;
}

function buildWeekRow(sid, nom, monday, weekNum, label, isPublished) {
  const row = document.createElement('div');
  row.style.cssText = 'margin-bottom:12px;';

  const header = document.createElement('div');
  header.style.cssText = 'font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;';
  header.innerHTML = `<span>${label} (S${weekNum})</span>`;
  if (!isPublished) {
    header.innerHTML += '<span style="font-size:10px;color:var(--text-muted);font-style:italic;">Non publié</span>';
  }
  row.appendChild(header);

  if (!isPublished) {
    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:11px;color:var(--text-muted);text-align:center;padding:8px;background:var(--bg-primary);border-radius:8px;';
    msg.textContent = 'Planning pas encore disponible';
    row.appendChild(msg);
    return row;
  }

  // Afficher les 7 jours
  const days = document.createElement('div');
  days.style.cssText = 'display:flex;gap:4px;overflow-x:auto;';

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
    const dayNum = d.getDate();
    const statut = getPlanningStatut(sid, nom, d);
    const isToday = d.toDateString() === new Date().toDateString();

    const dayEl = document.createElement('div');
    dayEl.style.cssText = `flex:1;min-width:40px;text-align:center;padding:8px 4px;border-radius:10px;font-size:10px;${isToday ? 'border:2px solid var(--accent);' : 'border:1px solid var(--border);'}`;

    let statusColor = 'var(--text-muted)';
    let statusIcon = '—';
    let statusBg = 'transparent';
    if (statut === 'P' || statut === 'Présent') { statusColor = '#4ade80'; statusIcon = '✓'; statusBg = 'rgba(74,222,128,0.1)'; }
    else if (statut === 'R' || statut === 'Repos' || statut === 'REP') { statusColor = '#60a5fa'; statusIcon = 'R'; statusBg = 'rgba(96,165,250,0.1)'; }
    else if (statut === 'RSTD') { statusColor = '#60a5fa'; statusIcon = 'RS'; statusBg = 'rgba(96,165,250,0.1)'; }
    else if (statut === 'CP') { statusColor = '#fbbf24'; statusIcon = 'CP'; statusBg = 'rgba(251,191,36,0.1)'; }
    else if (statut === 'AM' || statut === 'AT') { statusColor = '#f87171'; statusIcon = statut; statusBg = 'rgba(248,113,113,0.1)'; }
    else if (statut === 'F') { statusColor = '#a78bfa'; statusIcon = 'F'; statusBg = 'rgba(167,139,250,0.1)'; }
    else if (statut === 'AST') { statusColor = '#f97316'; statusIcon = 'AST'; statusBg = 'rgba(249,115,22,0.1)'; }
    else if (statut) { statusColor = '#94a3b8'; statusIcon = statut.length > 3 ? statut.slice(0,3) : statut; statusBg = 'rgba(148,163,184,0.08)'; }

    dayEl.innerHTML = `<div style="font-weight:700;font-size:11px;color:${isToday ? 'var(--accent)' : 'var(--text-primary)'};">${dayName}</div><div style="font-size:9px;color:var(--text-muted);">${dayNum}</div><div style="font-size:10px;font-weight:800;color:${statusColor};margin-top:2px;background:${statusBg};border-radius:4px;padding:1px 2px;">${statusIcon}</div>`;
    days.appendChild(dayEl);
  }

  row.appendChild(days);
  return row;
}

/* ── Matériel du jour ─────────────────────────────────────── */
function buildPortalMateriel(sid, nom, now) {
  const section = document.createElement('div');
  section.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent);margin-bottom:10px;';
  title.textContent = '🚛 Mon matériel aujourd\'hui';
  section.appendChild(title);

  // Charger l'attribution du jour
  const attrData = loadAttrPortal(sid, now);
  if (!attrData) {
    section.innerHTML += '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px;">Pas d\'attribution pour aujourd\'hui</div>';
    return section;
  }

  // Trouver la ligne du chauffeur
  const myRow = attrData.find(r => r.chauffeur && r.chauffeur.trim().toLowerCase() === nom.toLowerCase());
  if (!myRow) {
    section.innerHTML += '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px;">Pas d\'attribution vous concernant</div>';
    return section;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;';

  const items = [
    { icon: '🚛', label: 'Van', value: myRow.plaque || '—' },
    { icon: '📱', label: 'PDA', value: myRow.pda || '—' },
    { icon: '🔑', label: 'Clef', value: myRow.clef || '—' },
    { icon: '🏷', label: 'VIGIK', value: myRow.vigik || '—' },
    { icon: '📋', label: 'Trousseau', value: myRow.trs || '—' },
    { icon: '📄', label: 'Licence', value: myRow.lic || '—' }
  ];

  items.forEach(item => {
    if (item.value && item.value !== '—') {
      const el = document.createElement('div');
      el.style.cssText = 'background:var(--bg-primary);border-radius:8px;padding:10px;display:flex;align-items:center;gap:8px;';
      el.innerHTML = `<span style="font-size:18px;">${item.icon}</span><div><div style="font-size:10px;color:var(--text-muted);">${item.label}</div><div style="font-size:13px;font-weight:700;color:var(--text-primary);">${item.value}</div></div>`;
      grid.appendChild(el);
    }
  });

  if (!grid.children.length) {
    section.innerHTML += '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px;">Aucun matériel attribué</div>';
  } else {
    section.appendChild(grid);
  }

  return section;
}

/* ── Bouton Pause ─────────────────────────────────────────── */
function buildPortalPause(sid, nom, now) {
  const section = document.createElement('div');
  section.style.cssText = 'background:linear-gradient(135deg, rgba(96,165,250,0.1), rgba(74,222,128,0.1));border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;';

  // Vérifier si pause déjà prise aujourd'hui
  const pauseKey = sid + '-pause-' + nom + '-' + now.toISOString().slice(0, 10);
  const pauseData = localStorage.getItem(pauseKey);

  if (pauseData) {
    const pauseTime = JSON.parse(pauseData);
    const reprise = new Date(pauseTime.start);
    reprise.setMinutes(reprise.getMinutes() + 45);
    const repriseStr = reprise.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    section.innerHTML = `
      <div style="font-size:16px;margin-bottom:4px;">☕</div>
      <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Pause prise à ${new Date(pauseTime.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
      <div style="font-size:14px;font-weight:800;color:var(--accent);margin-top:4px;">Tu dois reprendre à ${repriseStr}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Bonne pause ! ☀️</div>
    `;
  } else {
    const btn = document.createElement('button');
    btn.style.cssText = 'background:var(--accent);color:#fff;border:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;transition:transform 0.15s;width:100%;';
    btn.textContent = '☕ Prendre ma pause';
    btn.onmouseenter = () => btn.style.transform = 'scale(1.02)';
    btn.onmouseleave = () => btn.style.transform = '';
    btn.onclick = () => {
      const startTime = new Date().toISOString();
      localStorage.setItem(pauseKey, JSON.stringify({ start: startTime }));

      // Enregistrer dans les données Heures du responsable
      savePauseToHeures(sid, nom, now);

      renderPortal();
    };
    section.appendChild(btn);
  }

  return section;
}

/* ── Enregistrer la pause dans Heures ─────────────────────── */
function savePauseToHeures(sid, nom, date) {
  const dk = sid + '-heures-' + date.toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(dk);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data.rows) return;
    const row = Object.values(data.rows).find(r => r.nom && r.nom.trim() === nom.trim());
    if (row) {
      row.pauseHeure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(dk, JSON.stringify(data));
    }
  } catch (_) {}
}

/* ── Helpers ──────────────────────────────────────────────── */
function getMondayOfPortal(d) {
  const day = new Date(d);
  const dow = day.getDay() || 7;
  day.setDate(day.getDate() - dow + 1);
  day.setHours(0, 0, 0, 0);
  return day;
}

function getWeekNumPortal(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getPlanningStatut(sid, nom, date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const key = sid + '-planning-' + year + '-' + String(month + 1).padStart(2, '0');
  try {
    const data = JSON.parse(localStorage.getItem(key)) || {};
    return data[nom + '_' + day] || '';
  } catch (_) { return ''; }
}

function loadAttrPortal(sid, date) {
  const key = sid + '-attribution-' + date.toISOString().slice(0, 10);
  try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
}

/* ── Publication planning ─────────────────────────────────── */
function getPublishedWeeks(sid) {
  try { return JSON.parse(localStorage.getItem(sid + '-planning-published')) || []; }
  catch (_) { return []; }
}

function publishWeek(sid, monday) {
  const weeks = getPublishedWeeks(sid);
  const key = 'S' + getWeekNumPortal(monday);
  if (!weeks.includes(key)) {
    weeks.push(key);
  }
  localStorage.setItem(sid + '-planning-published', JSON.stringify(weeks));
  // Sync vers Supabase
  if (typeof dbSave === 'function') {
    dbSave('planning_published', sid + '-planning-published', { station_id: sid }, weeks);
  }
}

function isWeekPublished(publishedWeeks, monday) {
  const key = 'S' + getWeekNumPortal(monday);
  return publishedWeeks.includes(key);
}

function mondayToKey(d) {
  return 'S' + getWeekNumPortal(d);
}

/* ── Chargement publication depuis Supabase ───────────────── */
async function loadPublishedFromSupabase(sid) {
  if (typeof sb !== 'function' || !sb()) return;
  try {
    const { data, error } = await sb().from('planning_published').select('data').eq('station_id', sid).maybeSingle();
    if (!error && data && data.data) {
      localStorage.setItem(sid + '-planning-published', JSON.stringify(data.data));
    }
  } catch (_) {}
}
