/* js/ressources-humaines.js — Module Ressources Humaines (SunXP Pro) */
console.log('ressources-humaines.js chargé');

let rhTab = 'check-tsm'; // 'check-tsm' | 'extraction-paie'

function initRH() {
  rhTab = 'check-tsm';
  renderRH();
}

function renderRH() {
  const container = document.getElementById('module-rh');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  // Toolbar avec sous-onglets
  const toolbar = document.createElement('div');
  toolbar.className = 'h-toolbar';
  toolbar.innerHTML = `
    <div class="h-toolbar-left">
      <button class="h-btn rh-tab-btn ${rhTab === 'check-tsm' ? 'rh-tab-active' : ''}" data-rhtab="check-tsm">Check TSM</button>
      <button class="h-btn rh-tab-btn ${rhTab === 'extraction-paie' ? 'rh-tab-active' : ''}" data-rhtab="extraction-paie">Extraction de paie</button>
    </div>
    <div class="h-toolbar-center"></div>
    <div class="h-toolbar-right"></div>
  `;
  toolbar.querySelectorAll('.rh-tab-btn').forEach(btn => {
    btn.onclick = () => { rhTab = btn.dataset.rhtab; renderRH(); };
  });
  container.appendChild(toolbar);

  // Contenu
  const content = document.createElement('div');
  content.className = 'rh-content';
  content.style.cssText = 'flex:1;overflow:auto;padding:16px;';

  if (rhTab === 'check-tsm') {
    content.appendChild(renderCheckTSM());
  } else {
    content.appendChild(renderExtractionPaie());
  }

  container.appendChild(content);
}

// renderCheckTSM est défini dans checkTSM.js

let paieMonth = new Date();
let paieData = {}; // { chauffeurId: { primeExcep, hs125, heureNormal, cp, avancePrime, acompte, atd, absAnticipees, evenements, verifBS } }

