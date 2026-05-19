/* js/docs-employes.js — Documents employés (sous-onglet RH) avec Supabase Storage */
console.log('docs-employes.js chargé');

const DOCS_EMP_BUCKET = 'docs-employes';

/* ── Persistance ──────────────────────────────────────────── */
function docsEmpKey(stationId) { return stationId + '-docs-employes'; }

function loadDocsEmployes(stationId) {
  try { return JSON.parse(localStorage.getItem(docsEmpKey(stationId))) || []; }
  catch (_) { return []; }
}

function saveDocsEmployes(stationId, list) {
  try { localStorage.setItem(docsEmpKey(stationId), JSON.stringify(list)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('docs_employes', docsEmpKey(stationId), { station_id: stationId }, list);
}

/* ── Upload/Delete Storage ────────────────────────────────── */
async function uploadDocEmpFile(file, stationId, docId) {
  if (!sb()) return null;
  const ext = file.name.split('.').pop();
  const path = `${stationId}/${docId}.${ext}`;
  try {
    const { error } = await sb().storage.from(DOCS_EMP_BUCKET).upload(path, file, { upsert: true });
    if (error) { console.error('Upload doc-emp error:', error.message); return null; }
    const { data: urlData } = sb().storage.from(DOCS_EMP_BUCKET).getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch (e) { console.warn('Upload doc-emp catch:', e.message); return null; }
}

async function deleteDocEmpFile(stationId, docId, fileName) {
  if (!sb()) return;
  const ext = fileName.split('.').pop();
  const path = `${stationId}/${docId}.${ext}`;
  try { await sb().storage.from(DOCS_EMP_BUCKET).remove([path]); } catch (_) {}
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderDocsEmployes() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  let chauffeurs = [];
  try { chauffeurs = JSON.parse(localStorage.getItem(stationId + '-repertoire')) || []; } catch (_) {}
  let responsables = [];
  try { responsables = JSON.parse(localStorage.getItem(stationId + '-responsables')) || []; } catch (_) {}
  const allPersons = [...responsables, ...chauffeurs];

  const docs = loadDocsEmployes(stationId);

  // Barre de recherche + bouton ajouter
  const searchBar = document.createElement('div');
  searchBar.style.cssText = 'display:flex;gap:8px;align-items:center;';
  const searchInp = document.createElement('input');
  searchInp.type = 'text';
  searchInp.placeholder = '🔍 Rechercher un employé...';
  searchInp.className = 'rep-search';
  searchInp.style.cssText = 'flex:1;max-width:280px;';
  searchBar.appendChild(searchInp);

  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary';
  addBtn.style.cssText = 'font-size:12px;padding:8px 14px;white-space:nowrap;';
  addBtn.textContent = '+ Ajouter un document';
  addBtn.onclick = () => showDocEmpForm(null, stationId, allPersons);
  searchBar.appendChild(addBtn);
  wrap.appendChild(searchBar);

  // Container pour les sections
  const listContainer = document.createElement('div');
  listContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

  function renderList(query) {
    listContainer.innerHTML = '';
    const q = (query || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (!docs.length) {
      listContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:20px;">Aucun document enregistré.</p>';
      return;
    }

    // Grouper par employé
    const byPerson = {};
    docs.forEach(d => {
      if (!byPerson[d.chauffeurNom]) byPerson[d.chauffeurNom] = [];
      byPerson[d.chauffeurNom].push(d);
    });

    const filteredNames = Object.keys(byPerson).filter(nom => !q || nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q));

    if (!filteredNames.length) {
      listContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:20px;">Aucun résultat.</p>';
      return;
    }

    filteredNames.forEach(nom => {
      const section = document.createElement('div');
      section.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:12px;';

      const header = document.createElement('div');
      header.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:8px;';
      header.textContent = nom;
      section.appendChild(header);

      byPerson[nom].forEach(d => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;';

        row.innerHTML = `
          <span style="flex:1;color:var(--text-primary);">📄 ${d.docName || '—'}</span>
        `;

        if (d.fileUrl) {
          const link = document.createElement('a');
          link.href = d.fileUrl;
          link.target = '_blank';
          link.style.cssText = 'font-size:11px;color:var(--accent);';
          link.textContent = '📎 Voir';
          row.appendChild(link);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'h-btn';
        editBtn.style.cssText = 'font-size:10px;padding:2px 6px;';
        editBtn.textContent = '✏️';
        editBtn.onclick = () => showDocEmpForm(d, stationId, allPersons);
        row.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'h-btn';
        delBtn.style.cssText = 'font-size:10px;padding:2px 6px;color:#f87171;border-color:#f87171;';
        delBtn.textContent = '🗑';
        delBtn.onclick = () => {
          if (typeof showConfirmModal === 'function') {
            showConfirmModal('Supprimer ce document ?', () => {
              const all = loadDocsEmployes(stationId).filter(x => x.id !== d.id);
              if (d.fileName) deleteDocEmpFile(stationId, d.id, d.fileName);
              saveDocsEmployes(stationId, all);
              renderRH();
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

/* ── Formulaire ajout/modification ────────────────────────── */
function showDocEmpForm(doc, stationId, allPersons) {
  const isEdit = !!doc;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  const personOptions = allPersons.map(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    return `<option value="${nom}" ${doc?.chauffeurNom === nom ? 'selected' : ''}>${nom}</option>`;
  }).join('');

  modal.innerHTML = `
    <h3 style="margin:0 0 14px;font-size:15px;color:var(--text-primary);">${isEdit ? 'Modifier' : 'Ajouter'} un document</h3>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <label style="font-size:11px;color:var(--text-muted);">Employé</label>
      <select id="de-person" class="rep-input" style="padding:8px;">${personOptions}</select>
      <label style="font-size:11px;color:var(--text-muted);">Nom du document</label>
      <input type="text" id="de-name" class="rep-input" style="padding:8px;" placeholder="Ex: Contrat de travail, RIB, Permis..." value="${doc?.docName || ''}">
      <label style="font-size:11px;color:var(--text-muted);">Fichier (PDF, image...)</label>
      <input type="file" id="de-file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="font-size:12px;">
      ${doc?.fileUrl ? `<a href="${doc.fileUrl}" target="_blank" style="font-size:11px;color:var(--accent);">📎 Document actuel</a>` : ''}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="h-btn" id="de-cancel" style="padding:8px 16px;">Annuler</button>
      <button class="h-btn" id="de-save" style="padding:8px 16px;background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700;">Enregistrer</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  modal.querySelector('#de-cancel').onclick = () => overlay.remove();

  modal.querySelector('#de-save').onclick = async () => {
    const chauffeurNom = modal.querySelector('#de-person').value;
    const docName = modal.querySelector('#de-name').value.trim();
    const fileInput = modal.querySelector('#de-file');

    if (!chauffeurNom || !docName) { alert('Remplissez le nom et l\'employé.'); return; }

    const id = doc?.id || ('de_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
    let fileUrl = doc?.fileUrl || '';
    let fileName = doc?.fileName || '';

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      fileName = file.name;
      const url = await uploadDocEmpFile(file, stationId, id);
      if (url) fileUrl = url;
    }

    const entry = { id, chauffeurNom, docName, fileUrl, fileName, createdAt: doc?.createdAt || new Date().toISOString() };

    const all = loadDocsEmployes(stationId);
    const idx = all.findIndex(x => x.id === id);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    saveDocsEmployes(stationId, all);

    overlay.remove();
    renderRH();
  };
}
