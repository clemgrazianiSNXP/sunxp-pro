/* js/flotte-attribution.js — Attribution camions tableau (SunXP Pro) v3 */

let attrDate = new Date();
let attrSearchNoData = false;

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

  let rows = [];
  if (!attrSearchNoData) {
    rows = loadAttr(sid, attrDate);
    if (!rows) {
      rows = camions.map(c => ({ plaque: c.plaque, modele: (c.marque || '') + ' ' + (c.modele || ''), bva: c.bva || false, chauffeur: '', pda: '', trs: '', lic: '', clef: '', vigik: '', com: '' }));
      saveAttr(sid, attrDate, rows);
    }
  }

  // Toolbar
  wrap.appendChild(buildAttrToolbar(sid, rows));
  if (attrSearchNoData) {
    const message = document.createElement('p');
    message.style.cssText = 'color:var(--text-muted);text-align:center;padding:20px;font-size:13px;';
    message.textContent = 'Aucune attribution enregistrée pour cette date';
    wrap.appendChild(message);
    return wrap;
  }

  // Tableau scrollable
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'flex:1;overflow:auto;';

  const table = document.createElement('table');
  table.className = 'h-table';
  table.style.cssText = 'font-size:11px;width:100%;border-collapse:collapse;table-layout:fixed;';

  // Colgroup pour contrôler les largeurs
  const colgroup = document.createElement('colgroup');
  colgroup.innerHTML = '<col style="width:16px"><col style="width:24px"><col style="width:36px"><col style="width:70px"><col style="width:40px"><col style="width:130px"><col style="width:34px"><col style="width:34px"><col style="width:30px"><col style="width:40px"><col style="width:40px"><col style="width:20px"><col style="width:20px"><col style="width:20px"><col style="width:20px"><col style="width:20px"><col style="width:20px"><col style="width:120px">';
  table.appendChild(colgroup);

  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr style="text-align:center;"><th style="padding:2px;font-size:8px;"></th><th style="padding:4px 1px;font-size:9px;">TP</th><th style="padding:4px 1px;font-size:9px;">UTA</th><th style="padding:4px 2px;font-size:9px;text-align:center;">Plaque</th><th style="padding:4px 1px;font-size:9px;text-align:center;">Statut</th><th style="padding:4px 2px;font-size:9px;text-align:center;">Chauffeur</th><th style="padding:4px 1px;font-size:9px;">PDA</th><th style="padding:4px 1px;font-size:9px;">Trs</th><th style="padding:4px 1px;font-size:9px;">Lic</th><th style="padding:4px 1px;font-size:9px;">Clé</th><th style="padding:4px 1px;font-size:9px;">VIGIK</th><th style="padding:2px 0;font-size:8px;" title="Retour PDA">rP</th><th style="padding:2px 0;font-size:8px;" title="Retour Trousseau">rT</th><th style="padding:2px 0;font-size:8px;" title="Retour Licence">rL</th><th style="padding:2px 0;font-size:8px;" title="Retour Clé">rC</th><th style="padding:2px 0;font-size:8px;" title="Retour VIGIK">rV</th><th style="padding:2px 0;font-size:8px;">✓</th><th style="padding:4px 2px;font-size:9px;">Com.</th></tr>';
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  rows.forEach(function(r, idx) {
    const tr = document.createElement('tr');
    tr.style.cssText = idx % 2 === 0 ? 'background:var(--bg-sidebar);' : '';

    // Handle drag
    var tdDrag = document.createElement('td');
    tdDrag.style.cssText = 'padding:0 2px;cursor:grab;color:var(--text-muted);font-size:10px;text-align:center;user-select:none;';
    tdDrag.textContent = '⋮⋮';
    tdDrag.className = 'drag-handle';
    tr.appendChild(tdDrag);

    // TP (input texte comme UTA)
    var tdTp = document.createElement('td');
    tdTp.style.cssText = 'padding:2px;';
    var inpTp = document.createElement('input');
    inpTp.className = 'h-inp';
    inpTp.style.cssText = 'width:100%;font-size:9px;padding:2px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:3px;';
    inpTp.value = r.tp || '';
    inpTp.onchange = function() { r.tp = inpTp.value; saveAttr(sid, attrDate, rows); };
    tdTp.appendChild(inpTp); tr.appendChild(tdTp);

    // UTA (input court)
    var tdUta = document.createElement('td');
    tdUta.style.cssText = 'padding:2px;';
    var inpUta = document.createElement('input');
    inpUta.className = 'h-inp';
    inpUta.style.cssText = 'width:100%;font-size:9px;padding:2px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:3px;';
    inpUta.value = r.uta || '';
    inpUta.onchange = function() { r.uta = inpUta.value; saveAttr(sid, attrDate, rows); };
    tdUta.appendChild(inpUta); tr.appendChild(tdUta);

    // Plaque (non éditable)
    const tdPlaque = document.createElement('td');
    tdPlaque.style.cssText = 'padding:4px 2px;font-weight:700;color:var(--accent);white-space:nowrap;font-size:9px;text-align:center;';
    tdPlaque.textContent = r.plaque + (r.bva ? ' BVA' : '');
    tr.appendChild(tdPlaque);

    // Statut (OK / BU / X)
    var tdSt = document.createElement('td');
    tdSt.style.cssText = 'padding:2px;text-align:center;';
    var selSt = document.createElement('select');
    selSt.className = 'h-inp';
    selSt.style.cssText = 'width:32px;font-size:9px;padding:1px;font-weight:700;background:var(--bg-primary);border:1px solid var(--border);border-radius:4px;';
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

    // Si X → garder la structure, ajouter select motif + commentaire
    if ((r.statut || 'OK') === 'X') {
      tr.style.background = 'rgba(248,113,113,0.05)';
      // Motif (select déroulant) dans la colonne Chauffeur
      var tdMotifSel = document.createElement('td');
      tdMotifSel.style.cssText = 'padding:2px;';
      tdMotifSel.colSpan = 1;
      var selMotif = document.createElement('select');
      selMotif.className = 'h-inp';
      selMotif.style.cssText = 'width:100%;font-size:10px;padding:2px;font-weight:700;background:var(--bg-primary);border:1px solid var(--border);border-radius:4px;';
      var motifColors = { '': 'var(--text-muted)', 'Panne': '#f87171', 'Garage': '#4ade80', 'Pavé': '#f97316' };
      ['', 'Panne', 'Garage', 'Pavé'].forEach(function(opt) {
        var o = document.createElement('option');
        o.value = opt; o.textContent = opt || '—';
        o.style.color = motifColors[opt] || '';
        if ((r.motif || '') === opt) o.selected = true;
        selMotif.appendChild(o);
      });
      selMotif.style.color = motifColors[r.motif || ''] || '';
      selMotif.onchange = function() { r.motif = selMotif.value; selMotif.style.color = motifColors[selMotif.value] || ''; saveAttr(sid, attrDate, rows); };
      tdMotifSel.appendChild(selMotif);
      tr.appendChild(tdMotifSel);
      // PDA, Trs, Lic, Clé, VIGIK vides
      for (var xi = 0; xi < 5; xi++) { var tdE = document.createElement('td'); tdE.style.cssText = 'padding:2px;'; tr.appendChild(tdE); }
      // rP, rT, rL, rC, rV, ✓ vides
      for (var xj = 0; xj < 6; xj++) { var tdC = document.createElement('td'); tdC.style.cssText = 'padding:2px;'; tr.appendChild(tdC); }
      // Commentaire
      var tdComX = document.createElement('td');
      tdComX.style.cssText = 'padding:2px;';
      var inpComX = document.createElement('input');
      inpComX.className = 'h-inp';
      inpComX.style.cssText = 'width:100%;font-size:10px;padding:3px;color:#f87171;font-style:italic;';
      inpComX.placeholder = 'Commentaire...';
      inpComX.value = r.com || '';
      inpComX.onchange = function() { r.com = inpComX.value; saveAttr(sid, attrDate, rows); };
      tdComX.appendChild(inpComX);
      tr.appendChild(tdComX);
      tbody.appendChild(tr);
      return;
    }

    // Chauffeur (select)
    const tdChauffeur = document.createElement('td');
    tdChauffeur.style.cssText = 'padding:2px;';
    const selCh = document.createElement('select');
    selCh.className = 'h-inp';
    selCh.style.cssText = 'width:100%;font-size:10px;padding:3px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;';
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

    // Champs éditables texte : PDA, Trs, Lic
    ['pda', 'trs', 'lic'].forEach(function(field) {
      var td = document.createElement('td');
      td.style.cssText = 'padding:2px;';
      var inp = document.createElement('input');
      inp.className = 'h-inp';
      inp.style.cssText = 'width:100%;font-size:9px;padding:2px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:3px;';
      inp.value = r[field] || '';
      inp.onchange = function() { r[field] = inp.value; saveAttr(sid, attrDate, rows); };
      td.appendChild(inp);
      tr.appendChild(td);
    });

    // Clé (select C21 / Perso)
    var tdCle = document.createElement('td');
    tdCle.style.cssText = 'padding:2px;';
    var selCle = document.createElement('select');
    selCle.className = 'h-inp';
    selCle.style.cssText = 'width:100%;font-size:9px;padding:2px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:3px;';
    ['', 'C21', 'Perso'].forEach(function(opt) {
      var o = document.createElement('option');
      o.value = opt; o.textContent = opt || '—';
      if ((r.clef || '') === opt) o.selected = true;
      selCle.appendChild(o);
    });
    selCle.onchange = function() { r.clef = selCle.value; saveAttr(sid, attrDate, rows); };
    tdCle.appendChild(selCle); tr.appendChild(tdCle);

    // VIGIK (input)
    var tdVig = document.createElement('td');
    tdVig.style.cssText = 'padding:2px;';
    var inpVig = document.createElement('input');
    inpVig.className = 'h-inp';
    inpVig.style.cssText = 'width:100%;font-size:9px;padding:2px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:3px;';
    inpVig.value = r.vigik || '';
    inpVig.onchange = function() { r.vigik = inpVig.value; saveAttr(sid, attrDate, rows); };
    tdVig.appendChild(inpVig); tr.appendChild(tdVig);

    // Cases à cocher retour (rPDA, rTrs, rLic, rClé, rVIG, ✓)
    var retourCheckboxes = [];
    ['rP', 'rT', 'rL', 'rC', 'rV'].forEach(function(field) {
      var td = document.createElement('td');
      td.style.cssText = 'padding:2px;text-align:center;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!r[field];
      cb.style.cssText = 'width:14px;height:14px;accent-color:var(--accent);cursor:pointer;';
      cb.onchange = function() { r[field] = cb.checked; saveAttr(sid, attrDate, rows); };
      retourCheckboxes.push({ cb: cb, field: field });
      td.appendChild(cb);
      tr.appendChild(td);
    });
    // ✓ = tout cocher d'un coup
    (function() {
      var td = document.createElement('td');
      td.style.cssText = 'padding:2px;text-align:center;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!r.ok;
      cb.style.cssText = 'width:14px;height:14px;accent-color:#4ade80;cursor:pointer;';
      cb.onchange = function() {
        r.ok = cb.checked;
        if (cb.checked) {
          retourCheckboxes.forEach(function(item) { item.cb.checked = true; r[item.field] = true; });
        }
        saveAttr(sid, attrDate, rows);
      };
      td.appendChild(cb);
      tr.appendChild(td);
    })();

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

  // Drag & drop pour réordonner les lignes
  var dragSrcIdx = null;
  tbody.querySelectorAll('tr').forEach(function(tr, i) {
    tr.draggable = true;
    tr.addEventListener('dragstart', function(e) {
      dragSrcIdx = i;
      tr.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    tr.addEventListener('dragend', function() { tr.style.opacity = ''; });
    tr.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; tr.style.borderTop = '2px solid var(--accent)'; });
    tr.addEventListener('dragleave', function() { tr.style.borderTop = ''; });
    tr.addEventListener('drop', function(e) {
      e.preventDefault();
      tr.style.borderTop = '';
      if (dragSrcIdx === null || dragSrcIdx === i) return;
      var moved = rows.splice(dragSrcIdx, 1)[0];
      rows.splice(i, 0, moved);
      saveAttr(sid, attrDate, rows);
      if (typeof renderFlotte === 'function') renderFlotte();
    });
  });

  return wrap;
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildAttrToolbar(sid, rows) {
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex-shrink:0;';

  // Navigation date
  var prev = document.createElement('button');
  prev.className = 'h-btn h-nav'; prev.textContent = '◀';
  prev.onclick = function() { attrSearchNoData = false; attrDate.setDate(attrDate.getDate() - 1); if (typeof renderFlotte === 'function') renderFlotte(); };

  var label = document.createElement('span');
  label.style.cssText = 'font-size:13px;font-weight:700;min-width:140px;text-align:center;';
  label.textContent = attrDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  var next = document.createElement('button');
  next.className = 'h-btn h-nav'; next.textContent = '▶';
  next.onclick = function() { attrSearchNoData = false; attrDate.setDate(attrDate.getDate() + 1); if (typeof renderFlotte === 'function') renderFlotte(); };

  var todayBtn = document.createElement('button');
  todayBtn.className = 'h-btn'; todayBtn.textContent = "Aujourd'hui";
  todayBtn.onclick = function() { attrSearchNoData = false; attrDate = new Date(); if (typeof renderFlotte === 'function') renderFlotte(); };

  var dateSearch = document.createElement('input');
  dateSearch.type = 'date';
  dateSearch.value = attrDate.toISOString().slice(0, 10);
  dateSearch.style.cssText = 'width:150px;padding:6px 10px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);';
  dateSearch.onchange = function() { attrSearchNoData = false; attrDate = new Date(dateSearch.value); };
  dateSearch.addEventListener('keydown', function(e) { if (e.key === 'Enter') searchBtn.click(); });

  var searchBtn = document.createElement('button');
  searchBtn.className = 'h-btn';
  searchBtn.textContent = 'Chercher';
  searchBtn.style.cssText = 'padding:6px 12px;';
  searchBtn.onclick = async function() {
    if (!dateSearch.value || !sb()) return;
    attrSearchNoData = false;
    attrDate = new Date(dateSearch.value);
    label.textContent = '⏳ Recherche...';
    dateSearch.disabled = true;
    searchBtn.disabled = true;

    try {
      const dateStr = dateSearch.value;
      const { data: attrData } = await sb().from('attribution').select('data').eq('station_id', sid).eq('date_jour', dateStr).maybeSingle();
      if (attrData && attrData.data && Array.isArray(attrData.data) && attrData.data.length) {
        saveAttr(sid, attrDate, attrData.data);
        attrSearchNoData = false;
      } else {
        attrSearchNoData = true;
        localStorage.removeItem(attrKey(sid, attrDate));
      }
    } catch (e) {
      console.warn('Recherche attribution Supabase:', e.message);
      attrSearchNoData = true;
    } finally {
      dateSearch.disabled = false;
      searchBtn.disabled = false;
      if (typeof renderFlotte === 'function') renderFlotte();
    }
  };

  // Dupliquer veille
  var dupBtn = document.createElement('button');
  dupBtn.className = 'rep-btn rep-btn-primary';
  dupBtn.style.cssText = 'font-size:11px;padding:6px 12px;margin-left:auto;';
  dupBtn.textContent = '📋 Dupliquer veille';
  dupBtn.onclick = function() {
    attrSearchNoData = false;
    var yest = new Date(attrDate); yest.setDate(yest.getDate() - 1);
    var prevData = loadAttr(sid, yest);
    if (!prevData) { alert('Pas de données la veille.'); return; }
    saveAttr(sid, attrDate, JSON.parse(JSON.stringify(prevData)));
    if (typeof renderFlotte === 'function') renderFlotte();
  };

  bar.appendChild(prev); bar.appendChild(label); bar.appendChild(next);
  bar.appendChild(todayBtn); bar.appendChild(dateSearch); bar.appendChild(searchBtn);

  // Bulle validation matériel (avant Dupliquer)
  const validationBubble = document.createElement('div');
  validationBubble.style.cssText = 'position:relative;display:inline-block;margin-left:auto;overflow:visible;';
  const validationBtn = document.createElement('button');
  validationBtn.className = 'h-btn';
  validationBtn.style.cssText = 'font-size:11px;padding:5px 10px;position:relative;overflow:visible;';
  validationBtn.textContent = '📋 Matériel';
  validationBubble.appendChild(validationBtn);
  bar.appendChild(validationBubble);
  bar.appendChild(dupBtn);

  // Compteur vans par statut
  var countOK = 0, countBU = 0, countX = 0;
  rows.forEach(function(r) {
    var st = r.statut || 'OK';
    if (st === 'OK') countOK++;
    else if (st === 'BU') countBU++;
    else if (st === 'X') countX++;
  });
  var countEl = document.createElement('div');
  countEl.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:11px;font-weight:700;margin-left:12px;';
  countEl.innerHTML = '<span style="color:#4ade80;">OK: ' + countOK + '</span><span style="color:#60a5fa;">BU: ' + countBU + '</span><span style="color:#f87171;">X: ' + countX + '</span>';
  bar.appendChild(countEl);

  // Charger les validations du jour pour le badge
  const todayStr = new Date().toISOString().slice(0, 10);
  if (typeof sb === 'function' && sb()) {
    sb().from('materiel_validations')
      .select('chauffeur_id, chauffeur_nom, heure_validation')
      .eq('station_id', sid)
      .eq('date_jour', todayStr)
      .then(({ data: validations }) => {
        // Ne compter que les chauffeurs saisis dans Heures aujourd'hui (qui travaillent)
        const heuresKey = sid + '-heures-' + todayStr;
        let chauffeursQuiTravaillent = [];
        try {
          const raw = localStorage.getItem(heuresKey);
          if (raw) {
            const heuresData = JSON.parse(raw);
            if (heuresData.rows) {
              chauffeursQuiTravaillent = Object.values(heuresData.rows)
                .filter(r => r.nom && r.statut === 'Présent')
                .map(r => ({ nom: r.nom.trim(), id_amazon: r.key ? r.key.replace(/^row_/, '') : '' }));
            }
          }
        } catch(_) {}

        // Fallback : chercher l'id_amazon depuis le répertoire
        const repertoire = typeof loadChauffeurs === 'function' ? loadChauffeurs(sid) : [];
        const travaillent = chauffeursQuiTravaillent.map(ct => {
          const found = repertoire.find(c => ((c.prenom || '') + ' ' + (c.nom || '')).trim() === ct.nom);
          return { nom: ct.nom, id_amazon: found ? found.id_amazon : ct.id_amazon };
        }).filter(c => c.id_amazon);

        const validatedIds = (validations || []).map(v => v.chauffeur_id);
        const nonValides = travaillent.filter(c => !validatedIds.includes(c.id_amazon));
        const totalValides = travaillent.filter(c => validatedIds.includes(c.id_amazon)).length;
        const total = travaillent.length;

        // Mettre le nombre directement dans le texte du bouton
        validationBtn.textContent = '📋 Matériel ' + (nonValides.length > 0 ? '(' + nonValides.length + ')' : '✅');
        if (nonValides.length > 0) validationBtn.style.color = '#f87171';
        else validationBtn.style.color = '#4ade80';

        validationBtn.onclick = () => {
          const existing = document.getElementById('materiel-panel');
          if (existing) { existing.remove(); return; }
          const panel = document.createElement('div');
          panel.id = 'materiel-panel';
          panel.style.cssText = 'position:absolute;top:36px;left:0;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:14px;min-width:280px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
          panel.innerHTML = '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">📋 Validation matériel — ' + todayStr + '</div><div style="font-size:12px;color:#4ade80;margin-bottom:8px;">✅ ' + totalValides + '/' + total + ' validés</div>';

          if (nonValides.length) {
            const title = document.createElement('div');
            title.style.cssText = 'font-size:11px;color:#f87171;font-weight:700;margin-bottom:6px;';
            title.textContent = '⚠️ En attente (' + nonValides.length + ') :';
            panel.appendChild(title);
            nonValides.forEach(c => {
              const row = document.createElement('div');
              row.style.cssText = 'font-size:11px;color:var(--text-muted);padding:3px 0;border-bottom:1px solid var(--border);';
              row.textContent = (c.prenom || '') + ' ' + (c.nom || '');
              panel.appendChild(row);
            });
          }
          if (totalValides > 0) {
            const titleOk = document.createElement('div');
            titleOk.style.cssText = 'font-size:11px;color:#4ade80;font-weight:700;margin:8px 0 6px;';
            titleOk.textContent = '✅ Validés :';
            panel.appendChild(titleOk);
            (validations || []).forEach(v => {
              const row = document.createElement('div');
              row.style.cssText = 'font-size:11px;color:var(--text-muted);padding:3px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;';
              row.innerHTML = '<span>' + (v.chauffeur_nom || '') + '</span><span style="color:#4ade80;">' + (v.heure_validation || '') + '</span>';
              panel.appendChild(row);
            });
          }
          validationBubble.appendChild(panel);
          setTimeout(() => {
            document.addEventListener('click', function closePanel(e) {
              if (!panel.contains(e.target) && e.target !== validationBtn) {
                panel.remove();
                document.removeEventListener('click', closePanel);
              }
            });
          }, 0);
        };
      });
  }

  return bar;
}
