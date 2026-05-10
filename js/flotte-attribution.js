/* js/flotte-attribution.js — Attribution des camions (SunXP Pro) */
console.log('flotte-attribution.js chargé');

let attrDate = new Date();

/* ── Persistance ──────────────────────────────────────────── */
function attrKey(stationId, date) { return stationId + '-attribution-' + date.toISOString().slice(0, 10); }
function loadAttribution(stationId, date) { try { return JSON.parse(localStorage.getItem(attrKey(stationId, date))) || null; } catch (_) { return null; } }
function saveAttribution(stationId, date, data) {
  const key = attrKey(stationId, date);
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('attribution', key, { station_id: stationId, date_jour: date.toISOString().slice(0, 10) }, data);
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderAttribution() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:0;height:100%;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Sélectionnez une station.</p>'; return wrap; }

  const camions = loadCamions();
  const chauffeurs = [];
  try { const r = localStorage.getItem(stationId + '-repertoire'); if (r) chauffeurs.push(...JSON.parse(r)); } catch (_) {}

  let rows = loadAttribution(stationId, attrDate);

  // Si pas de données pour ce jour ET pas de données pour la veille → initialiser depuis camions
  // Si pas de données pour ce jour mais données hier → bloquer (doit dupliquer)
  if (!rows) {
    const yesterday = new Date(attrDate); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayData = loadAttribution(stationId, yesterday);
    if (yesterdayData) {
      // Bloquer : doit dupliquer depuis la veille
      wrap.appendChild(buildAttrToolbar(stationId, rows));
      const msg = document.createElement('div');
      msg.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
      msg.innerHTML = `<div style="font-size:36px;">📋</div><p style="color:var(--text-muted);font-size:13px;">Pas encore d'attribution pour ce jour.</p><p style="color:var(--text-muted);font-size:11px;">Revenez au jour précédent et cliquez "Dupliquer → J+1"</p>`;
      wrap.appendChild(msg);
      return wrap;
    }
    // Première utilisation : initialiser depuis répertoire camions
    rows = camions.map(c => ({
      plaque: c.plaque, modele: (c.marque || '') + ' ' + (c.modele || ''), agence: c.agence || 'SNXP', bva: c.bva || false,
      checkMensuel: false, uta: '', telepeages: '', statut: 'OK',
      chauffeur: '', pda: '', trousseau: '', licence: '', clefBal: '', vigik: '',
      retourUta: false, retourPda: false, retourTrousseau: false, retourLicence: false, retourClefBal: false, retourVigik: false,
      commentaire: '', fusionTitle: '', fusionColor: ''
    }));
    saveAttribution(stationId, attrDate, rows);
  }

  wrap.appendChild(buildAttrToolbar(stationId, rows));

  // Tableau
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'flex:1;overflow:auto;';

  const table = document.createElement('table');
  table.style.cssText = 'font-size:10px;border-collapse:collapse;width:100%;';

  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr style="background:var(--bg-sidebar);">
    <th style="width:18px;padding:2px;"></th>
    <th style="padding:2px 2px;text-align:center;">Modèle</th>
    <th style="padding:2px 2px;text-align:center;">Agence</th>
    <th style="padding:2px;width:20px;">CM</th>
    <th style="padding:2px;width:26px;">UTA</th>
    <th style="padding:2px;width:26px;">Tél.</th>
    <th style="padding:2px;width:24px;">St.</th>
    <th style="padding:2px 3px;text-align:center;">Plaque</th>
    <th style="padding:2px 3px;text-align:left;min-width:70px;">Chauffeur</th>
    <th style="padding:2px;width:26px;">PDA</th>
    <th style="padding:2px;width:30px;">Trs.</th>
    <th style="padding:2px;width:26px;">Lic.</th>
    <th style="padding:2px;width:34px;">Clef</th>
    <th style="padding:2px;width:48px;">VIGIK</th>
    <th style="padding:2px;width:16px;background:rgba(74,222,128,0.1);">U</th>
    <th style="padding:2px;width:16px;background:rgba(74,222,128,0.1);">P</th>
    <th style="padding:2px;width:16px;background:rgba(74,222,128,0.1);">T</th>
    <th style="padding:2px;width:16px;background:rgba(74,222,128,0.1);">L</th>
    <th style="padding:2px;width:16px;background:rgba(74,222,128,0.1);">C</th>
    <th style="padding:2px;width:22px;background:rgba(74,222,128,0.1);">V</th>
    <th style="padding:2px 3px;min-width:120px;">Commentaires</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'height:24px;border-bottom:1px solid var(--border);';

    if (row.statut === 'X') {
      // Ligne fusionnée
      const bg = row.fusionColor || 'rgba(248,113,113,0.1)';
      tr.style.background = bg;
      tr.innerHTML = `
        <td style="padding:1px;">${mvBtns(idx, rows.length)}</td>
        <td style="padding:1px 3px;font-size:9px;">${row.modele}</td>
        <td style="padding:1px 3px;font-size:9px;">${row.agence}${row.bva?' BVA':''}</td>
        <td colspan="4" style="padding:1px;text-align:center;"><select class="h-inp" data-idx="${idx}" data-f="statut" style="width:24px;font-size:9px;padding:0;"><option value="OK">OK</option><option value="BU">BU</option><option value="X" selected>✕</option></select></td>
        <td style="padding:1px 3px;font-weight:700;color:var(--accent);font-size:9px;">${row.plaque}</td>
        <td colspan="12" style="padding:1px 4px;"><input class="h-inp" value="${row.fusionTitle}" data-idx="${idx}" data-f="fusionTitle" placeholder="Raison..." style="width:100%;font-size:9px;text-align:left;font-weight:600;color:${row.fusionColor||'#f87171'};"></td>
        <td style="padding:1px;"><input type="color" value="${row.fusionColor||'#f87171'}" data-idx="${idx}" data-f="fusionColor" style="width:18px;height:16px;border:none;padding:0;cursor:pointer;"></td>
      `;
    } else {
      tr.innerHTML = `
        <td style="padding:1px;">${mvBtns(idx, rows.length)}</td>
        <td style="padding:1px 2px;font-size:9px;white-space:nowrap;overflow:hidden;max-width:60px;text-align:center;">${row.modele}</td>
        <td style="padding:1px 2px;font-size:9px;text-align:center;">${row.agence}${row.bva?' BVA':''}</td>
        <td style="padding:1px;text-align:center;"><input type="checkbox" ${row.checkMensuel?'checked':''} data-idx="${idx}" data-f="checkMensuel" style="width:12px;height:12px;"></td>
        <td><input class="h-inp" value="${row.uta}" data-idx="${idx}" data-f="uta" style="width:26px;font-size:9px;padding:1px;"></td>
        <td><input class="h-inp" value="${row.telepeages}" data-idx="${idx}" data-f="telepeages" style="width:26px;font-size:9px;padding:1px;"></td>
        <td style="padding:1px;"><select class="h-inp" data-idx="${idx}" data-f="statut" style="width:28px;font-size:9px;padding:0;"><option value="OK" ${row.statut==='OK'?'selected':''}>OK</option><option value="BU" ${row.statut==='BU'?'selected':''}>BU</option><option value="X" ${row.statut==='X'?'selected':''}>✕</option></select></td>
        <td style="padding:1px 3px;font-weight:700;color:var(--accent);font-size:9px;">${row.plaque}</td>
        <td style="padding:1px;position:relative;"><input class="h-inp attr-chauffeur-inp" value="${row.chauffeur}" data-idx="${idx}" data-f="chauffeur" style="width:68px;font-size:9px;padding:1px 3px;text-align:left;" placeholder="—"></td>
        <td><input class="h-inp" value="${row.pda}" data-idx="${idx}" data-f="pda" style="width:26px;font-size:9px;padding:1px;"></td>
        <td><input class="h-inp" value="${row.trousseau}" data-idx="${idx}" data-f="trousseau" style="width:30px;font-size:9px;padding:1px;"></td>
        <td><input class="h-inp" value="${row.licence}" data-idx="${idx}" data-f="licence" style="width:26px;font-size:9px;padding:1px;"></td>
        <td style="padding:1px;"><select class="h-inp" data-idx="${idx}" data-f="clefBal" style="width:34px;font-size:8px;padding:0;"><option value="">—</option><option value="PERSO" ${row.clefBal==='PERSO'?'selected':''}>P</option><option value="C21" ${row.clefBal==='C21'?'selected':''}>C21</option></select></td>
        <td><input class="h-inp" value="${row.vigik}" data-idx="${idx}" data-f="vigik" style="width:48px;font-size:8px;padding:1px;"></td>
        <td style="text-align:center;background:rgba(74,222,128,0.03);"><input type="checkbox" ${row.retourUta?'checked':''} data-idx="${idx}" data-f="retourUta" style="width:12px;height:12px;"></td>
        <td style="text-align:center;background:rgba(74,222,128,0.03);"><input type="checkbox" ${row.retourPda?'checked':''} data-idx="${idx}" data-f="retourPda" style="width:12px;height:12px;"></td>
        <td style="text-align:center;background:rgba(74,222,128,0.03);"><input type="checkbox" ${row.retourTrousseau?'checked':''} data-idx="${idx}" data-f="retourTrousseau" style="width:12px;height:12px;"></td>
        <td style="text-align:center;background:rgba(74,222,128,0.03);"><input type="checkbox" ${row.retourLicence?'checked':''} data-idx="${idx}" data-f="retourLicence" style="width:12px;height:12px;"></td>
        <td style="text-align:center;background:rgba(74,222,128,0.03);"><input type="checkbox" ${row.retourClefBal?'checked':''} data-idx="${idx}" data-f="retourClefBal" style="width:12px;height:12px;"></td>
        <td style="text-align:center;background:rgba(74,222,128,0.03);"><input type="checkbox" ${row.retourVigik?'checked':''} data-idx="${idx}" data-f="retourVigik" style="width:12px;height:12px;"><button class="h-btn" style="font-size:7px;padding:0 2px;margin-left:1px;" title="Tout OK" data-idx="${idx}" data-action="allok">✓</button></td>
        <td><input class="h-inp" value="${row.commentaire}" data-idx="${idx}" data-f="commentaire" style="width:120px;font-size:9px;padding:1px;"></td>
      `;
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // Compteurs
  const tfoot = document.createElement('tfoot');
  const nbOk = rows.filter(r => r.statut === 'OK').length;
  const nbBu = rows.filter(r => r.statut === 'BU').length;
  const nbAttr = rows.filter(r => r.chauffeur && r.statut === 'OK').length;
  tfoot.innerHTML = `<tr style="border-top:2px solid var(--accent);"><td colspan="21" style="padding:6px;font-size:10px;font-weight:700;">OK: ${nbOk} | BU: ${nbBu} | Attribués: ${nbAttr} | Total: ${rows.length}</td></tr>`;
  table.appendChild(tfoot);

  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);

  // Bind events
  setTimeout(() => bindAttrEvents(tableWrap, rows, stationId, chauffeurs), 0);
  return wrap;
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildAttrToolbar(stationId, rows) {
  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;flex-wrap:wrap;';
  const dl = attrDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  toolbar.innerHTML = `
    <button class="h-btn h-nav" id="attr-prev">◀</button>
    <span style="font-size:12px;font-weight:600;min-width:180px;text-align:center;">${dl}</span>
    <button class="h-btn h-nav" id="attr-next">▶</button>
    <button class="h-btn" id="attr-today" style="font-size:10px;">Aujourd'hui</button>
    <button class="h-btn" id="attr-dup" style="background:rgba(96,165,250,0.15);border-color:#60a5fa;color:#60a5fa;font-size:10px;font-weight:700;">📋 Dupliquer → J+1</button>
    <button class="h-btn" id="attr-del" style="font-size:10px;color:#f87171;border-color:#f87171;">🗑 Supprimer</button>
  `;
  toolbar.querySelector('#attr-prev').onclick = () => { attrDate.setDate(attrDate.getDate() - 1); renderFlotte(); };
  toolbar.querySelector('#attr-next').onclick = () => {
    const nextDate = new Date(attrDate); nextDate.setDate(nextDate.getDate() + 1);
    if (loadAttribution(stationId, nextDate)) { attrDate = nextDate; renderFlotte(); }
  };
  toolbar.querySelector('#attr-today').onclick = () => { attrDate = new Date(); renderFlotte(); };
  toolbar.querySelector('#attr-dup').onclick = () => {
    if (!rows) return;
    const nextDate = new Date(attrDate); nextDate.setDate(nextDate.getDate() + 1);
    saveAttribution(stationId, nextDate, JSON.parse(JSON.stringify(rows)));
    attrDate = nextDate;
    renderFlotte();
  };
  toolbar.querySelector('#attr-del').onclick = () => {
    showConfirmModal('Supprimer l\'attribution du ' + dl + ' ?', () => {
      localStorage.removeItem(attrKey(stationId, attrDate));
      renderFlotte();
    });
  };
  return toolbar;
}

/* ── Bind events ──────────────────────────────────────────── */
function bindAttrEvents(container, rows, stationId, chauffeurs) {
  container.querySelectorAll('input.h-inp:not(.attr-chauffeur-inp), select.h-inp').forEach(el => {
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.idx), f = el.dataset.f;
      rows[i][f] = el.value;
      saveAttribution(stationId, attrDate, rows);
      if (f === 'statut') renderFlotte(); // re-render pour fusion
    });
  });
  container.querySelectorAll('input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.idx), f = el.dataset.f;
      rows[i][f] = el.checked;
      saveAttribution(stationId, attrDate, rows);
    });
  });
  container.querySelectorAll('input[type="color"]').forEach(el => {
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.idx);
      rows[i].fusionColor = el.value;
      saveAttribution(stationId, attrDate, rows);
      renderFlotte();
    });
  });
  container.querySelectorAll('[data-action="allok"]').forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.idx);
      rows[i].retourUta = true; rows[i].retourPda = true; rows[i].retourTrousseau = true;
      rows[i].retourLicence = true; rows[i].retourClefBal = true; rows[i].retourVigik = true;
      saveAttribution(stationId, attrDate, rows);
      renderFlotte();
    };
  });
  container.querySelectorAll('[data-move]').forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.idx), dir = btn.dataset.move;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= rows.length) return;
      [rows[i], rows[j]] = [rows[j], rows[i]];
      saveAttribution(stationId, attrDate, rows);
      renderFlotte();
    };
  });
  // Chauffeur autocomplete (like heures.js)
  container.querySelectorAll('.attr-chauffeur-inp').forEach(inp => {
    const drop = document.createElement('div');
    drop.style.cssText = 'position:fixed;z-index:9999;background:var(--bg-sidebar);border:1px solid var(--accent);border-radius:5px;max-height:150px;overflow-y:auto;display:none;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
    document.body.appendChild(drop);
    function showDrop(q) {
      const names = chauffeurs.map(c => (c.prenom + ' ' + c.nom).trim()).filter(n => n.toLowerCase().includes(q.toLowerCase()));
      drop.innerHTML = '';
      if (!names.length || !q) { drop.style.display = 'none'; return; }
      names.slice(0, 8).forEach(n => {
        const item = document.createElement('div');
        item.textContent = n;
        item.style.cssText = 'padding:4px 8px;cursor:pointer;font-size:10px;color:var(--text-primary);';
        item.onmouseenter = () => item.style.background = 'var(--bg-tab-hover)';
        item.onmouseleave = () => item.style.background = '';
        item.onmousedown = e => { e.preventDefault(); inp.value = n; rows[parseInt(inp.dataset.idx)].chauffeur = n; saveAttribution(stationId, attrDate, rows); drop.style.display = 'none'; };
        drop.appendChild(item);
      });
      const rect = inp.getBoundingClientRect();
      drop.style.top = (rect.bottom + 2) + 'px'; drop.style.left = rect.left + 'px'; drop.style.minWidth = rect.width + 'px';
      drop.style.display = 'block';
    }
    inp.addEventListener('input', () => showDrop(inp.value));
    inp.addEventListener('focus', () => { if (inp.value) showDrop(inp.value); });
    inp.addEventListener('blur', () => setTimeout(() => { drop.style.display = 'none'; }, 150));
    inp.addEventListener('change', () => { rows[parseInt(inp.dataset.idx)].chauffeur = inp.value; saveAttribution(stationId, attrDate, rows); });
    const obs = new MutationObserver(() => { if (!document.body.contains(inp)) { drop.remove(); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

/* ── Move buttons ─────────────────────────────────────────── */
function mvBtns(idx, total) {
  return `<div style="display:flex;flex-direction:column;"><button data-idx="${idx}" data-move="up" style="font-size:7px;line-height:1;background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0;${idx===0?'opacity:0.2;':''}">▲</button><button data-idx="${idx}" data-move="down" style="font-size:7px;line-height:1;background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0;${idx===total-1?'opacity:0.2;':''}">▼</button></div>`;
}
