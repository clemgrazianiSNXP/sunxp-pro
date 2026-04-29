/* js/stats.js — Onglet Qualité (SunXP Pro) */
console.log('stats.js chargé');

let statsMainTab = 'statistiques'; // 'statistiques' ou 'rapport'
let statsTab = 'dsdpmo';
let statsWeekDSDPMO = '';
let statsWeekPOD    = '';
let statsWeekDWC    = '';
let statsWeekEnvoi  = '';

function initStats() { renderStats(); }

function renderStats() {
  const container = document.getElementById('module-stats');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  // Onglets principaux : Statistiques | Rapport Chauffeur
  container.appendChild(buildMainNav());

  if (statsMainTab === 'statistiques') {
    // Sous-onglets stats
    container.appendChild(buildStatsNav());

    // Barre de recherche
    const searchBar = document.createElement('div');
    searchBar.style.cssText = 'padding:8px 16px 0;';
    const searchInp = document.createElement('input');
    searchInp.type = 'text'; searchInp.placeholder = '🔍 Rechercher un chauffeur...';
    searchInp.className = 'rep-search'; searchInp.style.cssText = 'width:300px;';
    searchInp.oninput = () => {
      const q = searchInp.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      container.querySelectorAll('tbody tr').forEach(tr => {
        const name = (tr.firstElementChild?.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        tr.style.display = name.includes(q) ? '' : 'none';
      });
    };
    searchBar.appendChild(searchInp);
    container.appendChild(searchBar);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow:auto;padding:16px;';
    if (statsTab === 'dsdpmo') body.appendChild(buildDSDPMO());
    else if (statsTab === 'pod') body.appendChild(buildPOD());
    else if (statsTab === 'dwc') body.appendChild(buildDWC());
    else body.appendChild(buildEnvoi());
    container.appendChild(body);
  } else {
    // Rapport Chauffeur — vue directe
    // Barre de recherche
    const searchBar = document.createElement('div');
    searchBar.style.cssText = 'padding:8px 16px 0;';
    const searchInp = document.createElement('input');
    searchInp.type = 'text'; searchInp.placeholder = '🔍 Rechercher un chauffeur...';
    searchInp.className = 'rep-search'; searchInp.style.cssText = 'width:300px;';
    searchInp.oninput = () => {
      const q = searchInp.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      container.querySelectorAll('tbody tr').forEach(tr => {
        const name = (tr.firstElementChild?.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        tr.style.display = name.includes(q) ? '' : 'none';
      });
    };
    searchBar.appendChild(searchInp);
    container.appendChild(searchBar);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow:auto;padding:16px;';
    body.appendChild(buildRapportChauffeur());
    container.appendChild(body);
  }
}

function buildMainNav() {
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;gap:0;border-bottom:2px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;';
  [['statistiques','📊 Statistiques'],['rapport','📋 Rapport Chauffeur']].forEach(([id,label]) => {
    const btn = document.createElement('button');
    btn.style.cssText = 'flex:1;padding:12px 16px;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--text-muted);font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-family);transition:all 0.18s;';
    btn.textContent = label;
    if (statsMainTab === id) {
      btn.style.color = 'var(--accent)';
      btn.style.borderBottomColor = 'var(--accent)';
      btn.style.background = 'var(--accent-dim)';
    }
    btn.onmouseenter = () => { if (statsMainTab !== id) btn.style.background = 'var(--bg-tab-hover)'; };
    btn.onmouseleave = () => { if (statsMainTab !== id) btn.style.background = 'transparent'; };
    btn.onclick = () => { statsMainTab = id; renderStats(); };
    nav.appendChild(btn);
  });
  return nav;
}

function buildStatsNav() {
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;gap:4px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;';
  [['dsdpmo','DS / DPMO'],['pod','POD'],['dwc','DWC'],['envoi','📤 Envoi']].forEach(([id,label]) => {
    const btn = document.createElement('button');
    btn.className = 'h-btn'; btn.textContent = label;
    if (statsTab === id) btn.style.cssText = 'background:var(--accent);color:#fff;border-color:var(--accent);';
    btn.onclick = () => { statsTab = id; renderStats(); };
    nav.appendChild(btn);
  });
  return nav;
}

/* ── Utilitaires ──────────────────────────────────────────── */
function getStationId() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }
function statsStorageKey(type, semaine) { return getStationId() + '-stats-' + type + '-' + semaine; }
function saveStatsData(type, semaine, data) {
  const key = statsStorageKey(type, semaine);
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('stats', key, { station_id: getStationId(), type, semaine }, data);
}
function loadStatsData(type, semaine) { try { const r = localStorage.getItem(statsStorageKey(type, semaine)); return r ? JSON.parse(r) : []; } catch (_) { return []; } }

function getWeeksList(type) {
  const prefix = getStationId() + '-stats-' + type + '-';
  const weeks = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix)) weeks.push(k.replace(prefix, '')); }
  return weeks.sort().reverse();
}

