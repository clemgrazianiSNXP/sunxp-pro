/* js/flotte-attribution.js — Attribution camions tableau (SunXP Pro) v3 */
console.log('flotte-attribution.js chargé');

let attrDate = new Date();

/* ── Persistance ──────────────────────────────────────────── */
function attrKey(sid, d) { return sid + '-attribution-' + d.toISOString().slice(0, 10); }
function loadAttr(sid, d) { try { return JSON.parse(localStorage.getItem(attrKey(sid, d))); } catch (_) { return null; } }
function saveAttr(sid, d, data) {
  localStorage.setItem(attrKey(sid, d), JSON.stringify(data));
  if (typeof dbSave === 'function') dbSave('attribution', attrKey(sid, d), { station_id: sid, date_jour: d.toISOString().slice(0, 10) }, data);
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderAttribution() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;height:100%;overflow:hidden;';
  const sid = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!sid) { wrap.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Sélectionnez une station.</p>'; return wrap; }

  const camions = typeof loadCamions === 'function' ? loadCamions() : [];
  let chauffeurs = [];
  try { chauffeurs = JSON.parse(localStorage.getItem(sid + '-repertoire')) || []; } catch (_) {}
  const chauffeurNames = chauffeurs.map(c => (c.prenom + ' ' + c.nom).trim());

  let rows = loadAttr(sid, attrDate);
  if (!rows) {
    rows = camions.map(c => ({ plaque: c.plaque, modele: (c.marque || '') + ' ' + (c.modele || ''), bva: c.bva || false, chauffeur: '', pda: '', trs: '', lic: '', clef: '', vigik: '', com: '' }));
    saveAttr(sid, attrDate, rows);
  }

  // Toolbar
  wrap.appendChild(buildAttrToolbar(sid, rows));

  // Tableau scrollable
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'flex:1;overflow:auto;';

  const table = document.createElement('table');
  table.className = 'h-table';
  table.style.cssText = 'font-size:11px;width:100%;border-collapse:collapse;';

  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th style="padding:6px 4px;text-align:left;min-width:60px;font-size:10px;">Plaque</th><th style="padding:6px 4px;min-width:30px;font-size:10px;">St</th><th style="padding:6px 4px;text-align:left;min-width:100px;font-size:10px;">Chauffeur</th><th style="padding:6px 4px;min-width:40px;font-size:10px;">PDA</th><th style="padding:6px 4px;min-width:40px;font-size:10px;">Clef</th><th style="padding:6px 4px;min-width:50px;font-size:10px;">VIGIK</th><th style="padding:6px 4px;min-width:34px;font-size:10px;">Trs</th><th style="padding:6px 4px;min-width:34px;font-size:10px;">Lic</th><th style="padding:6px 2px;min-width:20px;font-size:9px;" title="Retour PDA">rP</th><th style="padding:6px 2px;min-width:20px;font-size:9px;" title="Retour Trousseau">rT</th><th style="padding:6px 2px;min-width:20px;font-size:9px;" title="Retour Licence">rL</th><th style="padding:6px 2px;min-width:20px;font-size:9px;" title="Retour Clef">rC</th><th style="padding:6px 2px;min-width:20px;font-size:9px;" title="Retour VIGIK">rV</th><th style="padding:6px 2px;min-width:20px;font-size:9px;" title="Validé">✓</th><th style="padding:6px 4px;min-width:80px;font-size:10px;">Com.</th></tr>';
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  rows.forEach(function(r, idx) {
    const tr = document.createElement('tr');
    tr.style.cssText = idx % 2 === 0 ? 'background:var(--bg-sidebar);' : '';

    // Plaque (non éditable)
    const tdPlaque = document.createElement('td');
    tdPlaque.style.cssText = 'padding:4px;font-weight:700;color:var(--accent);white-space:nowrap;font-size:10px;';
    tdPlaque.textContent = r.plaque + (r.bva ? ' BVA' : '');
    tr.appendChild(tdPlaque);

    // Statut (OK / BU / X)
    var tdSt = document.createElement('td');
    tdSt.style.cssText = 'padding:2px;text-align:center;';
    var selSt = document.createElement('select');
    selSt.className = 'h-inp';
    selSt.style.cssText = 'width:32px;font-size:9px;padding:1px;font-weight:700;';
    ['OK', 'BU', 'X'].forEach(function(opt) {
      var o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if ((r.statut || 'OK') === opt) o.selected = true;
      selSt.appendChild(o);
    });
    var stColors = { OK: '#4ade80', BU: '#60a5fa', X: '#f87171' };
    selSt.style.color = stColors[r.statut || 'OK'] || '';
    selSt.onchange = function() {
      r.statut = selSt.value;
      saveAttr(sid, attrDate, rows);
      if (typeof renderFlotte === 'function') renderFlotte();
    };
    tdSt.appendChild(selSt);
    tr.appendChild(tdSt);

    // Si X → fusionner toutes les colonnes restantes
    if ((r.statut || 'OK') === 'X') {
      tr.style.opacity = '0.4';
      tr.style.background = 'rgba(248,113,113,0.05)';
      var tdFusion = document.createElement('td');
      tdFusion.colSpan = 13;
      tdFusion.style.cssText = 'padding:4px;';
      var inpFusion = document.createElement('input');
      inpFusion.className = 'h-inp';
      inpFusion.style.cssText = 'width:100%;font-size:10px;padding:3px;color:#f87171;font-style:italic;';
      inpFusion.placeholder = 'Motif indisponibilité...';
      inpFusion.value = r.com || '';
      inpFusion.onchange = function() { r.com = inpFusion.value; saveAttr(sid, attrDate, rows); };
      tdFusion.appendChild(inpFusion);
      tr.appendChild(tdFusion);
      tbody.appendChild(tr);
      return;
    }

    // Chauffeur (select)
    const tdChauffeur = document.createElement('td');
    tdChauffeur.style.cssText = 'padding:2px;';
    const selCh = document.createElement('select');
    selCh.className = 'h-inp';
    selCh.style.cssText = 'width:100%;font-size:11px;padding:3px;';
    var optEmpty = document.createElement('option');
    optEmpty.value = ''; optEmpty.textContent = '—';
    selCh.appendChild(optEmpty);
    chauffeurNames.forEach(function(name) {
      var opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      if (name === r.chauffeur) opt.selected = true;
      selCh.appendChild(opt);
    });
    selCh.onchange = function() { r.chauffeur = selCh.value; saveAttr(sid, attrDate, rows); };
    tdChauffeur.appendChild(selCh);
    tr.appendChild(tdChauffeur);

    // Champs éditables texte
    ['pda', 'clef', 'vigik', 'trs', 'lic'].forEach(function(field) {
      var td = document.createElement('td');
      td.style.cssText = 'padding:2px;';
      var inp = document.createElement('input');
      inp.className = 'h-inp';
      inp.style.cssText = 'width:100%;font-size:10px;padding:3px;';
      inp.value = r[field] || '';
      inp.onchange = function() { r[field] = inp.value; saveAttr(sid, attrDate, rows); };
      td.appendChild(inp);
      tr.appendChild(td);
    });

    // Cases à cocher retour
    ['rP', 'rT', 'rL', 'rC', 'rV', 'ok'].forEach(function(field) {
      var td = document.createElement('td');
      td.style.cssText = 'padding:2px;text-align:center;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!r[field];
      cb.style.cssText = 'width:14px;height:14px;accent-color:var(--accent);cursor:pointer;';
      cb.onchange = function() { r[field] = cb.checked; saveAttr(sid, attrDate, rows); };
      td.appendChild(cb);
      tr.appendChild(td);
    });

    // Commentaire
    var tdCom = document.createElement('td');
    tdCom.style.cssText = 'padding:2px;';
    var inpCom = document.createElement('input');
    inpCom.className = 'h-inp';
    inpCom.style.cssText = 'width:100%;font-size:10px;padding:3px;';
    inpCom.value = r.com || '';
    inpCom.onchange = function() { r.com = inpCom.value; saveAttr(sid, attrDate, rows); };
    tdCom.appendChild(inpCom);
    tr.appendChild(tdCom);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);
  return wrap;
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildAttrToolbar(sid, rows) {
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex-shrink:0;';

  // Navigation date
  var prev = document.createElement('button');
  prev.className = 'h-btn h-nav'; prev.textContent = '◀';
  prev.onclick = function() { attrDate.setDate(attrDate.getDate() - 1); if (typeof renderFlotte === 'function') renderFlotte(); };

  var label = document.createElement('span');
  label.style.cssText = 'font-size:13px;font-weight:700;min-width:140px;text-align:center;';
  label.textContent = attrDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  var next = document.createElement('button');
  next.className = 'h-btn h-nav'; next.textContent = '▶';
  next.onclick = function() { attrDate.setDate(attrDate.getDate() + 1); if (typeof renderFlotte === 'function') renderFlotte(); };

  var todayBtn = document.createElement('button');
  todayBtn.className = 'h-btn'; todayBtn.textContent = "Aujourd'hui";
  todayBtn.onclick = function() { attrDate = new Date(); if (typeof renderFlotte === 'function') renderFlotte(); };

  // Dupliquer veille
  var dupBtn = document.createElement('button');
  dupBtn.className = 'rep-btn rep-btn-primary';
  dupBtn.style.cssText = 'font-size:11px;padding:6px 12px;margin-left:auto;';
  dupBtn.textContent = '📋 Dupliquer veille';
  dupBtn.onclick = function() {
    var yest = new Date(attrDate); yest.setDate(yest.getDate() - 1);
    var prevData = loadAttr(sid, yest);
    if (!prevData) { alert('Pas de données la veille.'); return; }
    saveAttr(sid, attrDate, JSON.parse(JSON.stringify(prevData)));
    if (typeof renderFlotte === 'function') renderFlotte();
  };

  bar.appendChild(prev); bar.appendChild(label); bar.appendChild(next);
  bar.appendChild(todayBtn); bar.appendChild(dupBtn);
  return bar;
}
