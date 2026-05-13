/* js/flotte-attribution.js — Attribution camions (SunXP Pro) — v2 Cards */
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
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;height:100%;overflow-y:auto;';
  const sid = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!sid) { wrap.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Sélectionnez une station.</p>'; return wrap; }

  const camions = typeof loadCamions === 'function' ? loadCamions() : [];
  let chauffeurs = [];
  try { chauffeurs = JSON.parse(localStorage.getItem(sid + '-repertoire')) || []; } catch (_) {}

  let rows = loadAttr(sid, attrDate);
  if (!rows) {
    rows = camions.map(c => ({ plaque: c.plaque, modele: (c.marque || '') + ' ' + (c.modele || ''), bva: c.bva || false, chauffeur: '', pda: '', trs: '', lic: '', clef: '', vigik: '', com: '' }));
  }

  // Toolbar
  wrap.appendChild(buildAttrToolbar(sid, rows, camions, chauffeurs));

  // Recherche
  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = '🔍 Rechercher plaque ou chauffeur...';
  search.className = 'rep-search';
  search.style.cssText = 'width:100%;max-width:300px;';
  wrap.appendChild(search);

  // Grille de cards
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:12px;';
  wrap.appendChild(grid);

  function renderCards(query) {
    grid.innerHTML = '';
    const q = (query || '').toLowerCase();
    rows.filter(r => (r.plaque + ' ' + r.chauffeur).toLowerCase().includes(q)).forEach((r, idx) => {
      grid.appendChild(buildAttrCard(r, idx, rows, sid, chauffeurs));
    });
  }

  search.oninput = () => renderCards(search.value);
  renderCards('');
  return wrap;
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildAttrToolbar(sid, rows, camions, chauffeurs) {
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

  // Navigation date
  const prev = document.createElement('button');
  prev.className = 'h-btn h-nav'; prev.textContent = '◀';
  prev.onclick = () => { attrDate.setDate(attrDate.getDate() - 1); if (typeof renderFlotte === 'function') renderFlotte(); };

  const label = document.createElement('span');
  label.style.cssText = 'font-size:14px;font-weight:700;min-width:140px;text-align:center;';
  label.textContent = attrDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  const next = document.createElement('button');
  next.className = 'h-btn h-nav'; next.textContent = '▶';
  next.onclick = () => { attrDate.setDate(attrDate.getDate() + 1); if (typeof renderFlotte === 'function') renderFlotte(); };

  const todayBtn = document.createElement('button');
  todayBtn.className = 'h-btn'; todayBtn.textContent = "Aujourd'hui";
  todayBtn.onclick = () => { attrDate = new Date(); if (typeof renderFlotte === 'function') renderFlotte(); };

  // Dupliquer veille
  const dupBtn = document.createElement('button');
  dupBtn.className = 'rep-btn rep-btn-primary';
  dupBtn.style.cssText = 'font-size:11px;padding:6px 12px;';
  dupBtn.textContent = '📋 Dupliquer veille';
  dupBtn.onclick = () => {
    const yest = new Date(attrDate); yest.setDate(yest.getDate() - 1);
    const prev = loadAttr(sid, yest);
    if (!prev) { alert('Pas de données la veille.'); return; }
    saveAttr(sid, attrDate, JSON.parse(JSON.stringify(prev)));
    if (typeof renderFlotte === 'function') renderFlotte();
  };

  bar.appendChild(prev); bar.appendChild(label); bar.appendChild(next);
  bar.appendChild(todayBtn); bar.appendChild(dupBtn);
  return bar;
}

/* ── Card camion ──────────────────────────────────────────── */
function buildAttrCard(r, idx, rows, sid, chauffeurs) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;transition:border-color 0.18s,box-shadow 0.18s;cursor:pointer;';
  card.onmouseenter = () => { card.style.borderColor = 'var(--accent)'; card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; };
  card.onmouseleave = () => { card.style.borderColor = 'var(--border)'; card.style.boxShadow = ''; };

  // Header : plaque + modèle + BVA
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:8px;';
  header.innerHTML = '<span style="font-size:16px;font-weight:800;color:var(--accent);letter-spacing:0.03em;">' + esc(r.plaque) + '</span>' +
    '<span style="font-size:10px;color:var(--text-muted);">' + esc(r.modele || '') + '</span>' +
    (r.bva ? '<span style="background:#fbbf24;color:#000;padding:1px 4px;border-radius:3px;font-size:8px;font-weight:700;">BVA</span>' : '');
  card.appendChild(header);

  // Chauffeur
  const chauffeurDiv = document.createElement('div');
  chauffeurDiv.style.cssText = 'font-size:13px;font-weight:600;color:' + (r.chauffeur ? 'var(--text-primary)' : 'var(--text-muted)') + ';';
  chauffeurDiv.textContent = r.chauffeur || '— Non attribué —';
  card.appendChild(chauffeurDiv);

  // Équipements en badges compacts
  const equip = document.createElement('div');
  equip.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
  const items = [
    { key: 'pda', label: 'PDA', icon: '📱' },
    { key: 'clef', label: 'Clef', icon: '🔑' },
    { key: 'vigik', label: 'VIGIK', icon: '🏷' },
    { key: 'trs', label: 'Trs', icon: '📋' },
    { key: 'lic', label: 'Lic', icon: '📄' }
  ];
  items.forEach(item => {
    if (r[item.key]) {
      const badge = document.createElement('span');
      badge.style.cssText = 'background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;padding:2px 6px;font-size:9px;color:var(--text-muted);';
      badge.textContent = item.icon + ' ' + r[item.key];
      equip.appendChild(badge);
    }
  });
  if (!equip.children.length) {
    equip.innerHTML = '<span style="font-size:10px;color:var(--text-muted);font-style:italic;">Aucun équipement</span>';
  }
  card.appendChild(equip);

  // Commentaire
  if (r.com) {
    const comDiv = document.createElement('div');
    comDiv.style.cssText = 'font-size:10px;color:var(--text-muted);font-style:italic;border-top:1px solid var(--border);padding-top:4px;';
    comDiv.textContent = '💬 ' + r.com;
    card.appendChild(comDiv);
  }

  // Clic → modal édition
  card.onclick = () => showAttrEditModal(r, idx, rows, sid, chauffeurs);
  return card;
}