function resolveDriver(id) { return resolveIdAmazon(id, getStationId()); }
function driverCell(id) { const d = resolveDriver(id); return d ? d.nom : `<span style="color:#f97316">${id}</span>`; }

function waBtn(idAmazon, message) {
  const d = resolveDriver(idAmazon);
  const tel = d ? formatWaTel(d.telephone) : '';
  const btn = document.createElement('button');
  btn.className = 'h-btn'; btn.style.cssText = 'font-size:11px;padding:3px 7px;background:#25d366;color:#fff;border:none;';
  btn.textContent = '💬'; btn.title = 'WhatsApp';
  btn.onclick = () => {
    navigator.clipboard.writeText(message).catch(()=>{});
    if (tel) {
      const a = document.createElement('a');
      a.href = 'whatsapp://send?phone=' + tel + '&text=' + encodeURIComponent(message);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };
  return btn;
}

/** Normalise un numéro de téléphone pour wa.me (format international sans +) */
function formatWaTel(raw) {
  if (!raw) return '';
  let tel = raw.replace(/\D/g, '');
  // Si commence par 0 (format français), remplacer par 33
  if (tel.startsWith('0')) tel = '33' + tel.slice(1);
  return tel;
}

function deleteRowBtn(type, semaine, idAmazon, tr) {
  const btn = document.createElement('button');
  btn.className = 'rep-btn rep-btn-delete'; btn.style.cssText = 'font-size:11px;padding:3px 7px;';
  btn.textContent = '🗑'; btn.title = 'Supprimer la ligne';
  btn.onclick = () => {
    const data = loadStatsData(type, semaine).filter(r => String(r.idAmazon).replace(/\s/g,'').toUpperCase() !== String(idAmazon).replace(/\s/g,'').toUpperCase());
    saveStatsData(type, semaine, data); tr.remove();
  };
  return btn;
}

function deleteWeekBtn(type, semaine, clearFn) {
  if (!semaine) return document.createTextNode('');
  const btn = document.createElement('button');
  btn.className = 'rep-btn rep-btn-delete'; btn.style.cssText = 'font-size:12px;padding:5px 12px;';
  btn.textContent = '🗑 Supprimer la semaine';
  btn.onclick = () => {
    showConfirmModal('Supprimer toutes les données de la semaine "' + semaine + '" ?', () => {
      const key = statsStorageKey(type, semaine);
      localStorage.removeItem(key);
      if (typeof dbDelete === 'function') dbDelete('stats', key, { station_id: getStationId(), type, semaine });
      clearFn(); renderStats();
    });
  };
  return btn;
}

function weekSelector(current, weeks, onChange) {
  if (!weeks.length) return document.createTextNode('');
  const sel = document.createElement('select'); sel.className = 'rep-input'; sel.style.cssText = 'width:auto;padding:4px 8px;font-size:12px;';
  weeks.forEach(w => { const o = document.createElement('option'); o.value = w; o.textContent = 'Semaine '+w; if (w===current) o.selected=true; sel.appendChild(o); });
  sel.onchange = () => onChange(sel.value);
  return sel;
}

function buildStatsToolbar(importBtn, type, currentWeek, weeks, setWeek) {
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;';
  if (importBtn && importBtn.nodeType === Node.ELEMENT_NODE) bar.appendChild(importBtn);
  if (weeks && weeks.length) {
    const sel = weekSelector(currentWeek, weeks, w => { setWeek(w); renderStats(); });
    if (sel && sel.nodeType === Node.ELEMENT_NODE) bar.appendChild(sel);
  }
  if (currentWeek) {
    const del = deleteWeekBtn(type, currentWeek, () => setWeek(''));
    if (del && del.nodeType === Node.ELEMENT_NODE) bar.appendChild(del);
  }
  return bar;
}

/* ── DS/DPMO ──────────────────────────────────────────────── */
function buildDSDPMO() {
  const wrap = document.createElement('div');
  const weeks = getWeeksList('dsdpmo');
  if (!statsWeekDSDPMO && weeks.length) statsWeekDSDPMO = weeks[0];
  const data = statsWeekDSDPMO ? loadStatsData('dsdpmo', statsWeekDSDPMO) : [];

  const importBtn = document.createElement('button');
  importBtn.className = 'rep-btn rep-btn-primary'; importBtn.textContent = '📂 Importer CSV';
  importBtn.onclick = () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const text = await readFileAsText(file);
      const rows = parseCSVDSDPMO(text);
      if (!rows.length) { alert('Aucune donnée trouvée dans ce CSV.'); return; }
      showPromptModal('Numéro de semaine pour ces données DS/DPMO', 'ex: 15', rows[0].semaine || '', (semaine) => {
        statsWeekDSDPMO = semaine;
        // Met à jour le champ semaine dans chaque ligne
      rows.forEach(r => { r.semaine = semaine; });
      saveStatsData('dsdpmo', statsWeekDSDPMO, rows); renderStats();
      });
    }; inp.click();
  };
  wrap.appendChild(buildStatsToolbar(importBtn, 'dsdpmo', statsWeekDSDPMO, weeks, w => { statsWeekDSDPMO = w; }));

  if (!data.length) { const p = document.createElement('p'); p.style.cssText='color:var(--text-muted);text-align:center;margin-top:40px;'; p.textContent='Aucune donnée. Importez un fichier CSV.'; wrap.appendChild(p); return wrap; }

  const table = document.createElement('table'); table.className = 'rep-table';
  table.innerHTML = '<thead><tr><th>Chauffeur</th><th>Semaine</th><th>Colis livrés</th><th>Colis ramenés</th><th>DCR%</th><th>DNR DPMO</th><th>Nombre DNR</th><th></th></tr></thead>';
  const tbody = document.createElement('tbody');
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${driverCell(r.idAmazon)}</td><td>${r.semaine}</td><td>${r.colis}</td><td>${r.colisRam}</td><td>${r.dcrPct}%</td><td>${r.dnrDpmo}</td><td>${r.nombreDnr}</td><td style="display:flex;gap:4px;"></td>`;
    tr.lastElementChild.appendChild(deleteRowBtn('dsdpmo', statsWeekDSDPMO, r.idAmazon, tr));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); wrap.appendChild(table); return wrap;
}

/* ── POD ──────────────────────────────────────────────────── */
function buildPOD() {
  const wrap = document.createElement('div');
  const weeks = getWeeksList('pod');
  if (!statsWeekPOD && weeks.length) statsWeekPOD = weeks[0];
  const data = statsWeekPOD ? loadStatsData('pod', statsWeekPOD) : [];

  const importBtn = document.createElement('button');
  importBtn.className = 'rep-btn rep-btn-primary'; importBtn.textContent = '📄 Importer PDF';
  importBtn.onclick = () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='.pdf,application/pdf';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const text = await readPDFAsText(file);
      console.log('Toutes les clés localStorage:', Object.keys(localStorage));
      console.log('Station active:', sessionStorage.getItem('stationActive') || localStorage.getItem('stationActive'));
      showPromptModal('Numéro de semaine pour ces données POD', 'ex: 15', '', (semaine) => {
        const rows = parsePDFTextPOD(text, semaine);
        if (!rows.length) { alert('Aucune donnée POD trouvée.'); return; }
        statsWeekPOD = semaine; saveStatsData('pod', semaine, rows); renderStats();
      });
    }; inp.click();
  };
  wrap.appendChild(buildStatsToolbar(importBtn, 'pod', statsWeekPOD, weeks, w => { statsWeekPOD = w; }));

  // Badge impacts POD — ajouté dans la toolbar à droite
  if (data.length && typeof getPodImpacts === 'function') {
    const impacts = getPodImpacts(data);
    const toolbar = wrap.querySelector('.rep-toolbar') || wrap.firstElementChild;
    if (toolbar) toolbar.appendChild(buildImpactBadge('pod', impacts));
  }

  if (!data.length) { const p = document.createElement('p'); p.style.cssText='color:var(--text-muted);text-align:center;margin-top:40px;'; p.textContent='Aucune donnée. Importez un fichier PDF.'; wrap.appendChild(p); return wrap; }

  const table = document.createElement('table'); table.className = 'rep-table';
  table.innerHTML = '<thead><tr><th>Chauffeur</th><th>Semaine</th><th>Opportunities</th><th>Success</th><th>Rejects</th><th>POD Success%</th><th></th></tr></thead>';
  const tbody = document.createElement('tbody');
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${driverCell(r.idAmazon)}</td><td>${r.semaine}</td><td>${r.opportunities}</td><td>${r.success ?? ''}</td><td>${r.rejects}</td><td>${r.podPct}%</td><td style="display:flex;gap:4px;"></td>`;
    tr.lastElementChild.appendChild(deleteRowBtn('pod', statsWeekPOD, r.idAmazon, tr));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); wrap.appendChild(table); return wrap;
}

