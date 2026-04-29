/* js/flotte-degats.js — Suivi des dégâts véhicules (SunXP Pro) */
console.log('flotte-degats.js chargé');

function getDegatsKey() { return (window.getActiveStationId ? window.getActiveStationId() : 'default') + '-degats'; }
function loadDegats() { try { return JSON.parse(localStorage.getItem(getDegatsKey())) || []; } catch(_) { return []; } }
function saveDegats(list) {
  try { localStorage.setItem(getDegatsKey(), JSON.stringify(list)); } catch(_) {}
  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (stationId && typeof sb === 'function' && sb()) {
    sb().from('degats').delete().eq('station_id', stationId).then(({ error: delErr }) => {
      if (delErr) console.warn('degats delete error:', delErr.message);
      if (list.length) {
        const rows = list.map(d => ({ station_id: stationId, degat_id: d.id, plaque: d.plaque, chauffeur: d.chauffeur, date_incident: d.date, description: d.description || '', photos: d.photos || [] }));
        sb().from('degats').insert(rows).then(({ error: insErr }) => {
          if (insErr) console.warn('degats insert error:', insErr.message);
          else console.log('✅ Dégâts synced:', rows.length);
        });
      }
    });
  }
}

/* ── Upload photo vers Supabase Storage ───────────────────── */
async function uploadDegatsPhoto(stationId, degatId, file) {
  if (!sb()) return null;
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${stationId}/${degatId}_${Date.now()}.${ext}`;
  try {
    const { data, error } = await sb().storage.from('degats').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) { console.warn('Upload photo error:', error.message); return null; }
    const { data: urlData } = sb().storage.from('degats').getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch (e) { console.warn('Upload photo exception:', e.message); return null; }
}

async function deleteDegatsPhoto(url) {
  if (!sb() || !url) return;
  try {
    // Extraire le path depuis l'URL publique
    const match = url.match(/\/storage\/v1\/object\/public\/degats\/(.+)$/);
    if (!match) return;
    const path = decodeURIComponent(match[1]);
    await sb().storage.from('degats').remove([path]);
  } catch (e) { console.warn('Delete photo error:', e.message); }
}

async function deleteDegatsPhotos(photos) {
  if (!photos || !photos.length) return;
  for (const url of photos) {
    if (url && url.startsWith('http')) await deleteDegatsPhoto(url);
  }
}

function renderDegats() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  const camions = typeof loadCamions === 'function' ? loadCamions() : [];
  let chauffeurs = [];
  try { const raw = localStorage.getItem(stationId + '-repertoire'); if (raw) chauffeurs = JSON.parse(raw); } catch(_) {}

  // Recherche + bouton ajouter
  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
  const search = document.createElement('input');
  search.type = 'text'; search.placeholder = '🔍 Rechercher un chauffeur...';
  search.className = 'rep-search'; search.style.cssText = 'width:250px;';
  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary'; addBtn.textContent = '+ Signaler un dégât';
  addBtn.onclick = () => showDegatsForm(camions, chauffeurs, stationId);
  topBar.appendChild(search); topBar.appendChild(addBtn);
  wrap.appendChild(topBar);

  const tableWrap = document.createElement('div');
  wrap.appendChild(tableWrap);

  function renderTable(query) {
    tableWrap.innerHTML = '';
    const degats = loadDegats();
    const now = new Date();
    const curMonth = now.getMonth(), curYear = now.getFullYear();
    const q = (query||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

    // Grouper par chauffeur
    const byChauffeur = {};
    chauffeurs.forEach(c => {
      const nom = (c.prenom + ' ' + c.nom).trim();
      byChauffeur[nom] = { chauffeur: c, incidents: [] };
    });
    degats.forEach(d => {
      if (!byChauffeur[d.chauffeur]) byChauffeur[d.chauffeur] = { chauffeur: null, incidents: [] };
      byChauffeur[d.chauffeur].incidents.push(d);
    });

    const table = document.createElement('table');
    table.className = 'h-table';
    table.style.cssText = 'font-size:12px;';
    table.innerHTML = '<thead><tr><th style="text-align:left;padding:6px 8px;">Chauffeur</th><th>Ce mois</th><th>Total</th><th>Dernier incident</th><th></th></tr></thead>';
    const tbody = document.createElement('tbody');

    Object.entries(byChauffeur)
      .filter(([nom]) => nom.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q))
      .sort((a, b) => b[1].incidents.length - a[1].incidents.length)
      .forEach(([nom, data]) => {
        const incidents = data.incidents;
        const moisCount = incidents.filter(d => { const dt = new Date(d.date); return dt.getMonth() === curMonth && dt.getFullYear() === curYear; }).length;
        const total = incidents.length;
        const last = incidents.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        const tr = document.createElement('tr');
        tr.style.cssText = total > 0 ? '' : 'opacity:0.4;';
        tr.innerHTML = `
          <td style="padding:4px 8px;font-weight:600;">${nom}</td>
          <td style="text-align:center;color:${moisCount>0?'#f87171':'var(--text-muted)'};">${moisCount}</td>
          <td style="text-align:center;font-weight:700;color:${total>0?'#f97316':'var(--text-muted)'};">${total}</td>
          <td style="text-align:center;font-size:10px;color:var(--text-muted);">${last ? new Date(last.date).toLocaleDateString('fr-FR') + ' — ' + last.plaque : '—'}</td>
          <td style="text-align:center;"></td>
        `;

        if (total > 0) {
          const detailBtn = document.createElement('button');
          detailBtn.className = 'h-btn'; detailBtn.style.cssText = 'font-size:10px;padding:2px 6px;';
          detailBtn.textContent = '📋 Détails';
          detailBtn.onclick = () => showChauffeurDegats(nom, incidents);
          tr.lastElementChild.appendChild(detailBtn);
        }

        tbody.appendChild(tr);
      });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  search.oninput = () => renderTable(search.value);
  renderTable('');
  return wrap;
}

function showChauffeurDegats(nom, incidents) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:20px;width:90%;max-width:500px;max-height:80vh;overflow-y:auto;';
  box.innerHTML = `<h3 style="font-size:14px;color:var(--accent);margin:0 0 12px;">🔧 Dégâts — ${nom}</h3>`;

  incidents.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(d => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-primary);border:1px solid var(--border);border-left:3px solid #f87171;border-radius:6px;padding:10px;margin-bottom:8px;font-size:12px;';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:600;color:var(--accent);">${d.plaque}</span>
        <span style="font-size:10px;color:var(--text-muted);">${new Date(d.date).toLocaleDateString('fr-FR')}</span>
      </div>
      <div style="color:var(--text-muted);margin-bottom:4px;">${d.description || 'Pas de description'}</div>
    `;
    if (d.photos && d.photos.length) {
      const ph = document.createElement('div');
      ph.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
      d.photos.forEach(p => {
        const img = document.createElement('img');
        img.src = p; img.style.cssText = 'width:60px;height:60px;object-fit:cover;border-radius:4px;cursor:pointer;';
        img.onclick = () => { const w = window.open(''); w.document.write(`<img src="${p}" style="max-width:100%;">`); };
        ph.appendChild(img);
      });
      card.appendChild(ph);
    }
    const delBtn = document.createElement('button');
    delBtn.className = 'rep-btn rep-btn-delete'; delBtn.style.cssText = 'font-size:9px;margin-top:6px;';
    delBtn.textContent = '🗑';
    delBtn.onclick = () => { showConfirmModal('Supprimer ce dégât ?', async () => {
      await deleteDegatsPhotos(d.photos);
      saveDegats(loadDegats().filter(x => x.id !== d.id));
      overlay.remove();
      if (typeof renderFlotte === 'function') renderFlotte();
    }); };
    card.appendChild(delBtn);
    box.appendChild(card);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'h-btn'; closeBtn.style.cssText = 'width:100%;margin-top:8px;';
  closeBtn.textContent = 'Fermer';
  closeBtn.onclick = () => overlay.remove();
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function showDegatsForm(camions, chauffeurs, stationId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:24px;width:90%;max-width:400px;display:flex;flex-direction:column;gap:10px;';
  box.innerHTML = `<h3 style="font-size:14px;color:var(--accent);margin:0;">🔧 Signaler un dégât</h3>`;

  const selCamion = document.createElement('select');
  selCamion.style.cssText = 'background:var(--bg-tab-active);border:1px solid var(--border);color:var(--text-primary);border-radius:5px;padding:8px;font-size:12px;font-family:var(--font-family);';
  selCamion.innerHTML = '<option value="">-- Camion --</option>' + camions.map(c => `<option value="${c.plaque}">${c.plaque}</option>`).join('');
  box.appendChild(selCamion);

  const selChauffeur = document.createElement('select');
  selChauffeur.style.cssText = selCamion.style.cssText;
  selChauffeur.innerHTML = '<option value="">-- Chauffeur --</option>' + chauffeurs.map(c => `<option value="${c.prenom} ${c.nom}">${c.prenom} ${c.nom}</option>`).join('');
  box.appendChild(selChauffeur);

  const dateInp = document.createElement('input');
  dateInp.type = 'date'; dateInp.className = 'h-inp'; dateInp.style.cssText = 'text-align:left;padding:8px;';
  dateInp.value = new Date().toISOString().slice(0, 10);
  box.appendChild(dateInp);

  const desc = document.createElement('textarea');
  desc.placeholder = 'Description du dégât...';
  desc.style.cssText = 'background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-size:12px;padding:8px;min-height:60px;resize:vertical;font-family:var(--font-family);';
  box.appendChild(desc);

  const photoLabel = document.createElement('label');
  photoLabel.style.cssText = 'font-size:11px;color:var(--text-muted);';
  photoLabel.textContent = '📷 Photos (optionnel)';
  const photoInp = document.createElement('input');
  photoInp.type = 'file'; photoInp.accept = 'image/*'; photoInp.multiple = true;
  box.appendChild(photoLabel); box.appendChild(photoInp);

  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'rep-btn rep-btn-primary'; saveBtn.style.cssText = 'flex:1;';
  saveBtn.textContent = 'Enregistrer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'h-btn'; cancelBtn.style.cssText = 'flex:1;';
  cancelBtn.textContent = 'Annuler';
  cancelBtn.onclick = () => overlay.remove();
  saveBtn.onclick = async () => {
    if (!selCamion.value || !selChauffeur.value) { alert('Choisissez un camion et un chauffeur.'); return; }
    saveBtn.disabled = true; saveBtn.textContent = '⏳ Upload...';
    const degatId = 'dg_' + Date.now();
    const files = photoInp.files;
    const photos = [];
    for (const f of files) {
      const url = await uploadDegatsPhoto(stationId, degatId, f);
      if (url) photos.push(url);
    }
    const degats = loadDegats();
    degats.push({ id: degatId, plaque: selCamion.value, chauffeur: selChauffeur.value, date: dateInp.value, description: desc.value, photos });
    saveDegats(degats);
    overlay.remove();
    if (typeof renderFlotte === 'function') renderFlotte();
  };
  btns.appendChild(saveBtn); btns.appendChild(cancelBtn);
  box.appendChild(btns);
  overlay.appendChild(box);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