/* ── Modal édition attribution ────────────────────────────── */
function showAttrEditModal(r, idx, rows, sid, chauffeurs) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-sidebar);border-radius:14px;padding:24px;width:90%;max-width:380px;display:flex;flex-direction:column;gap:12px;max-height:80vh;overflow-y:auto;';

  modal.innerHTML = '<h3 style="margin:0;font-size:16px;color:var(--accent);">🚛 ' + esc(r.plaque) + '</h3>';

  const fields = [
    { key: 'chauffeur', label: '👤 Chauffeur', type: 'select', options: ['', ...chauffeurs.map(c => (c.prenom + ' ' + c.nom).trim())] },
    { key: 'pda', label: '📱 PDA', type: 'text' },
    { key: 'clef', label: '🔑 Clef', type: 'text' },
    { key: 'vigik', label: '🏷 VIGIK', type: 'text' },
    { key: 'trs', label: '📋 Trousseau', type: 'text' },
    { key: 'lic', label: '📄 Licence', type: 'text' },
    { key: 'com', label: '💬 Commentaire', type: 'text' }
  ];

  fields.forEach(f => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
    div.innerHTML = '<label style="font-size:10px;color:var(--text-muted);">' + f.label + '</label>';
    let inp;
    if (f.type === 'select') {
      inp = document.createElement('select');
      inp.className = 'rep-input';
      inp.style.cssText = 'padding:8px;font-size:12px;';
      f.options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o; opt.textContent = o || '— Aucun —';
        if (o === r[f.key]) opt.selected = true;
        inp.appendChild(opt);
      });
    } else {
      inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'rep-input';
      inp.style.cssText = 'padding:8px;font-size:12px;';
      inp.value = r[f.key] || '';
    }
    inp.dataset.field = f.key;
    div.appendChild(inp);
    modal.appendChild(div);
  });

  // Boutons
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'rep-btn rep-btn-primary'; saveBtn.style.cssText = 'flex:1;';
  saveBtn.textContent = 'Enregistrer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'h-btn'; cancelBtn.style.cssText = 'flex:1;';
  cancelBtn.textContent = 'Annuler';
  cancelBtn.onclick = () => overlay.remove();

  saveBtn.onclick = () => {
    modal.querySelectorAll('[data-field]').forEach(inp => {
      r[inp.dataset.field] = inp.value;
    });
    rows[idx] = r;
    saveAttr(sid, attrDate, rows);
    overlay.remove();
    if (typeof renderFlotte === 'function') renderFlotte();
  };

  btns.appendChild(saveBtn); btns.appendChild(cancelBtn);
  modal.appendChild(btns);
  overlay.appendChild(modal);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
