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

let planningCurrentDate = new Date();

/* ── Point d'entrée ───────────────────────────────────────── */
function initPlanning() {
  planningCurrentDate = new Date();
  renderPlanning();
}

/* ── Persistance ──────────────────────────────────────────── */
function planningKey(stationId, year, month) {
  return stationId + '-planning-' + year + '-' + String(month + 1).padStart(2, '0');
}

function loadPlanning(stationId, year, month) {
  try {
    const raw = localStorage.getItem(planningKey(stationId, year, month));
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

function savePlanning(stationId, year, month, data) {
  try {
    localStorage.setItem(planningKey(stationId, year, month), JSON.stringify(data));
    if (typeof dbSavePlanning === 'function') dbSavePlanning(stationId, year, month, data);
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
  const chauffeurs = getPlanningChauffeurs(stationId);

  // Toolbar navigation mois
  container.appendChild(buildPlanningToolbar(year, month));

  // Corps : partie fixe gauche + grille scrollable droite
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex:1;overflow:hidden;';

  // Partie fixe gauche
  const fixedLeft = buildFixedLeft(chauffeurs, data, nbDays, year, month);
  body.appendChild(fixedLeft);

  // Partie scrollable droite
  const scrollRight = buildScrollableRight(chauffeurs, data, nbDays, year, month, stationId);
  body.appendChild(scrollRight);

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
  bar.querySelector('#pl-prev').onclick = () => { planningCurrentDate.setMonth(planningCurrentDate.getMonth() - 1); renderPlanning(); };
  bar.querySelector('#pl-next').onclick = () => { planningCurrentDate.setMonth(planningCurrentDate.getMonth() + 1); renderPlanning(); };
  bar.querySelector('#pl-today').onclick = () => { planningCurrentDate = new Date(); renderPlanning(); };
  return bar;
}

/* ── Partie fixe gauche ───────────────────────────────────── */
function buildFixedLeft(chauffeurs, data, nbDays, year, month) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'min-width:220px;width:220px;overflow-y:auto;border-right:2px solid var(--border);flex-shrink:0;font-size:11px;';

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;';

  // En-tête : 3 lignes résumé + header chauffeurs
  // Ligne 1 : vide (correspond à Date)
  // Ligne 2 : vide (correspond à Jour)
  // Ligne 3 : vide (correspond à Semaine)
  // Ligne 4 : "Planifiés" label
  // Ligne 5 : "BU" label
  // Ligne 6+ : chauffeurs

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr><th style="height:22px;background:var(--bg-sidebar);border-bottom:1px solid var(--border);"></th><th style="height:22px;background:var(--bg-sidebar);border-bottom:1px solid var(--border);text-align:right;padding-right:8px;font-size:10px;color:var(--text-muted);">Jrs plan.</th></tr>
  `;
  table.appendChild(thead);

  // Lignes résumé en-tête
  const tbody = document.createElement('tbody');

  // Ligne résumé "Planifiés"
  const trPlan = document.createElement('tr');
  trPlan.innerHTML = '<td colspan="2" style="padding:3px 8px;font-weight:700;color:#4ade80;background:var(--bg-sidebar);border-bottom:1px solid var(--border);font-size:10px;">📅 Planifiés (RSTD)</td>';
  tbody.appendChild(trPlan);

  // Ligne résumé "BU"
  const trBU = document.createElement('tr');
  trBU.innerHTML = '<td colspan="2" style="padding:3px 8px;font-weight:700;color:#f97316;background:var(--bg-sidebar);border-bottom:1px solid var(--border);font-size:10px;">🔶 BU</td>';
  tbody.appendChild(trBU);

  // Chauffeurs
  chauffeurs.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const rstdCount = countCodeForDriver(data, nom, 'RSTD', nbDays);
    const tr = document.createElement('tr');
    tr.style.cssText = 'height:26px;';
    tr.innerHTML = `
      <td style="padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;color:var(--text-primary);font-size:11px;">${nom}</td>
      <td style="padding:2px 8px;text-align:right;font-weight:700;color:var(--accent);font-size:11px;">${rstdCount}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

/* ── Partie scrollable droite ─────────────────────────────── */
function buildScrollableRight(chauffeurs, data, nbDays, year, month, stationId) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;overflow:auto;';

  const table = document.createElement('table');
  table.style.cssText = 'border-collapse:collapse;font-size:11px;';

  const thead = document.createElement('thead');

  // Ligne 1 : Dates
  let headerDates = '<tr>';
  for (let d = 1; d <= nbDays; d++) {
    const isWeekend = [0, 6].includes(new Date(year, month, d).getDay());
    const bg = isWeekend ? 'background:rgba(255,255,255,0.03);' : '';
    headerDates += `<th style="min-width:38px;width:38px;padding:2px;text-align:center;font-size:10px;color:var(--text-muted);border-bottom:1px solid var(--border);${bg}">${d}</th>`;
  }
  headerDates += '</tr>';

  // Ligne 2 : Jours
  let headerJours = '<tr>';
  for (let d = 1; d <= nbDays; d++) {
    const dayName = getDayName(year, month, d);
    const isWeekend = [0, 6].includes(new Date(year, month, d).getDay());
    const color = isWeekend ? 'color:#f87171;' : 'color:var(--text-muted);';
    const bg = isWeekend ? 'background:rgba(255,255,255,0.03);' : '';
    headerJours += `<th style="min-width:38px;width:38px;padding:2px;text-align:center;font-size:9px;font-weight:600;${color}border-bottom:1px solid var(--border);${bg}">${dayName}</th>`;
  }
  headerJours += '</tr>';

  thead.innerHTML = headerDates + headerJours;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  // Ligne résumé Planifiés (count RSTD par jour)
  const trPlan = document.createElement('tr');
  trPlan.style.cssText = 'background:var(--bg-sidebar);';
  for (let d = 1; d <= nbDays; d++) {
    const count = countCodeForDay(data, chauffeurs, d, 'RSTD');
    const td = document.createElement('td');
    td.style.cssText = 'text-align:center;font-weight:700;color:#4ade80;font-size:10px;padding:3px 2px;border-bottom:1px solid var(--border);';
    td.textContent = count || '';
    trPlan.appendChild(td);
  }
  tbody.appendChild(trPlan);

  // Ligne résumé BU (count BU par jour)
  const trBU = document.createElement('tr');
  trBU.style.cssText = 'background:var(--bg-sidebar);';
  for (let d = 1; d <= nbDays; d++) {
    const count = countCodeForDay(data, chauffeurs, d, 'BU');
    const td = document.createElement('td');
    td.style.cssText = 'text-align:center;font-weight:700;color:#f97316;font-size:10px;padding:3px 2px;border-bottom:1px solid var(--border);';
    td.textContent = count || '';
    trBU.appendChild(td);
  }
  tbody.appendChild(trBU);

  // Lignes chauffeurs
  chauffeurs.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const tr = document.createElement('tr');
    tr.style.cssText = 'height:26px;';

    for (let d = 1; d <= nbDays; d++) {
      const cellKey = nom + '_' + d;
      const val = (data[cellKey] || '').toUpperCase();
      const isWeekend = [0, 6].includes(new Date(year, month, d).getDay());
      const td = document.createElement('td');
      td.style.cssText = `min-width:38px;width:38px;padding:0;text-align:center;border:1px solid var(--border);position:relative;${isWeekend ? 'background:rgba(255,255,255,0.02);' : ''}`;

      const inp = document.createElement('input');
      inp.className = 'pl-cell-input';
      inp.value = val;
      inp.style.cssText = `width:100%;height:24px;border:none;background:transparent;text-align:center;font-size:10px;font-weight:700;font-family:inherit;color:${PLANNING_CODE_COLORS[val] || 'var(--text-primary)'};outline:none;padding:0;`;
      inp.dataset.nom = nom;
      inp.dataset.day = d;

      // Colorer le fond si code connu
      if (val && PLANNING_CODE_COLORS[val]) {
        td.style.background = hexToRgba(PLANNING_CODE_COLORS[val], 0.15);
      }

      inp.addEventListener('change', () => {
        const v = inp.value.trim().toUpperCase();
        inp.value = v;
        data[cellKey] = v;
        inp.style.color = PLANNING_CODE_COLORS[v] || 'var(--text-primary)';
        td.style.background = (v && PLANNING_CODE_COLORS[v]) ? hexToRgba(PLANNING_CODE_COLORS[v], 0.15) : (isWeekend ? 'rgba(255,255,255,0.02)' : '');
        savePlanning(stationId, year, month, data);
        updatePlanningResume(tbody, data, chauffeurs, nbDays);
        updateFixedLeftCounts(chauffeurs, data, nbDays);
      });

      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
        // Navigation flèches
        if (['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) {
          e.preventDefault();
          const allInputs = Array.from(table.querySelectorAll('.pl-cell-input'));
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
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

/* ── Mise à jour des lignes résumé ────────────────────────── */
function updatePlanningResume(tbody, data, chauffeurs, nbDays) {
  const rows = tbody.querySelectorAll('tr');
  if (rows.length < 2) return;
  // Row 0 = Planifiés, Row 1 = BU
  for (let d = 1; d <= nbDays; d++) {
    const rstdCount = countCodeForDay(data, chauffeurs, d, 'RSTD');
    const buCount = countCodeForDay(data, chauffeurs, d, 'BU');
    rows[0].children[d - 1].textContent = rstdCount || '';
    rows[1].children[d - 1].textContent = buCount || '';
  }
}

function updateFixedLeftCounts(chauffeurs, data, nbDays) {
  const container = document.getElementById('module-planning');
  if (!container) return;
  const fixedTable = container.querySelector('div:first-of-type table') || container.querySelectorAll('table')[0];
  if (!fixedTable) return;
  const trs = fixedTable.querySelectorAll('tbody tr');
  // Skip first 2 rows (Planifiés, BU labels)
  chauffeurs.forEach((c, i) => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const count = countCodeForDriver(data, nom, 'RSTD', nbDays);
    const row = trs[i + 2];
    if (row && row.children[1]) row.children[1].textContent = count;
  });
}

/* ── Compteurs ────────────────────────────────────────────── */
function countCodeForDay(data, chauffeurs, day, code) {
  let count = 0;
  chauffeurs.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const val = (data[nom + '_' + day] || '').toUpperCase();
    if (val === code) count++;
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

/* ── Chauffeurs depuis le répertoire ──────────────────────── */
function getPlanningChauffeurs(stationId) {
  try {
    const raw = localStorage.getItem(stationId + '-repertoire');
    if (raw) { const arr = JSON.parse(raw); if (arr && arr.length) return arr; }
  } catch (_) {}
  return [];
}

/* ── Utilitaire couleur ───────────────────────────────────── */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