function renderExtractionPaie() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>';
    return wrap;
  }

  let chauffeurs = [];
  try {
    const raw = localStorage.getItem(stationId + '-repertoire');
    if (raw) chauffeurs = JSON.parse(raw);
  } catch (_) {}

  if (!chauffeurs.length) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">Aucun chauffeur dans le répertoire.</p>';
    return wrap;
  }

  const year = paieMonth.getFullYear(), month = paieMonth.getMonth();
  const frMonths = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const monthLabel = frMonths[month] + ' ' + year;
  const paieKey = stationId + '-paie-' + year + '-' + String(month).padStart(2, '0');

  // Charger les données saisies
  try {
    const raw = localStorage.getItem(paieKey);
    if (raw) paieData = JSON.parse(raw);
    else paieData = {};
  } catch (_) { paieData = {}; }

  // Navigation mensuelle
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;';
  const btnPrev = document.createElement('button');
  btnPrev.className = 'h-btn h-nav';
  btnPrev.textContent = '◀';
  btnPrev.onclick = () => { paieMonth.setMonth(paieMonth.getMonth() - 1); renderRH(); };
  const lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:14px;font-weight:600;min-width:160px;text-align:center;';
  lbl.textContent = monthLabel;
  const btnNext = document.createElement('button');
  btnNext.className = 'h-btn h-nav';
  btnNext.textContent = '▶';
  btnNext.onclick = () => { paieMonth.setMonth(paieMonth.getMonth() + 1); renderRH(); };
  nav.appendChild(btnPrev); nav.appendChild(lbl); nav.appendChild(btnNext);
  wrap.appendChild(nav);

  // Bouton export Excel
  const exportBtn = document.createElement('button');
  exportBtn.className = 'h-btn';
  exportBtn.style.cssText = 'align-self:flex-end;background:#4ade80;color:#000;font-weight:600;border:none;';
  exportBtn.textContent = '📥 Exporter Excel';
  exportBtn.onclick = () => exportPaieExcel(chauffeurs, stationId, year, month, monthLabel);
  wrap.appendChild(exportBtn);

  // Tableau
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'overflow-x:auto;';
  const table = document.createElement('table');
  table.className = 'h-table';
  table.style.cssText = 'font-size:11px;width:100%;table-layout:fixed;';

  const cols = [
    { label:'Mat.', w:'40px' },
    { label:'Chauffeur', w:'100px' },
    { label:'Prime', w:'45px' },
    { label:'Prime Ex.', w:'65px' },
    { label:'HS 125%', w:'55px' },
    { label:'H.BU', w:'45px' },
    { label:'Panier', w:'45px' },
    { label:'H.Norm.', w:'55px' },
    { label:'CP', w:'35px' },
    { label:'Av.Prime', w:'60px' },
    { label:'Acompte', w:'55px' },
    { label:'ATD', w:'45px' },
    { label:'ABS Ant.', w:'55px' },
    { label:'Événem.', w:'60px' },
    { label:'Vérif BS', w:'55px' }
  ];

  // Colgroup pour fixer les largeurs
  const colgroup = document.createElement('colgroup');
  cols.forEach(c => { const col = document.createElement('col'); col.style.width = c.w; colgroup.appendChild(col); });
  table.appendChild(colgroup);

  table.innerHTML += '<thead><tr>' + cols.map(c => `<th style="padding:4px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;">${c.label}</th>`).join('') + '</tr></thead>';

  const tbody = document.createElement('tbody');
  chauffeurs.forEach(c => {
    const cId = c.id || c.id_amazon;
    const nom = (c.prenom + ' ' + c.nom).trim();
    const d = paieData[cId] || {};
    const prime = getPaieAutoData(stationId, nom, year, month, c);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:2px;font-size:10px;overflow:hidden;text-overflow:ellipsis;">${c.matricule_tsm || '—'}</td>
      <td style="padding:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;">${nom}</td>
      <td style="padding:2px;text-align:center;font-weight:600;color:${prime.totalPrime < 0 ? '#f87171' : '#4ade80'};font-size:10px;">${prime.totalPrime < 0 ? '0' : prime.totalPrime}€</td>
      <td>${mkInp(cId, 'primeExcep', d.primeExcep, paieKey)}</td>
      <td>${mkInp(cId, 'hs125', d.hs125, paieKey)}</td>
      <td style="padding:2px;text-align:center;font-size:10px;">${prime.backupsH}</td>
      <td style="padding:2px;text-align:center;font-size:10px;">${prime.panierRepas}</td>
      <td>${mkInp(cId, 'heureNormal', d.heureNormal, paieKey)}</td>
      <td>${mkInp(cId, 'cp', d.cp, paieKey)}</td>
      <td>${mkInp(cId, 'avancePrime', d.avancePrime, paieKey)}</td>
      <td>${mkInp(cId, 'acompte', d.acompte, paieKey)}</td>
      <td>${mkInp(cId, 'atd', d.atd, paieKey)}</td>
      <td>${mkInp(cId, 'absAnticipees', d.absAnticipees, paieKey)}</td>
      <td>${mkInp(cId, 'evenements', d.evenements, paieKey)}</td>
      <td>${mkInp(cId, 'verifBS', d.verifBS, paieKey)}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);

  // Bind inputs pour sauvegarde
  setTimeout(() => {
    wrap.querySelectorAll('.paie-inp').forEach(inp => {
      inp.addEventListener('change', () => {
        const cId = inp.dataset.cid, field = inp.dataset.field, key = inp.dataset.key;
        try {
          const raw = localStorage.getItem(key);
          const data = raw ? JSON.parse(raw) : {};
          if (!data[cId]) data[cId] = {};
          data[cId][field] = inp.value;
          localStorage.setItem(key, JSON.stringify(data));
          paieData = data;
        } catch (_) {}
      });
    });
  }, 0);

  return wrap;
}

function mkInp(cId, field, val, paieKey) {
  return `<input class="h-inp paie-inp" data-cid="${cId}" data-field="${field}" data-key="${paieKey}" value="${val || ''}" style="width:100%;font-size:10px;padding:2px 3px;">`;
}

