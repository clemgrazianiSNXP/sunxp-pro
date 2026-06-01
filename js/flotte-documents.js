/* js/flotte-documents.js — Documents Camions (SunXP Pro) */

const DOCS_CAMIONS_BUCKET = 'documents';

function docsCamionsKey(stationId) { return stationId + '-docs-camions'; }

function loadDocsCamions(stationId) {
  try { return JSON.parse(localStorage.getItem(docsCamionsKey(stationId))) || []; } catch (_) { return []; }
}

function saveDocsCamions(stationId, list) {
  try { localStorage.setItem(docsCamionsKey(stationId), JSON.stringify(list)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('docs_camions', docsCamionsKey(stationId), { station_id: stationId }, list);
}

async function uploadDocCamionFile(file, stationId, docId) {
  if (!sb()) return null;
  const path = `${stationId}/camions/${docId}_${file.name}`;
  try {
    const { error } = await sb().storage.from(DOCS_CAMIONS_BUCKET).upload(path, file, { upsert: true });
    if (error) { console.warn('Upload doc camion error:', error.message); return null; }
    const { data: urlData } = sb().storage.from(DOCS_CAMIONS_BUCKET).getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch (e) { return null; }
}

const DOC_CAMION_TYPES = ['CT', 'Assurance', 'Carte grise', 'Contrôle pollution', 'Autre'];

function renderDocsCamions() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  const camions = typeof loadCamions === 'function' ? loadCamions() : [];
  const docs = loadDocsCamions(stationId);

  // Barre de recherche + bouton ajouter
  const searchBar = document.createElement('div');
  searchBar.style.cssText = 'display:flex;gap:8px;align-items:center;';
  const searchInp = document.createElement('input');
  searchInp.type = 'text';
  searchInp.placeholder = '🔍 Rechercher un camion (plaque)...';
  searchInp.className = 'rep-search';
  searchInp.style.cssText = 'flex:1;max-width:280px;';
  searchBar.appendChild(searchInp);

  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary';
  addBtn.style.cssText = 'font-size:12px;padding:8px 14px;white-space:nowrap;';
  addBtn.textContent = '+ Ajouter un document';
  addBtn.onclick = () => showDocCamionForm(null, stationId, camions);
  searchBar.appendChild(addBtn);
  wrap.appendChild(searchBar);

  const listContainer = document.createElement('div');
  listContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

  function renderList(query) {
    listContainer.innerHTML = '';
    const q = (query || '').toLowerCase().trim();

    if (!docs.length) {
      listContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:20px;">Aucun document enregistré.</p>';
      return;
    }

    // Grouper par plaque
    const byPlaque = {};
    docs.forEach(d => { if (!byPlaque[d.plaque]) byPlaque[d.plaque] = []; byPlaque[d.plaque].push(d); });

    const filteredPlaques = Object.keys(byPlaque).filter(p => !q || p.toLowerCase().includes(q));
    if (!filteredPlaques.length) { listContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Aucun résultat.</p>'; return; }

    filteredPlaques.forEach(plaque => {
      const section = document.createElement('div');
      section.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:12px;';

      const header = document.createElement('div');
      header.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent);margin-bottom:8px;';
      header.textContent = '🚛 ' + plaque;
      section.appendChild(header);

      byPlaque[plaque].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)).forEach(d => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;';

        // Couleur selon type
        let typeColor = '#60a5fa';
        if (d.type === 'CT') typeColor = '#4ade80';
        else if (d.type === 'Assurance') typeColor = '#fbbf24';

        // Alerte CT expiration
        let alertHtml = '';
        if (d.type === 'CT' && d.dateExpiration) {
          const daysLeft = Math.ceil((new Date(d.dateExpiration) - new Date()) / 86400000);
          if (d.rdvPris) alertHtml = ' <span style="color:#38bdf8;font-weight:700;font-size:10px;">📅 RDV pris</span>';
          else if (daysLeft <= 0) alertHtml = ' <span style="color:#f87171;font-weight:700;font-size:10px;">⚠️ EXPIRÉ</span>';
          else if (daysLeft <= 30) alertHtml = ' <span style="color:#f87171;font-weight:700;font-size:10px;">⚠️ ' + daysLeft + 'j</span>';
          else if (daysLeft <= 60) alertHtml = ' <span style="color:#fbbf24;font-weight:700;font-size:10px;">⏳ ' + daysLeft + 'j</span>';
        }

        const dateStr = d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '';
        const expStr = d.dateExpiration ? ' → Exp: ' + new Date(d.dateExpiration).toLocaleDateString('fr-FR') : '';

        row.innerHTML = `
          <span style="background:${typeColor};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">${d.type}</span>
          <span style="flex:1;color:var(--text-primary);">${d.nom || d.type}</span>
          <span style="color:var(--text-muted);font-size:11px;">${dateStr}${expStr}${alertHtml}</span>
        `;

        if (d.fileUrl) {
          const link = document.createElement('a');
          link.href = d.fileUrl; link.target = '_blank';
          link.style.cssText = 'font-size:11px;color:var(--accent);';
          link.textContent = '📎';
          row.appendChild(link);
        }

        // Bouton RDV pris pour CT en alerte
        if (d.type === 'CT' && d.dateExpiration) {
          const daysLeftBtn = Math.ceil((new Date(d.dateExpiration) - new Date()) / 86400000);
          if (daysLeftBtn <= 30) {
            const rdvBtn = document.createElement('button');
            rdvBtn.className = 'h-btn';
            if (d.rdvPris) {
              rdvBtn.style.cssText = 'font-size:9px;padding:2px 6px;color:#38bdf8;border-color:#38bdf8;';
              rdvBtn.textContent = '↩ Annuler';
              rdvBtn.onclick = () => { const all = loadDocsCamions(stationId); const item = all.find(x => x.id === d.id); if (item) { delete item.rdvPris; saveDocsCamions(stationId, all); } if (typeof renderFlotte === 'function') renderFlotte(); if (typeof updateNavBadges === 'function') updateNavBadges(); };
            } else {
              rdvBtn.style.cssText = 'font-size:9px;padding:2px 6px;background:#38bdf8;color:#000;border:none;font-weight:700;';
              rdvBtn.textContent = '📅 RDV pris';
              rdvBtn.onclick = () => { const all = loadDocsCamions(stationId); const item = all.find(x => x.id === d.id); if (item) { item.rdvPris = true; saveDocsCamions(stationId, all); } if (typeof renderFlotte === 'function') renderFlotte(); if (typeof updateNavBadges === 'function') updateNavBadges(); };
            }
            row.appendChild(rdvBtn);
          }
        }

        const delBtn = document.createElement('button');
        delBtn.className = 'h-btn';
        delBtn.style.cssText = 'font-size:10px;padding:2px 6px;color:#f87171;border-color:#f87171;';
        delBtn.textContent = '🗑';
        delBtn.onclick = () => {
          if (typeof showConfirmModal === 'function') {
            showConfirmModal('Supprimer ce document ?', () => {
              const all = loadDocsCamions(stationId).filter(x => x.id !== d.id);
              saveDocsCamions(stationId, all);
              if (typeof renderFlotte === 'function') renderFlotte();
            });
          }
        };
        row.appendChild(delBtn);
        section.appendChild(row);
      });

      listContainer.appendChild(section);
    });
  }

  searchInp.oninput = () => renderList(searchInp.value);
  renderList('');
  wrap.appendChild(listContainer);
  return wrap;
}

