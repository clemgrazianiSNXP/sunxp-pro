/* js/eos-extraction.js — Import CSV + génération EOS (SunXP Pro) */
console.log('eos-extraction.js chargé');

const EOS_REASON_MAP = {
  'BUSINESS CLOSED': 'bc',
  'INACCESSIBLE DELIVERY LOCATION': 'uta',
  'ADDRESS NOT FOUND': 'utl',
  'CUSTOMER UNAVAILABLE': 'cna',
};

let eosDate = new Date();

function eosKey(stationId, date) {
  return stationId + '-eos-' + date.toISOString().slice(0, 10);
}

function loadEosDay(stationId) {
  try { const raw = localStorage.getItem(eosKey(stationId, eosDate)); return raw ? JSON.parse(raw) : []; }
  catch (_) { return []; }
}

function saveEosDay(stationId, rows) {
  try { localStorage.setItem(eosKey(stationId, eosDate), JSON.stringify(rows)); } catch (_) {}
}

function renderExtractionEOS() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  // Navigateur de date
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;';
  const btnPrev = document.createElement('button');
  btnPrev.className = 'h-btn h-nav'; btnPrev.textContent = '◀';
  btnPrev.onclick = () => { eosDate.setDate(eosDate.getDate() - 1); if (typeof renderChefEquipe === 'function') renderChefEquipe(); };
  const dateLbl = document.createElement('span');
  dateLbl.style.cssText = 'font-size:13px;font-weight:600;min-width:200px;text-align:center;';
  dateLbl.textContent = eosDate.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const btnNext = document.createElement('button');
  btnNext.className = 'h-btn h-nav'; btnNext.textContent = '▶';
  btnNext.onclick = () => { eosDate.setDate(eosDate.getDate() + 1); if (typeof renderChefEquipe === 'function') renderChefEquipe(); };
  const btnToday = document.createElement('button');
  btnToday.className = 'h-btn'; btnToday.textContent = "Aujourd'hui";
  btnToday.onclick = () => { eosDate = new Date(); if (typeof renderChefEquipe === 'function') renderChefEquipe(); };
  header.appendChild(btnPrev); header.appendChild(dateLbl); header.appendChild(btnNext); header.appendChild(btnToday);
  const btnDelete = document.createElement('button');
  btnDelete.className = 'rep-btn rep-btn-delete';
  btnDelete.style.cssText = 'font-size:11px;padding:4px 10px;';
  btnDelete.textContent = '🗑 Supprimer le tableau';
  btnDelete.onclick = () => { if (confirm('Supprimer les données EOS de ce jour ?')) { localStorage.removeItem(eosKey(stationId, eosDate)); if (typeof renderChefEquipe === 'function') renderChefEquipe(); } };
  header.appendChild(btnDelete);
  wrap.appendChild(header);

  // Bouton import
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
  const importBtn = document.createElement('button');
  importBtn.className = 'rep-btn rep-btn-primary';
  importBtn.textContent = '📄 Importer CSV';
  importBtn.onclick = () => importEosCSV(stationId);
  btnRow.appendChild(importBtn);
  wrap.appendChild(btnRow);

  // Charger les données du jour
  const rows = loadEosDay(stationId);

  // Tableau EOS
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'overflow-x:auto;';
  if (rows.length) tableWrap.appendChild(buildEosTable(rows));
  else tableWrap.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:20px;">Aucune donnée pour ce jour. Importez un fichier CSV.</p>';
  wrap.appendChild(tableWrap);

  // Totaux
  if (rows.length) {
    const totals = calcEosTotals(rows);
    const totDiv = document.createElement('div');
    totDiv.style.cssText = 'font-size:11px;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap;';
    totDiv.innerHTML = `<b>Totaux :</b> RTS: ${totals.rts} | BC: ${totals.bc} | UTA: ${totals.uta} | UTL: ${totals.utl} | CNA: ${totals.cna} | PNOV: 0 | AUTRE: ${totals.autre}`;
    wrap.appendChild(totDiv);
  }

  return wrap;
}

function importEosCSV(stationId) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.csv';
  inp.onchange = () => {
    const file = inp.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseEosCSV(e.target.result);
      saveEosDay(stationId, rows);
      if (typeof renderChefEquipe === 'function') renderChefEquipe();
    };
    reader.readAsText(file);
  };
  inp.click();
}

function parseEosCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  const idxDA = header.findIndex(h => h.match(/transporterid/i));
  const idxRoute = header.findIndex(h => h.match(/routecode/i));
  const idxReason = header.findIndex(h => h.match(/reasoncode/i));
  if (idxDA < 0 || idxRoute < 0 || idxReason < 0) { alert('Colonnes TransporterId, RouteCode ou ReasonCode introuvables.'); return []; }
  const groups = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length <= Math.max(idxDA, idxRoute, idxReason)) continue;
    const da = cols[idxDA].trim(), route = cols[idxRoute].trim(), reason = cols[idxReason].trim().toUpperCase();
    if (!da) continue;
    const key = da + '|' + route;
    if (!groups[key]) groups[key] = { da, route, rts: 0, bc: 0, uta: 0, utl: 0, cna: 0, autre: 0 };
    groups[key].rts++;
    const mapped = EOS_REASON_MAP[reason];
    if (mapped) groups[key][mapped]++; else groups[key].autre++;
  }
  return Object.values(groups).sort((a, b) => b.rts - a.rts);
}

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current); return result;
}

function buildEosTable(rows) {
  const table = document.createElement('table');
  table.className = 'h-table';
  table.style.cssText = 'font-size:11px;';
  table.innerHTML = '<thead><tr><th colspan="2">DA</th><th colspan="2">ROUTES</th><th># RTS</th><th>BC</th><th>UTA</th><th>UTL</th><th>CNA</th><th>PNOV</th><th>AUTRE</th><th>COMMENTAIRES</th></tr></thead>';
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="2" style="padding:3px 4px;font-family:monospace;font-size:10px;">${r.da}</td><td colspan="2" style="padding:3px 4px;">${r.route}</td><td style="padding:3px 4px;text-align:center;font-weight:600;">${r.rts}</td><td style="padding:3px 4px;text-align:center;">${r.bc}</td><td style="padding:3px 4px;text-align:center;">${r.uta}</td><td style="padding:3px 4px;text-align:center;">${r.utl}</td><td style="padding:3px 4px;text-align:center;">${r.cna}</td><td style="padding:3px 4px;text-align:center;">0</td><td style="padding:3px 4px;text-align:center;">${r.autre}</td><td style="padding:3px 4px;"></td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); return table;
}

function calcEosTotals(rows) {
  return rows.reduce((t, r) => ({ rts:t.rts+r.rts, bc:t.bc+r.bc, uta:t.uta+r.uta, utl:t.utl+r.utl, cna:t.cna+r.cna, autre:t.autre+r.autre }), { rts:0, bc:0, uta:0, utl:0, cna:0, autre:0 });
}