/* ── DWC ──────────────────────────────────────────────────── */
function buildDWC() {
  const wrap = document.createElement('div');
  const weeks = getWeeksList('dwc');
  if (!statsWeekDWC && weeks.length) statsWeekDWC = weeks[0];
  const data = statsWeekDWC ? loadStatsData('dwc', statsWeekDWC) : [];

  const importHtmlBtn = document.createElement('button');
  importHtmlBtn.className = 'rep-btn rep-btn-primary'; importHtmlBtn.textContent = '🌐 Importer HTML DWC';
  importHtmlBtn.onclick = () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='.html,.htm';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      showPromptModal('Numéro de semaine pour ces données DWC', 'ex: 15', '', async (semaine) => {
        const rows = await parseDWCHTML(file, semaine);
        if (!rows.length) { alert('Aucune donnée extraite du fichier HTML.'); return; }
        statsWeekDWC = semaine;
        saveStatsData('dwc', semaine, rows);
        renderStats();
      });
    }; inp.click();
  };

  const toolbarWrap = document.createElement('div');
  toolbarWrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;';
  toolbarWrap.appendChild(importHtmlBtn);
  const sel = weekSelector(statsWeekDWC, weeks, w => { statsWeekDWC = w; renderStats(); });
  if (sel && sel.nodeType === Node.ELEMENT_NODE) toolbarWrap.appendChild(sel);
  if (statsWeekDWC) { const del = deleteWeekBtn('dwc', statsWeekDWC, () => { statsWeekDWC = ''; }); if (del && del.nodeType === Node.ELEMENT_NODE) toolbarWrap.appendChild(del); }
  wrap.appendChild(toolbarWrap);

  // Badge impacts DWC — ajouté dans la toolbar à droite
  if (data.length && typeof getDwcImpacts === 'function') {
    const impacts = getDwcImpacts(data);
    toolbarWrap.appendChild(buildImpactBadge('dwc', impacts));
  }

  if (!data.length) { const p = document.createElement('p'); p.style.cssText='color:var(--text-muted);text-align:center;margin-top:40px;'; p.textContent='Aucune donnée. Importez un fichier HTML DWC.'; wrap.appendChild(p); return wrap; }

  const table = document.createElement('table'); table.className = 'rep-table';
  table.innerHTML = '<thead><tr><th>Chauffeur</th><th>DWC%</th><th>Contact Miss</th><th></th></tr></thead>';
  const tbody = document.createElement('tbody');
  [...data].sort((a,b) => a.dwcPct - b.dwcPct).forEach(r => {
    const tr = document.createElement('tr');
    const d = resolveDriver(r.idAmazon);
    const prenom = d ? d.nom.split(' ')[0] : r.idAmazon;
    const msg = `Bonjour ${prenom}, voici votre score DWC semaine ${r.semaine} : 📊 DWC : ${r.dwcPct}% | 📵 Contact Miss : ${r.contactMiss}`;
    tr.innerHTML = `<td>${driverCell(r.idAmazon)}</td><td>${r.dwcPct}%</td><td>${r.contactMiss}</td><td style="display:flex;gap:4px;"></td>`;
    tr.lastElementChild.appendChild(deleteRowBtn('dwc', statsWeekDWC, r.idAmazon, tr));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); wrap.appendChild(table); return wrap;
}