function showDocCamionForm(doc, stationId, camions) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  const camionOptions = camions.map(c => `<option value="${c.plaque}">${c.plaque} ${c.marque || ''} ${c.modele || ''}</option>`).join('');
  const typeOptions = DOC_CAMION_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

  modal.innerHTML = `
    <h3 style="margin:0 0 14px;font-size:15px;color:var(--text-primary);">Ajouter un document camion</h3>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <label style="font-size:11px;color:var(--text-muted);">Camion</label>
      <select id="dc-camion" class="rep-input" style="padding:8px;">${camionOptions}</select>
      <label style="font-size:11px;color:var(--text-muted);">Type</label>
      <select id="dc-type" class="rep-input" style="padding:8px;">${typeOptions}</select>
      <label style="font-size:11px;color:var(--text-muted);">Nom du document</label>
      <input type="text" id="dc-nom" class="rep-input" style="padding:8px;" placeholder="Ex: CT 2025, Assurance Allianz...">
      <label style="font-size:11px;color:var(--text-muted);">Date du document</label>
      <input type="date" id="dc-date" class="rep-input" style="padding:8px;">
      <div id="dc-exp-wrap">
        <label style="font-size:11px;color:var(--text-muted);">Date d'expiration</label>
        <input type="date" id="dc-exp" class="rep-input" style="padding:8px;">
      </div>
      <label style="font-size:11px;color:var(--text-muted);">Fichier (PDF, image...)</label>
      <input type="file" id="dc-file" accept=".pdf,.jpg,.jpeg,.png" style="font-size:12px;">
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="h-btn" id="dc-cancel" style="padding:8px 16px;">Annuler</button>
      <button class="h-btn" id="dc-save" style="padding:8px 16px;background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700;">Enregistrer</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector('#dc-cancel').onclick = () => overlay.remove();

  // Show/hide expiration based on type
  modal.querySelector('#dc-type').onchange = () => {
    const t = modal.querySelector('#dc-type').value;
    modal.querySelector('#dc-exp-wrap').style.display = (t === 'CT' || t === 'Assurance') ? '' : 'none';
  };

  modal.querySelector('#dc-save').onclick = async () => {
    const plaque = modal.querySelector('#dc-camion').value;
    const type = modal.querySelector('#dc-type').value;
    const nom = modal.querySelector('#dc-nom').value.trim() || type;
    const date = modal.querySelector('#dc-date').value;
    const dateExpiration = modal.querySelector('#dc-exp').value || null;
    const fileInput = modal.querySelector('#dc-file');

    if (!plaque) { alert('Sélectionnez un camion.'); return; }

    const id = 'dcc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    let fileUrl = '';

    if (fileInput.files.length > 0) {
      const btn = modal.querySelector('#dc-save');
      btn.textContent = '⏳ Upload...'; btn.disabled = true;
      fileUrl = await uploadDocCamionFile(fileInput.files[0], stationId, id) || '';
    }

    const entry = { id, plaque, type, nom, date, dateExpiration, fileUrl, createdAt: new Date().toISOString() };
    const all = loadDocsCamions(stationId);
    all.push(entry);
    saveDocsCamions(stationId, all);

    overlay.remove();
    if (typeof renderFlotte === 'function') renderFlotte();
  };
}
