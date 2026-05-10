/* js/planning.js — Onglet Planning mensuel (SunXP Pro) */
console.log('planning.js chargé');

const PLANNING_CODES = ['RSTD','REP','CP','AT','ABS','BU','AM','AST','DSP','CE','MAT','PAT','GAR','PARC','BUR','HN','OFF','RD','RDL','CSS','MAP','CHIME','SAFETY','DBL','RLV1','RLV2','RLV3'];

const PLANNING_CODE_COLORS = {
  RSTD:'#4ade80', REP:'#f87171', CP:'#60a5fa', AT:'#fbbf24', ABS:'#ef4444',
  BU:'#f97316', AM:'#a78bfa', AST:'#fbbf24', DSP:'#38bdf8', CE:'#34d399',
  MAT:'#f472b6', PAT:'#818cf8', GAR:'#fb923c', PARC:'#a3e635', BUR:'#94a3b8',
  HN:'#6366f1', OFF:'#64748b', RD:'#2dd4bf', RDL:'#22d3ee', CSS:'#e879f9',
  MAP:'#facc15', CHIME:'#3b82f6', SAFETY:'#06b6d4', DBL:'#dc2626',
  RLV1:'#84cc16', RLV2:'#eab308', RLV3:'#ef4444'
};

// Lignes résumé en haut de la grille (partie fixe gauche = label, partie droite = valeurs éditables par jour)
const PLANNING_SUMMARY_ROWS = [
  { key: 'capamax',    label: 'CAPA MAX',          color: '#a78bfa', editable: true },
  { key: 'forecast',   label: 'FORECAST',          color: '#60a5fa', editable: true },
  { key: 'routes',     label: 'Routes réalisées',  color: '#4ade80', editable: true },
  { key: 'cut',        label: 'Cut',               color: '#f87171', editable: true },
  { key: 'bu_paye',    label: 'BU payé',           color: '#f97316', editable: true },
  { key: 'nb_chauffeurs', label: 'Nb chauffeurs',  color: '#fbbf24', auto: 'RSTD' },
  { key: 'bu_planifie',   label: 'BU planifié',    color: '#f97316', auto: 'BU' }
];

let planningCurrentDate = new Date();

/* ── Point d'entrée ───────────────────────────────────────── */
async function initPlanning() {
  planningCurrentDate = new Date();
  // Charger depuis Supabase si disponible
  const stationId = window.getActiveStationId ? window.getActiveStationId() : 'default';
  const year = planningCurrentDate.getFullYear();
  const month = planningCurrentDate.getMonth();
  await loadPlanningFromSupabase(stationId, year, month);
  renderPlanning();
}

/* ── Chargement Supabase → localStorage ───────────────────── */
async function loadPlanningFromSupabase(stationId, year, month) {
  if (typeof sb !== 'function' || !sb()) return;
  try {
    const { data, error } = await sb().from('planning').select('data').eq('station_id', stationId).eq('year', year).eq('month', month + 1).maybeSingle();
    if (error) { console.warn('loadPlanning Supabase error:', error.message); return; }
    if (data && data.data) {
      localStorage.setItem(planningKey(stationId, year, month), JSON.stringify(data.data));
      console.log('📥 Planning chargé depuis Supabase:', year + '-' + (month + 1));
    }
    const { data: metaData, error: metaErr } = await sb().from('planning_meta').select('data').eq('station_id', stationId).eq('mois_key', year + '-' + String(month + 1).padStart(2, '0')).maybeSingle();
    if (!metaErr && metaData && metaData.data) {
      localStorage.setItem(planningMetaKey(stationId, year, month), JSON.stringify(metaData.data));
    }
  } catch (e) { console.warn('loadPlanningFromSupabase catch:', e.message); }
}

/* ── Persistance ──────────────────────────────────────────── */
function planningKey(stationId, year, month) {
  return stationId + '-planning-' + year + '-' + String(month + 1).padStart(2, '0');
}
function planningMetaKey(stationId, year, month) {
  return stationId + '-planning-meta-' + year + '-' + String(month + 1).padStart(2, '0');
}