function showDWCColModal(source, semaine, isHtml) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
  overlay.innerHTML = `<div style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:28px 32px;width:360px;display:flex;flex-direction:column;gap:14px;">
    <h3 style="margin:0;font-size:1rem;color:var(--text-primary);">Colonne Contact Miss</h3>
    <p style="margin:0;font-size:12px;color:var(--text-muted);">Numéro de colonne "Contact Miss" (ex: 5, 6 ou 7)</p>
    <input id="dwc-col-inp" type="number" min="1" max="20" value="5" style="background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px;outline:none;">
    <div style="display:flex;gap:10px;">
      <button id="dwc-col-ok" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:6px;padding:8px;font-size:13px;font-weight:600;cursor:pointer;">Confirmer</button>
      <button id="dwc-col-cancel" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:6px;padding:8px 14px;font-size:13px;cursor:pointer;">Annuler</button>
    </div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#dwc-col-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#dwc-col-ok').onclick = () => {
    const colIdx = parseInt(overlay.querySelector('#dwc-col-inp').value) - 1;
    overlay.remove();
    const parsed = isHtml ? parseDWCHtml(source, colIdx, semaine) : parseDWCRows(source, colIdx, semaine);
    if (!parsed.length) { alert('Aucune donnée extraite. Vérifiez le numéro de colonne.'); return; }
    statsWeekDWC = semaine;
    saveStatsData('dwc', semaine, parsed); renderStats();
  };
}

function parseDWCRows(rows, contactMissColIdx, semaine) {
  const result = []; let startRow = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (rows[i].some(c => String(c).toLowerCase().includes('transporter') || String(c).toLowerCase().includes('id'))) { startRow = i+1; break; }
  }
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const idAmazon = String(row[0]||'').replace(/\s/g,'').toUpperCase();
    if (!idAmazon || !idAmazon.startsWith('A')) continue;
    const dwcRaw = parseFloat(String(row[1]||'0').replace('%','').replace(',','.')) || 0;
    const dwcPct = dwcRaw > 1 ? Math.round(dwcRaw*100)/100 : Math.round(dwcRaw*10000)/100;
    const iadcRaw = parseFloat(String(row[2]||'').replace('%','').replace(',','.'));
    const iadcPct = isNaN(iadcRaw) ? null : (iadcRaw > 1 ? Math.round(iadcRaw*100)/100 : Math.round(iadcRaw*10000)/100);
    const contactMiss = row[contactMissColIdx] != null ? String(row[contactMissColIdx]).trim() : '—';
    result.push({ semaine, idAmazon, dwcPct, iadcPct, contactMiss });
  }
  return result;
}

async function parseDWCHTML(file, semaine) {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');

  const weekSection = doc.querySelector('section[data-tab^="week_"]');
  if (!weekSection) { alert('Structure HTML non reconnue : section[data-tab^="week_"] introuvable.'); return []; }

  const results = [];
  const rows = weekSection.querySelectorAll('tr');

  rows.forEach(row => {
    const th = row.querySelector('th');
    if (!th) return;
    const amazonId = th.textContent.trim().replace(/\s/g,'').toUpperCase();
    if (!amazonId.startsWith('A') || amazonId.length < 10) return;

    const tds = row.querySelectorAll('td');
    if (!tds.length) return;
    const dwc = tds[0].textContent.trim();
    if (!dwc.includes('%')) return;

    let contactMiss = 0;
    row.querySelectorAll('td[data-expand-cell="Delivery Misses - DNR Risk-Contact Miss"]').forEach(td => {
      const val = parseInt(td.textContent.trim());
      if (!isNaN(val)) contactMiss += val;
    });

    const dwcPct = parseFloat(dwc.replace('%','').replace(',','.')) || 0;
    results.push({ semaine, idAmazon: amazonId, dwcPct, contactMiss: String(contactMiss) });
  });

  return results;
}

function parseDWCHtml(htmlText, contactMissColIdx, semaine) { return []; } // legacy stub

/* ── ENVOI ────────────────────────────────────────────────── */
function buildEnvoi() {
  const wrap = document.createElement('div');
  const stationId = getStationId();

  // Sélecteur de semaine commun (utilise les semaines DS/DPMO comme référence)
  const weeksDSDPMO = getWeeksList('dsdpmo');
  const weeksPOD    = getWeeksList('pod');
  const weeksDWC    = getWeeksList('dwc');
  const allWeeks    = [...new Set([...weeksDSDPMO, ...weeksPOD, ...weeksDWC])].sort().reverse();
  if (!statsWeekEnvoi && allWeeks.length) statsWeekEnvoi = allWeeks[0];

  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;';

  const sendAllBtn = document.createElement('button');
  sendAllBtn.className = 'rep-btn rep-btn-primary';
  sendAllBtn.textContent = '📤 Envoyer à tous';

  const sel = weekSelector(statsWeekEnvoi, allWeeks, w => { statsWeekEnvoi = w; renderStats(); });
  toolbar.appendChild(sendAllBtn);
  if (sel && sel.nodeType === Node.ELEMENT_NODE) toolbar.appendChild(sel);
  wrap.appendChild(toolbar);

  if (!statsWeekEnvoi) {
    const p = document.createElement('p'); p.style.cssText='color:var(--text-muted);text-align:center;margin-top:40px;';
    p.textContent='Aucune donnée disponible. Importez des données dans DS/DPMO, POD et DWC.'; wrap.appendChild(p); return wrap;
  }

  // Consolide les données par ID Amazon
  const dsdpmo = loadStatsData('dsdpmo', statsWeekEnvoi);
  const pod    = loadStatsData('pod',    statsWeekEnvoi);
  const dwc    = loadStatsData('dwc',    statsWeekEnvoi);

  const byId = {};
  dsdpmo.forEach(r => { byId[r.idAmazon] = { ...byId[r.idAmazon], ...r }; });
  pod.forEach(r    => { byId[r.idAmazon] = { ...byId[r.idAmazon], ...r }; });
  dwc.forEach(r    => { byId[r.idAmazon] = { ...byId[r.idAmazon], ...r }; });

  const rows = Object.values(byId);
  if (!rows.length) {
    const p = document.createElement('p'); p.style.cssText='color:var(--text-muted);text-align:center;margin-top:40px;';
    p.textContent='Aucune donnée pour cette semaine.'; wrap.appendChild(p); return wrap;
  }

  sendAllBtn.onclick = () => {
    const withTel = rows.filter(r => { const d = resolveDriver(r.idAmazon); return d && d.telephone; });
    if (!withTel.length) { alert('Aucun chauffeur avec numéro de téléphone trouvé.'); return; }

    let idx = 0;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:24px;text-align:center;max-width:360px;width:90%;';
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function showCurrent() {
      if (idx >= withTel.length) {
        box.innerHTML = '<div style="font-size:16px;font-weight:700;color:#4ade80;margin-bottom:12px;">✅ Terminé !</div><div style="font-size:12px;color:var(--text-muted);">Tous les messages ont été envoyés.</div><button class="h-btn" style="margin-top:12px;" id="wa-close">Fermer</button>';
        box.querySelector('#wa-close').onclick = () => overlay.remove();
        return;
      }
      const r = withTel[idx];
      const d = resolveDriver(r.idAmazon);
      const nom = d ? d.nom : r.idAmazon;
      const msg = buildWAMsg(r, statsWeekEnvoi);
      const tel = formatWaTel(d.telephone);
      box.innerHTML = `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">${idx + 1} / ${withTel.length}</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:12px;">${nom}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:16px;max-height:100px;overflow:auto;text-align:left;padding:8px;background:rgba(255,255,255,0.04);border-radius:6px;">${msg.replace(/\n/g,'<br>')}</div>
        <button class="rep-btn rep-btn-primary" id="wa-send" style="width:100%;margin-bottom:8px;">💬 Envoyer à ${nom}</button>
        <button class="h-btn" id="wa-skip" style="width:100%;font-size:11px;">Passer ›</button>
        <button class="h-btn" id="wa-cancel" style="width:100%;font-size:11px;margin-top:4px;opacity:0.5;">Annuler</button>
      `;
      box.querySelector('#wa-send').onclick = () => {
        navigator.clipboard.writeText(msg).catch(() => {});
        const a = document.createElement('a');
        a.href = 'whatsapp://send?phone=' + tel + '&text=' + encodeURIComponent(msg);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        idx++;
        showCurrent();
      };
      box.querySelector('#wa-skip').onclick = () => { idx++; showCurrent(); };
      box.querySelector('#wa-cancel').onclick = () => overlay.remove();
    }
    showCurrent();
  };

  const table = document.createElement('table'); table.className = 'rep-table';
  table.innerHTML = '<thead><tr><th>Chauffeur</th><th>Colis livrés</th><th>Colis ramenés</th><th>DCR%</th><th>DNR DPMO</th><th>Nombre DNR</th><th>POD%</th><th>DWC%</th><th>Contact Miss</th><th></th></tr></thead>';
  const tbody = document.createElement('tbody');

  rows.forEach(r => {
    const tr = document.createElement('tr');
    const d = resolveDriver(r.idAmazon);
    const tel = d ? formatWaTel(d.telephone) : '';
    const msg = buildWAMsg(r, statsWeekEnvoi);

    tr.innerHTML = `
      <td>${driverCell(r.idAmazon)}</td>
      <td>${r.colis ?? '—'}</td>
      <td>${r.colisRam ?? '—'}</td>
      <td>${r.dcrPct != null ? r.dcrPct+'%' : '—'}</td>
      <td>${r.dnrDpmo ?? '—'}</td>
      <td>${r.nombreDnr ?? '—'}</td>
      <td>${r.podPct != null ? r.podPct+'%' : '—'}</td>
      <td>${r.dwcPct != null ? r.dwcPct+'%' : '—'}</td>
      <td>${r.contactMiss ?? '—'}</td>
      <td style="white-space:nowrap;"></td>
    `;

    const actionCell = tr.lastElementChild;
    const waButton = document.createElement('button');
    waButton.className = 'h-btn';
    waButton.style.cssText = tel
      ? 'font-size:11px;padding:3px 7px;background:#25d366;color:#fff;border:none;'
      : 'font-size:11px;padding:3px 7px;background:#f97316;color:#fff;border:none;';
    waButton.textContent = tel ? '💬 Envoyer' : '⚠ Numéro manquant';
    waButton.onclick = () => {
      navigator.clipboard.writeText(msg).catch(() => {});
      if (tel) {
        const a = document.createElement('a');
        a.href = 'whatsapp://send?phone=' + tel + '&text=' + encodeURIComponent(msg);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else alert('Ce chauffeur n\'a pas de numéro dans le répertoire.\n\nMessage copié :\n' + msg);
    };
    actionCell.appendChild(waButton);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody); wrap.appendChild(table); return wrap;
}

function buildWAMsg(r, semaine) {
  const d = resolveDriver(r.idAmazon);
  const prenom = d ? d.nom.split(' ')[0] : r.idAmazon;
  const colis    = r.colis    ?? '—';
  const colisRam = r.colisRam ?? '—';
  const dcrPct   = r.dcrPct   != null ? r.dcrPct + '%' : '—';
  const dnrDpmo  = r.dnrDpmo  ?? '—';
  const nombreDnr = r.nombreDnr ?? 0;
  const podPct   = r.podPct   != null ? r.podPct + '%' : '—';
  const opp      = r.opportunities ?? '—';
  const success  = r.success  ?? '—';
  const dwcPct   = r.dwcPct   != null ? r.dwcPct + '%' : '—';
  const cm       = r.contactMiss ?? '0';

  const dnrLine = (nombreDnr === 0 || nombreDnr === '0')
    ? `Tu as eu 0 DNR, ce qui fait un score DPMO de 0.`
    : `Tu as eu ${nombreDnr} DNR, ce qui fait un score DPMO de ${dnrDpmo}.`;

  const dwcLine = (cm === '0' || cm === 0)
    ? `Tu n'as contacté aucun client manqué, ton DWC est de ${dwcPct}.`
    : `Tu n'as pas contacté ${cm} clients, donc ton taux de DWC est de ${dwcPct}.`;

  return `Salut ${prenom} 👋

Voici tes statistiques de la WEEK ${semaine}.

Tu as livré ${colis} colis et en as retourné ${colisRam}, ce qui te fait une DS de ${dcrPct}.

${dnrLine}

Ton pourcentage de photo réussi est de ${podPct}, soit ${opp} opportunités pour ${success} photos réussies.

${dwcLine}

⚡ Rappel de nos objectifs : DS > 98,5%, DPMO < 2500, POD > 99%, DWC2.0 > 90%.

Si tu n'as pas atteint certains de ces objectifs, je compte sur toi pour améliorer ces points en priorité ! Sinon, bravo à toi pour ton travail de cette semaine ! Je reste disponible si tu as la moindre question.

📱 Retrouve toutes tes infos dans ton espace personnel SunXP Pro.`;
}
