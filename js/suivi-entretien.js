/* js/suivi-entretien.js — Suivi Entretien Flotte (SunXP Pro) */
console.log('suivi-entretien.js chargé');

const ENTRETIEN_BUCKET = 'entretien-flotte';

/* ── Persistance ──────────────────────────────────────────── */
function entretienKey(stationId) { return stationId + '-suivi-entretien'; }

function loadEntretien(stationId) {
  try { return JSON.parse(localStorage.getItem(entretienKey(stationId))) || []; }
  catch (_) { return []; }
}

function saveEntretien(stationId, list) {
  try { localStorage.setItem(entretienKey(stationId), JSON.stringify(list)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('suivi_entretien', entretienKey(stationId), { station_id: stationId }, list);
}

/* ── Upload Storage ───────────────────────────────────────── */
async function uploadEntretienFile(file, stationId, entId) {
  if (!sb()) return null;
  const ext = file.name.split('.').pop();
  const path = `${stationId}/${entId}.${ext}`;
  try {
    const { error } = await sb().storage.from(ENTRETIEN_BUCKET).upload(path, file, { upsert: true });
    if (error) { console.error('Upload entretien error:', error.message); return null; }
    const { data: urlData } = sb().storage.from(ENTRETIEN_BUCKET).getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch (e) { console.warn('Upload entretien catch:', e.message); return null; }
}

async function deleteEntretienFile(stationId, entId, fileName) {
  if (!sb()) return;
  const ext = fileName.split('.').pop();
  const path = `${stationId}/${entId}.${ext}`;
  try { await sb().storage.from(ENTRETIEN_BUCKET).remove([path]); } catch (_) {}
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderSuiviEntretien() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  const camions = loadCamions();
  const entretiens = loadEntretien(stationId);

  // Bouton ajouter
  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary';
  addBtn.textContent = '+ Ajouter un entretien';
  addBtn.onclick = () => showEntretienForm(null, stationId, camions);
  wrap.appendChild(addBtn);

  if (!entretiens.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-muted);text-align:center;margin-top:20px;';
    empty.textContent = 'Aucun entretien enregistré.';
    wrap.appendChild(empty);
  } else {
    // Grouper par camion
    const byCamion = {};
    entretiens.forEach(e => {
      if (!byCamion[e.plaque]) byCamion[e.plaque] = [];
      byCamion[e.plaque].push(e);
    });

    Object.keys(byCamion).forEach(plaque => {
      const section = document.createElement('div');
      section.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:12px;';

      const header = document.createElement('div');
      header.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent);margin-bottom:8px;';
      header.textContent = '🚛 ' + plaque;
      section.appendChild(header);

      byCamion[plaque].sort((a, b) => new Date(b.date || b.dateDebut || 0) - new Date(a.date || a.dateDebut || 0)).forEach(e => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;';

        if (e.type === 'travaux') {
          row.innerHTML = `
            <span style="background:#60a5fa;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">TRAVAUX</span>
            <span style="flex:1;color:var(--text-primary);">${e.description || '—'}</span>
            <span style="color:var(--text-muted);font-size:11px;">${e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—'}</span>
          `;
        } else {
          row.innerHTML = `
            <span style="background:#4ade80;color:#000;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">CT</span>
            <span style="flex:1;color:var(--text-primary);">Contrôle technique</span>
            <span style="color:var(--text-muted);font-size:11px;">${e.dateDebut ? new Date(e.dateDebut).toLocaleDateString('fr-FR') : '?'} → ${e.dateFin ? new Date(e.dateFin).toLocaleDateString('fr-FR') : '?'}</span>
          `;
          if (e.fileUrl) {
            const link = document.createElement('a');
            link.href = e.fileUrl; link.target = '_blank';
            link.style.cssText = 'font-size:11px;color:var(--accent);';
            link.textContent = '📎';
            row.appendChild(link);
          }
        }

        // Modifier
        const editBtn = document.createElement('button');
        editBtn.className = 'h-btn';
        editBtn.style.cssText = 'font-size:10px;padding:2px 6px;';
        editBtn.textContent = '✏️';
        editBtn.onclick = () => showEntretienForm(e, stationId, camions);
        row.appendChild(editBtn);

        // Supprimer
        const delBtn = document.createElement('button');
        delBtn.className = 'h-btn';
        delBtn.style.cssText = 'font-size:10px;padding:2px 6px;color:#f87171;border-color:#f87171;';
        delBtn.textContent = '🗑';
        delBtn.onclick = () => {
          showConfirmModal('Supprimer cet entretien ?', () => {
            const all = loadEntretien(stationId).filter(x => x.id !== e.id);
            if (e.fileName) deleteEntretienFile(stationId, e.id, e.fileName);
            saveEntretien(stationId, all);
            renderFlotte();
          });
        };
        row.appendChild(delBtn);

        section.appendChild(row);
      });

      wrap.appendChild(section);
    });
  }

  return wrap;
}