function loadPlanning(stationId, year, month) {
  try { return JSON.parse(localStorage.getItem(planningKey(stationId, year, month))) || {}; } catch (_) { return {}; }
}
function savePlanning(stationId, year, month, data) {
  try {
    localStorage.setItem(planningKey(stationId, year, month), JSON.stringify(data));
    if (typeof dbSavePlanning === 'function') dbSavePlanning(stationId, year, month, data);
  } catch (_) {}
}
function loadPlanningMeta(stationId, year, month) {
  try { return JSON.parse(localStorage.getItem(planningMetaKey(stationId, year, month))) || {}; } catch (_) { return {}; }
}
function savePlanningMeta(stationId, year, month, meta) {
  try {
    localStorage.setItem(planningMetaKey(stationId, year, month), JSON.stringify(meta));
    if (typeof dbSavePlanningMeta === 'function') dbSavePlanningMeta(stationId, year, month, meta);
  } catch (_) {}
}

/* ── Utilitaires dates ────────────────────────────────────── */
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDayName(year, month, day) {
  return new Date(year, month, day).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderPlanning() {
  const container = document.getElementById('module-planning');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;height:100%;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : 'default';
  const year = planningCurrentDate.getFullYear();
  const month = planningCurrentDate.getMonth();
  const nbDays = getDaysInMonth(year, month);
  const data = loadPlanning(stationId, year, month);
  const meta = loadPlanningMeta(stationId, year, month);
  const chauffeurs = getPlanningChauffeurs(stationId);

  // Toolbar
  container.appendChild(buildPlanningToolbar(year, month));



  // Corps
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex:1;overflow:hidden;';

  const fixedLeft = buildFixedLeft(chauffeurs, data, meta, nbDays, year, month);
  body.appendChild(fixedLeft);

  const scrollRight = buildScrollableRight(chauffeurs, data, meta, nbDays, year, month, stationId);
  body.appendChild(scrollRight);

  // Synchroniser le scroll vertical
  const leftScroll = fixedLeft.querySelector('.pl-left-scroll');
  const rightScroll = scrollRight.querySelector('.pl-right-scroll');
  if (leftScroll && rightScroll) {
    leftScroll.addEventListener('scroll', () => { rightScroll.scrollTop = leftScroll.scrollTop; });
    rightScroll.addEventListener('scroll', () => { leftScroll.scrollTop = rightScroll.scrollTop; });
  }

  container.appendChild(body);
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildPlanningToolbar(year, month) {
  const bar = document.createElement('div');
  bar.className = 'h-toolbar';
  const label = planningCurrentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  bar.innerHTML = `
    <div class="h-toolbar-left"></div>
    <div class="h-toolbar-center">
      <button class="h-btn h-nav" id="pl-prev">◀</button>
      <span class="h-date-label">${label.charAt(0).toUpperCase() + label.slice(1)}</span>
      <button class="h-btn h-nav" id="pl-next">▶</button>
      <button class="h-btn" id="pl-today">Mois en cours</button>
    </div>
    <div class="h-toolbar-right"></div>
  `;
  bar.querySelector('#pl-prev').onclick = async () => { planningCurrentDate.setMonth(planningCurrentDate.getMonth() - 1); const sid = window.getActiveStationId ? window.getActiveStationId() : 'default'; await loadPlanningFromSupabase(sid, planningCurrentDate.getFullYear(), planningCurrentDate.getMonth()); renderPlanning(); };
  bar.querySelector('#pl-next').onclick = async () => { planningCurrentDate.setMonth(planningCurrentDate.getMonth() + 1); const sid = window.getActiveStationId ? window.getActiveStationId() : 'default'; await loadPlanningFromSupabase(sid, planningCurrentDate.getFullYear(), planningCurrentDate.getMonth()); renderPlanning(); };
  bar.querySelector('#pl-today').onclick = async () => { planningCurrentDate = new Date(); const sid = window.getActiveStationId ? window.getActiveStationId() : 'default'; await loadPlanningFromSupabase(sid, planningCurrentDate.getFullYear(), planningCurrentDate.getMonth()); renderPlanning(); };

  // Bouton Générer (depuis planning-generator.js)
  if (typeof addGenerateButton === 'function') {
    const stationId = window.getActiveStationId ? window.getActiveStationId() : 'default';
    addGenerateButton(bar, stationId, year, month);
  }

  // Bulles d'alerte
  const stationId = window.getActiveStationId ? window.getActiveStationId() : 'default';
  const nbDays = getDaysInMonth(year, month);
  const data = loadPlanning(stationId, year, month);
  const allPersons = getPlanningChauffeurs(stationId);
  const eligible = allPersons.filter(c => ['Chauffeur', 'Formateur'].includes(c.role));

  // Bulle AST (astreintes potentielles — chauffeurs à 5 RSTD cette semaine)
  const astData = getAstAlerts(eligible, data, year, month, nbDays);
  const astBtn = document.createElement('button');
  astBtn.className = 'h-btn';
  if (astData.length > 0) {
    astBtn.textContent = `⚠ ${astData.length} AST`;
    astBtn.style.cssText += 'background:rgba(251,191,36,0.15);border-color:#fbbf24;color:#fbbf24;font-size:11px;';
  } else {
    astBtn.textContent = '✓ AST';
    astBtn.style.cssText += 'font-size:11px;opacity:0.4;';
  }
  astBtn.onclick = () => showPlanningAlertPopup(astBtn, 'ASTREINTES POTENTIELLES (5j cette semaine)', astData, '#fbbf24');
  bar.querySelector('.h-toolbar-left').appendChild(astBtn);

  // Bulle Contraintes (violations détectées dans le planning actuel)
  const violations = getConstraintViolations(eligible, data, year, month, nbDays);
  const violBtn = document.createElement('button');
  violBtn.className = 'h-btn';
  if (violations.length > 0) {
    violBtn.textContent = `⚠ ${violations.length} Contraintes`;
    violBtn.style.cssText += 'background:rgba(248,113,113,0.15);border-color:#f87171;color:#f87171;font-size:11px;';
  } else {
    violBtn.textContent = '✓ Contraintes';
    violBtn.style.cssText += 'font-size:11px;opacity:0.4;';
  }
  violBtn.onclick = () => showPlanningAlertPopup(violBtn, 'CONTRAINTES NON RESPECTÉES', violations, '#f87171');
  bar.querySelector('.h-toolbar-left').appendChild(violBtn);

  return bar;
}

/* ── Partie fixe gauche ───────────────────────────────────── */
function buildFixedLeft(chauffeurs, data, meta, nbDays, year, month) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'min-width:240px;width:240px;display:flex;flex-direction:column;border-right:2px solid var(--border);flex-shrink:0;font-size:11px;overflow:hidden;';

  // En-tête fixe (lignes résumé labels)
  const headerFixed = document.createElement('div');
  headerFixed.style.cssText = 'flex-shrink:0;';

  const headerTable = document.createElement('table');
  headerTable.style.cssText = 'width:100%;border-collapse:collapse;';

  // 3 lignes d'en-tête : Date, Jour, Semaine
  headerTable.innerHTML = `
    <tr><td style="height:22px;padding:2px 8px;color:var(--text-muted);font-size:9px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);">Date</td></tr>
    <tr><td style="height:22px;padding:2px 8px;color:var(--text-muted);font-size:9px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);">Jour</td></tr>
    <tr><td style="height:22px;padding:2px 8px;color:var(--text-muted);font-size:9px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);">Semaine</td></tr>
  `;

  // Lignes résumé (CAPAMAX, FORECAST, etc.)
  PLANNING_SUMMARY_ROWS.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="height:24px;padding:2px 8px;font-weight:700;color:${row.color};font-size:10px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);white-space:nowrap;">${row.label}</td>`;
    headerTable.appendChild(tr);
  });

  headerFixed.appendChild(headerTable);
  wrap.appendChild(headerFixed);

  // Partie scrollable (chauffeurs)
  const scrollArea = document.createElement('div');
  scrollArea.className = 'pl-left-scroll';
  scrollArea.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;';

  const bodyTable = document.createElement('table');
  bodyTable.style.cssText = 'width:100%;border-collapse:collapse;';

  chauffeurs.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const role = c.role || '';
    const rstdCount = countCodeForDriver(data, nom, 'RSTD', nbDays);
    const tr = document.createElement('tr');
    tr.style.cssText = 'height:26px;';
    tr.innerHTML = `
      <td style="padding:2px 4px;font-size:9px;color:var(--text-muted);width:50px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${role}</td>
      <td style="padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;color:var(--text-primary);font-size:11px;">${nom}</td>
      <td style="padding:2px 4px;text-align:right;font-weight:700;color:var(--accent);font-size:11px;width:30px;" class="pl-rstd-count" data-nom="${nom}">${rstdCount}</td>
    `;
    bodyTable.appendChild(tr);
  });

  scrollArea.appendChild(bodyTable);
  wrap.appendChild(scrollArea);
  return wrap;
}

/* ── Partie scrollable droite ─────────────────────────────── */
function buildScrollableRight(chauffeurs, data, meta, nbDays, year, month, stationId) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

  // En-tête fixe (dates + jours + semaines + résumé)
  const headerFixed = document.createElement('div');
  headerFixed.style.cssText = 'flex-shrink:0;overflow-x:auto;';
  headerFixed.classList.add('pl-header-scroll');

  const headerTable = document.createElement('table');
  headerTable.style.cssText = 'border-collapse:collapse;';

  // Ligne 1 : Dates
  let rowDates = '<tr>';
  for (let d = 1; d <= nbDays; d++) {
    const isWeekend = [0, 6].includes(new Date(year, month, d).getDay());
    const bg = isWeekend ? 'background:rgba(255,255,255,0.05);' : '';
    rowDates += `<td style="min-width:38px;width:38px;height:22px;text-align:center;font-size:10px;color:var(--text-muted);border-bottom:1px solid var(--border);${bg}">${d}</td>`;
  }
  rowDates += '</tr>';

  // Ligne 2 : Jours
  let rowJours = '<tr>';
  for (let d = 1; d <= nbDays; d++) {
    const dayName = getDayName(year, month, d);
    const isWeekend = [0, 6].includes(new Date(year, month, d).getDay());
    const color = isWeekend ? 'color:#f87171;' : 'color:var(--text-muted);';
    const bg = isWeekend ? 'background:rgba(255,255,255,0.05);' : '';
    rowJours += `<td style="min-width:38px;width:38px;height:22px;text-align:center;font-size:9px;font-weight:600;${color}border-bottom:1px solid var(--border);${bg}">${dayName}</td>`;
  }
  rowJours += '</tr>';

  // Ligne 3 : Numéro de semaine (une seule fois par semaine, centré via colspan)
  let rowWeek = '<tr>';
  let d = 1;
  while (d <= nbDays) {
    const wn = getWeekNumber(new Date(year, month, d));
    // Compter combien de jours consécutifs ont le même numéro de semaine
    let span = 0;
    let dd = d;
    while (dd <= nbDays && getWeekNumber(new Date(year, month, dd)) === wn) { span++; dd++; }
    rowWeek += `<td colspan="${span}" style="height:22px;text-align:center;font-size:9px;color:var(--accent);font-weight:700;border-bottom:1px solid var(--border);border-left:2px solid var(--accent);background:var(--bg-sidebar);">S${wn}</td>`;
    d += span;
  }
  rowWeek += '</tr>';

  headerTable.innerHTML = rowDates + rowJours + rowWeek;

  // Lignes résumé éditables (CAPAMAX, FORECAST, Routes, Cut, BU payé, Nb chauffeurs, BU planifié)
  PLANNING_SUMMARY_ROWS.forEach(rowDef => {
    const tr = document.createElement('tr');
    for (let d = 1; d <= nbDays; d++) {
      const td = document.createElement('td');
      const isWeekend = [0, 6].includes(new Date(year, month, d).getDay());
      td.style.cssText = `min-width:38px;width:38px;height:24px;text-align:center;border-bottom:1px solid var(--border);padding:0;${isWeekend ? 'background:rgba(255,255,255,0.03);' : ''}`;

      if (rowDef.auto) {
        // Valeur auto-calculée
        const count = countCodeForDay(data, chauffeurs, d, rowDef.auto);
        td.style.cssText += `font-weight:700;color:${rowDef.color};font-size:10px;`;
        td.textContent = count || '';
        td.className = 'pl-auto-' + rowDef.key;
        td.dataset.day = d;
      } else {
        // Champ éditable
        const inp = document.createElement('input');
        const metaKey = rowDef.key + '_' + d;
        inp.value = meta[metaKey] || '';
        inp.style.cssText = `width:100%;height:22px;border:none;background:transparent;text-align:center;font-size:10px;font-weight:700;color:${rowDef.color};outline:none;padding:0;font-family:inherit;`;
        inp.addEventListener('change', () => {
          meta[metaKey] = inp.value.trim();
          savePlanningMeta(stationId, year, month, meta);
        });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
        td.appendChild(inp);
      }
      tr.appendChild(td);
    }
    headerTable.appendChild(tr);
  });

  headerFixed.appendChild(headerTable);
  wrap.appendChild(headerFixed);

  // Partie scrollable (grille chauffeurs)
  const scrollArea = document.createElement('div');
  scrollArea.className = 'pl-right-scroll';
  scrollArea.style.cssText = 'flex:1;overflow:auto;';

  const bodyTable = document.createElement('table');
  bodyTable.style.cssText = 'border-collapse:collapse;';

  chauffeurs.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const tr = document.createElement('tr');
    tr.style.cssText = 'height:26px;';

    for (let d = 1; d <= nbDays; d++) {
      const cellKey = nom + '_' + d;
      const val = (data[cellKey] || '').toUpperCase();
      const isWeekend = [0, 6].includes(new Date(year, month, d).getDay());
      const dow = new Date(year, month, d).getDay();
      const isMonday = dow === 1;
      const td = document.createElement('td');
      td.style.cssText = `min-width:38px;width:38px;padding:0;text-align:center;border:1px solid var(--border);${isWeekend ? 'background:rgba(255,255,255,0.03);' : ''}${isMonday ? 'border-left:2px solid var(--accent);' : ''}`;

      const inp = document.createElement('input');
      inp.className = 'pl-cell-input';
      inp.value = val;
      inp.style.cssText = `width:100%;height:24px;border:none;background:transparent;text-align:center;font-size:10px;font-weight:700;font-family:inherit;color:${PLANNING_CODE_COLORS[val] || 'var(--text-primary)'};outline:none;padding:0;`;
      inp.dataset.nom = nom;
      inp.dataset.day = d;

      if (val && PLANNING_CODE_COLORS[val]) {
        td.style.background = hexToRgba(PLANNING_CODE_COLORS[val], 0.15);
      }

      inp.addEventListener('change', () => {
        const v = inp.value.trim().toUpperCase();
        inp.value = v;
        data[cellKey] = v;
        inp.style.color = PLANNING_CODE_COLORS[v] || 'var(--text-primary)';
        td.style.background = (v && PLANNING_CODE_COLORS[v]) ? hexToRgba(PLANNING_CODE_COLORS[v], 0.15) : (isWeekend ? 'rgba(255,255,255,0.03)' : '');
        savePlanning(stationId, year, month, data);
        updateAutoRows(data, chauffeurs, nbDays);
        updateFixedLeftCounts(chauffeurs, data, nbDays);
      });

      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
        if (['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) {
          e.preventDefault();
          const allInputs = Array.from(bodyTable.querySelectorAll('.pl-cell-input'));
          const idx = allInputs.indexOf(inp);
          const cols = nbDays;
          let target = -1;
          if (e.key === 'ArrowRight') target = idx + 1;
          if (e.key === 'ArrowLeft') target = idx - 1;
          if (e.key === 'ArrowDown') target = idx + cols;
          if (e.key === 'ArrowUp') target = idx - cols;
          if (target >= 0 && target < allInputs.length) allInputs[target].focus();
        }
      });

      td.appendChild(inp);
      tr.appendChild(td);
    }
    bodyTable.appendChild(tr);
  });

  scrollArea.appendChild(bodyTable);
  wrap.appendChild(scrollArea);

  // Synchroniser le scroll horizontal header ↔ body
  scrollArea.addEventListener('scroll', () => { headerFixed.scrollLeft = scrollArea.scrollLeft; });

  return wrap;
}

/* ── Mise à jour des lignes auto (Nb chauffeurs, BU planifié) ── */
function updateAutoRows(data, chauffeurs, nbDays) {
  const container = document.getElementById('module-planning');
  if (!container) return;
  PLANNING_SUMMARY_ROWS.forEach(rowDef => {
    if (!rowDef.auto) return;
    const cells = container.querySelectorAll('.pl-auto-' + rowDef.key);
    cells.forEach(cell => {
      const d = parseInt(cell.dataset.day);
      const count = countCodeForDay(data, chauffeurs, d, rowDef.auto);
      cell.textContent = count || '';
    });
  });
}

/* ── Mise à jour des compteurs RSTD dans la partie fixe gauche ── */
function updateFixedLeftCounts(chauffeurs, data, nbDays) {
  const container = document.getElementById('module-planning');
  if (!container) return;
  chauffeurs.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const count = countCodeForDriver(data, nom, 'RSTD', nbDays);
    const cell = container.querySelector(`.pl-rstd-count[data-nom="${CSS.escape(nom)}"]`);
    if (cell) cell.textContent = count;
  });
}

/* ── Compteurs ────────────────────────────────────────────── */
function countCodeForDay(data, chauffeurs, day, code) {
  let count = 0;
  chauffeurs.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    if ((data[nom + '_' + day] || '').toUpperCase() === code) count++;
  });
  return count;
}

function countCodeForDriver(data, nom, code, nbDays) {
  let count = 0;
  for (let d = 1; d <= nbDays; d++) {
    if ((data[nom + '_' + d] || '').toUpperCase() === code) count++;
  }
  return count;
}

/* ── Chauffeurs + Responsables pour le planning (ordre hiérarchique) ── */
function getPlanningChauffeurs(stationId) {
  // Responsables en haut (ordre : RH, Qualité, Mécanicien, Gestionnaire Flotte, Chef Parc, Dispatcher, Chef équipe)
  const RESP_ORDER = ['Ressources Humaines', 'Responsable Qualité', 'Mécanicien', 'Gestionnaire de Flotte', 'Chef de Parc', 'Dispatcher', 'Chef d\'équipe'];
  let responsables = [];
  try { responsables = JSON.parse(localStorage.getItem(stationId + '-responsables')) || []; } catch (_) {}
  responsables.sort((a, b) => {
    const ia = RESP_ORDER.indexOf(a.role); const ib = RESP_ORDER.indexOf(b.role);
    return (ia >= 0 ? ia : 999) - (ib >= 0 ? ib : 999);
  });

  // Chauffeurs en dessous (ordre : CES, BU, Formateur, Chauffeur)
  const CHAUFF_ORDER = ['CES', 'BU', 'Formateur', 'Chauffeur'];
  let chauffeurs = [];
  try { chauffeurs = JSON.parse(localStorage.getItem(stationId + '-repertoire')) || []; } catch (_) {}
  chauffeurs.sort((a, b) => {
    const ia = CHAUFF_ORDER.indexOf(a.role); const ib = CHAUFF_ORDER.indexOf(b.role);
    return (ia >= 0 ? ia : 999) - (ib >= 0 ? ib : 999);
  });

  return [...responsables, ...chauffeurs];
}

/* ── Utilitaire couleur ───────────────────────────────────── */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}


/* ══════════════════════════════════════════════════════════════
   ALERTES PLANNING (bulles toolbar)
   ══════════════════════════════════════════════════════════════ */

/**
 * Détecte les chauffeurs à 5 RSTD dans la semaine courante (candidats astreinte).
 */
function getAstAlerts(eligible, data, year, month, nbDays) {
  const today = new Date();
  // Trouver le lundi de la semaine courante
  const dow = today.getDay();
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const alerts = [];
  eligible.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayNum = d.getDate();
        if ((data[nom + '_' + dayNum] || '').toUpperCase() === 'RSTD') count++;
      }
    }
    if (count >= 5) alerts.push({ nom, detail: count + ' RSTD cette semaine' });
  });
  return alerts;
}

/**
 * Détecte les violations de contraintes dans le planning actuel.
 */
function getConstraintViolations(eligible, data, year, month, nbDays) {
  const violations = [];

  eligible.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const rstdDays = [];
    for (let d = 1; d <= nbDays; d++) {
      if ((data[nom + '_' + d] || '').toUpperCase() === 'RSTD') rstdDays.push(d);
    }

    // 6 jours consécutifs
    let consecutive = 0;
    for (let d = 1; d <= nbDays; d++) {
      if ((data[nom + '_' + d] || '').toUpperCase() === 'RSTD') {
        consecutive++;
        if (consecutive >= 6) {
          violations.push({ nom, detail: '6 jours consécutifs (jour ' + (d - 5) + '-' + d + ')' });
          break;
        }
      } else { consecutive = 0; }
    }

    // Plus de 2 dimanches
    let sundayCount = 0;
    for (let d = 1; d <= nbDays; d++) {
      if (new Date(year, month, d).getDay() === 0 && (data[nom + '_' + d] || '').toUpperCase() === 'RSTD') sundayCount++;
    }
    if (sundayCount > 2) violations.push({ nom, detail: sundayCount + ' dimanches travaillés (max 2)' });

    // Plus de 5 RSTD dans une semaine classique (lun-dim)
    let d = 1;
    while (d <= nbDays) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = d + mondayOffset;
      let weekCount = 0;
      for (let i = monday; i < monday + 7; i++) {
        if (i >= 1 && i <= nbDays && (data[nom + '_' + i] || '').toUpperCase() === 'RSTD') weekCount++;
      }
      if (weekCount > 5) {
        violations.push({ nom, detail: '6 jours en semaine (S' + getWeekNumber(date) + ')' });
        break;
      }
      d = monday + 7;
    }

    // Pas de week-end complet off
    const weekends = [];
    for (let dd = 1; dd <= nbDays; dd++) {
      if (new Date(year, month, dd).getDay() === 6 && dd + 1 <= nbDays) weekends.push({ sat: dd, sun: dd + 1 });
    }
    const hasFullWE = weekends.some(we => {
      const satVal = (data[nom + '_' + we.sat] || '').toUpperCase();
      const sunVal = (data[nom + '_' + we.sun] || '').toUpperCase();
      return satVal !== 'RSTD' && sunVal !== 'RSTD';
    });
    if (!hasFullWE && weekends.length > 0) violations.push({ nom, detail: 'Aucun week-end complet off' });
  });

  return violations;
}

/**
 * Popup d'alerte planning (même style que heures.js).
 */
function showPlanningAlertPopup(button, title, items, color) {
  document.querySelectorAll('.pl-alert-popup').forEach(p => p.remove());

  const popup = document.createElement('div');
  popup.className = 'pl-alert-popup';
  popup.style.cssText = 'position:fixed;z-index:9999;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:8px;min-width:260px;max-height:320px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.45);padding:10px 0;font-size:12px;';

  const rect = button.getBoundingClientRect();
  popup.style.top = (rect.bottom + 4) + 'px';
  popup.style.left = rect.left + 'px';

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `padding:4px 12px 8px;font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);margin-bottom:4px;`;
  titleEl.textContent = title;
  popup.appendChild(titleEl);

  if (!items.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:10px 12px;color:var(--text-muted);text-align:center;';
    empty.textContent = 'Aucune alerte.';
    popup.appendChild(empty);
  } else {
    items.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:5px 12px;gap:8px;';
      row.innerHTML = `<span style="color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.nom}</span><span style="color:${color};font-size:11px;white-space:nowrap;">${item.detail}</span>`;
      popup.appendChild(row);
    });
  }

  document.body.appendChild(popup);
  setTimeout(() => document.addEventListener('click', function handler(e) {
    if (!popup.contains(e.target) && e.target !== button) { popup.remove(); document.removeEventListener('click', handler); }
  }), 0);
}