function getPaieAutoData(stationId, chauffeurNom, year, month, chauffeur) {
  let totalPrime = 0, backupsH = '0:00', panierRepas = 0;

  // Prime depuis primes-calculs.js — la clé est c.id ou c.id_amazon
  try {
    if (typeof loadPrimesData === 'function' && typeof calcTotalPrime === 'function') {
      const data = loadPrimesData(stationId, year, month);
      const cKey = chauffeur.id || chauffeur.id_amazon;
      // Essayer par id, puis par nom
      const row = data[cKey] || data[chauffeurNom] || {};
      // Calculer les jours travaillés automatiquement comme dans primes.js
      if (typeof countJoursTravailles === 'function') {
        row.jours = countJoursTravailles(stationId, chauffeur, year, month);
      }
      const report = typeof getReportPrecedent === 'function' ? ((getReportPrecedent(stationId, year, month))[cKey] || 0) : 0;
      totalPrime = calcTotalPrime(row, report);
    }
  } catch (_) {}

  // Backups depuis calcMonthTotal
  try {
    if (typeof calcMonthTotal === 'function') {
      const mt = calcMonthTotal(stationId, chauffeurNom, year, month);
      backupsH = typeof minToTime === 'function' ? minToTime(mt.backupsMin) || '0:00' : '0:00';

      // Panier repas : jours travaillés + de 6h (360 min)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dk = stationId + '-heures-' + date.toISOString().slice(0, 10);
        try {
          const raw = localStorage.getItem(dk);
          if (!raw) continue;
          const dayData = JSON.parse(raw);
          if (!dayData.rows) continue;
          const row = Object.values(dayData.rows).find(r => r.nom && r.nom.trim() === chauffeurNom.trim());
          if (!row || row.statut === 'Absent') continue;
          let mins = 0;
          if (['Astreinte','Chime','Safety'].includes(row.statut)) {
            const def = row.statut === 'Chime' ? '5:00' : '2:00';
            mins = (typeof timeToMin === 'function' ? timeToMin(row.specialTravail || def) : 0) || 0;
          } else if (row.statut === 'Présent') {
            mins = (typeof calcTravail === 'function' ? calcTravail(row.heureVague, row.retourDepot, row.pause || 45, row.backups) : 0) || 0;
          }
          if (mins > 360) panierRepas++;
        } catch (_) {}
      }
    }
  } catch (_) {}

  return { totalPrime, backupsH, panierRepas };
}

/** Convertit "H:MM" en décimal (ex: "1:30" → 1.5) */
function timeToDecimal(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const m = timeStr.match(/^(\d+):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1]) + parseInt(m[2]) / 60;
}

function exportPaieExcel(chauffeurs, stationId, year, month, monthLabel) {
  if (typeof XLSX === 'undefined') { alert('SheetJS non chargé.'); return; }

  const headers = ['Matricule TSM','Chauffeur','Prime','Prime Exceptionnelle','HS 125%','H. Backups','Panier Repas','H. Normale','CP','Avance Prime','Acompte','ATD','ABS Anticipées','Événements','Vérif BS'];

  const dataRows = chauffeurs.map(c => {
    const cId = c.id || c.id_amazon;
    const nom = (c.prenom + ' ' + c.nom).trim();
    const d = paieData[cId] || {};
    const auto = getPaieAutoData(stationId, nom, year, month, c);
    return [
      c.matricule_tsm || '',
      nom,
      auto.totalPrime,
      d.primeExcep || '',
      d.hs125 || '',
      Math.round(timeToDecimal(auto.backupsH) * 100) / 100,
      auto.panierRepas,
      d.heureNormal || '',
      d.cp || '',
      d.avancePrime || '',
      d.acompte || '',
      d.atd || '',
      d.absAnticipees || '',
      d.evenements || '',
      d.verifBS || ''
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Largeurs de colonnes
  ws['!cols'] = [
    { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 16 }, { wch: 10 },
    { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 6 }, { wch: 13 },
    { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 10 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Extraction Paie');
  XLSX.writeFile(wb, `extraction-paie-${monthLabel.replace(/\s/g, '-')}.xlsx`);
}