/* ── Formulaire ajout/modification ────────────────────────── */
function showEntretienForm(entry, stationId, camions) {
  const isEdit = !!entry;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  const camionOptions = camions.map(c => `<option value="${c.plaque}" ${entry?.plaque === c.plaque ? 'selected' : ''}>${c.plaque} ${c.marque || ''} ${c.modele || ''}</option>`).join('');

  const currentType = entry?.type || 'travaux';

  modal.innerHTML = `
    <h3 style="margin:0 0 14px;font-size:15px;color:var(--text-primary);">${isEdit ? 'Modifier' : 'Ajouter'} un entretien</h3>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <label style="font-size:11px;color:var(--text-muted);">Camion</label>
      <select id="ent-camion" class="rep-input" style="padding:8px;">${camionOptions}</select>
      <label style="font-size:11px;color:var(--text-muted);">Type</label>
      <select id="ent-type" class="rep-input" style="padding:8px;">
        <option value="travaux" ${currentType === 'travaux' ? 'selected' : ''}>🔧 Travaux</option>
        <option value="ct" ${currentType === 'ct' ? 'selected' : ''}>✅ Contrôle Technique</option>
      </select>
      <div id="ent-fields"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="h-btn" id="ent-cancel" style="padding:8px 16px;">Annuler</button>
      <button class="h-btn" id="ent-save" style="padding:8px 16px;background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700;">Enregistrer</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  modal.querySelector('#ent-cancel').onclick = () => overlay.remove();

  const fieldsDiv = modal.querySelector('#ent-fields');
  const typeSelect = modal.querySelector('#ent-type');

  function renderFields() {
    const type = typeSelect.value;
    if (type === 'travaux') {
      fieldsDiv.innerHTML = `
        <label style="font-size:11px;color:var(--text-muted);margin-top:8px;">Description des travaux</label>
        <input type="text" id="ent-desc" class="rep-input" style="padding:8px;" placeholder="Ex: Vidange, freins, pneus..." value="${entry?.type === 'travaux' ? (entry.description || '') : ''}">
        <label style="font-size:11px;color:var(--text-muted);">Date de réalisation</label>
        <input type="date" id="ent-date" class="rep-input" style="padding:8px;" value="${entry?.type === 'travaux' ? (entry.date || '') : ''}">
      `;
    } else {
      fieldsDiv.innerHTML = `
        <label style="font-size:11px;color:var(--text-muted);margin-top:8px;">Date début validité</label>
        <input type="date" id="ent-debut" class="rep-input" style="padding:8px;" value="${entry?.type === 'ct' ? (entry.dateDebut || '') : ''}">
        <label style="font-size:11px;color:var(--text-muted);">Date fin validité</label>
        <input type="date" id="ent-fin" class="rep-input" style="padding:8px;" value="${entry?.type === 'ct' ? (entry.dateFin || '') : ''}">
        <label style="font-size:11px;color:var(--text-muted);">Document CT (PDF, image...)</label>
        <input type="file" id="ent-file" accept=".pdf,.jpg,.jpeg,.png" style="font-size:12px;">
        ${entry?.fileUrl ? `<a href="${entry.fileUrl}" target="_blank" style="font-size:11px;color:var(--accent);">📎 Document actuel</a>` : ''}
      `;
    }
  }
  typeSelect.onchange = renderFields;
  renderFields();

  modal.querySelector('#ent-save').onclick = async () => {
    const plaque = modal.querySelector('#ent-camion').value;
    const type = typeSelect.value;
    if (!plaque) { alert('Sélectionnez un camion.'); return; }

    const id = entry?.id || ('ent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
    let obj = { id, plaque, type, createdAt: entry?.createdAt || new Date().toISOString() };

    if (type === 'travaux') {
      const desc = modal.querySelector('#ent-desc').value.trim();
      const date = modal.querySelector('#ent-date').value;
      if (!desc) { alert('Décrivez les travaux.'); return; }
      obj.description = desc;
      obj.date = date;
    } else {
      const dateDebut = modal.querySelector('#ent-debut').value;
      const dateFin = modal.querySelector('#ent-fin').value;
      if (!dateDebut || !dateFin) { alert('Remplissez les dates.'); return; }
      obj.dateDebut = dateDebut;
      obj.dateFin = dateFin;
      obj.fileUrl = entry?.fileUrl || '';
      obj.fileName = entry?.fileName || '';

      const fileInput = modal.querySelector('#ent-file');
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        obj.fileName = file.name;
        const url = await uploadEntretienFile(file, stationId, id);
        if (url) obj.fileUrl = url;
      }
    }

    const all = loadEntretien(stationId);
    const idx = all.findIndex(x => x.id === id);
    if (idx >= 0) all[idx] = obj; else all.push(obj);
    saveEntretien(stationId, all);

    overlay.remove();
    renderFlotte();
  };
}
