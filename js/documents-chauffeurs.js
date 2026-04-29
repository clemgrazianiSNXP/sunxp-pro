/* js/documents-chauffeurs.js — Documents par chauffeur avec Supabase Storage (SunXP Pro) */
console.log('documents-chauffeurs.js chargé');

function getDocsChauffeursSid() {
  return window.getActiveStationId ? window.getActiveStationId() : 'default';
}

function getDocsChauffeursList() {
  try {
    const raw = localStorage.getItem(getDocsChauffeursSid() + '-repertoire');
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function cNomDC(c) { return ((c.prenom || '') + ' ' + (c.nom || '')).trim() || c.id_amazon || '?'; }
function escDC(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ── Persistence localStorage ─────────────────────────────── */
function getDocsChKey(chauffeurNom) {
  return getDocsChauffeursSid() + '-docs-chauffeur-' + chauffeurNom;
}
function loadDocsChauffeur(chauffeurNom) {
  try { return JSON.parse(localStorage.getItem(getDocsChKey(chauffeurNom))) || []; } catch (_) { return []; }
}
async function loadDocsChauffeurAsync(chauffeurNom) {
  // Essayer de charger depuis Supabase d'abord
  if (typeof sb === 'function' && sb()) {
    try {
      const { data, error } = await sb().from('docs_chauffeurs').select('data')
        .eq('station_id', getDocsChauffeursSid())
        .eq('chauffeur', chauffeurNom)
        .maybeSingle();
      if (!error && data && data.data) {
        localStorage.setItem(getDocsChKey(chauffeurNom), JSON.stringify(data.data));
        return data.data;
      }
    } catch (_) {}
  }
  return loadDocsChauffeur(chauffeurNom);
}
function saveDocsChauffeur(chauffeurNom, docs) {
  const key = getDocsChKey(chauffeurNom);
  try { localStorage.setItem(key, JSON.stringify(docs)); } catch (_) {}
  // Sync vers Supabase
  if (typeof dbSave === 'function') {
    dbSave('docs_chauffeurs', key, { station_id: getDocsChauffeursSid(), chauffeur: chauffeurNom }, docs);
  }
}

/* ── Upload vers Supabase Storage ─────────────────────────── */
async function uploadDocChauffeur(chauffeurNom, file) {
  if (typeof sb !== 'function' || !sb()) return null;
  const sid = getDocsChauffeursSid();
  const safeName = chauffeurNom.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `documents/${sid}/${safeName}/${Date.now()}_${file.name}`;
  try {
    const { data, error } = await sb().storage.from('photos').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) { console.warn('Upload doc error:', error.message); return null; }
    const { data: urlData } = sb().storage.from('photos').getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch (e) { console.warn('Upload doc exception:', e.message); return null; }
}

async function deleteDocChauffeur(url) {
  if (typeof sb !== 'function' || !sb() || !url) return;
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/photos\/(.+)$/);
    if (!match) return;
    const path = decodeURIComponent(match[1]);
    await sb().storage.from('photos').remove([path]);
  } catch (e) { console.warn('Delete doc error:', e.message); }
}

/* ── Types de documents ───────────────────────────────────── */
const DOC_TYPES = [
  'Contrat de travail',
  'Avenant',
  'Sanction',
  'Avertissement',
  'Attestation',
  'Fiche de paie',
  'Autre'
];

/* ── Rendu principal : liste des chauffeurs en cards ───────── */
function renderDocsChauffeurs() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;';
  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin-bottom:4px;">👤 Documents chauffeurs</h3>';

  const chauffeurs = getDocsChauffeursList();
  if (!chauffeurs.length) {
    wrap.innerHTML += '<p style="color:var(--text-muted);font-size:13px;">Aucun chauffeur dans le répertoire.</p>';
    return wrap;
  }

  // Barre de recherche
  const search = document.createElement('input');
  search.type = 'text'; search.placeholder = '🔍 Rechercher un chauffeur...';
  search.className = 'rep-search'; search.style.cssText = 'width:100%;margin-bottom:8px;';
  wrap.appendChild(search);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;';

  chauffeurs.forEach(c => {
    const nom = cNomDC(c);
    const docs = loadDocsChauffeur(nom);
    const card = document.createElement('div');
    card.className = 'portal-card dc-card';
    card.style.cssText = 'cursor:pointer;padding:14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-sidebar);transition:all 0.15s;';
    card.innerHTML = `
      <div style="font-size:14px;font-weight:700;">${escDC(nom)}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${docs.length} document${docs.length !== 1 ? 's' : ''}</div>`;
    card.onmouseenter = () => { card.style.borderColor = 'var(--accent)'; };
    card.onmouseleave = () => { card.style.borderColor = 'var(--border)'; };
    card.onclick = () => showDocsChauffeurDetail(nom);
    grid.appendChild(card);
  });

  wrap.appendChild(grid);

  search.oninput = () => {
    const q = search.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    grid.querySelectorAll('.dc-card').forEach(card => {
      const name = card.querySelector('div').textContent.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      card.style.display = name.includes(q) ? '' : 'none';
    });
  };

  return wrap;
}

/* ── Détail d'un chauffeur : voir et ajouter des documents ── */
function showDocsChauffeurDetail(nom) {
  // Supprimer un éventuel overlay existant
  const existing = document.getElementById('dc-detail-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dc-detail-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:20px;width:90%;max-width:550px;max-height:80vh;overflow-y:auto;';

  async function render() {
    box.innerHTML = '';
    const docs = await loadDocsChauffeurAsync(nom);

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;';
    header.innerHTML = `<h3 style="margin:0;font-size:15px;color:var(--accent);">👤 ${escDC(nom)}</h3>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'h-btn'; closeBtn.textContent = '✕';
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);
    box.appendChild(header);

    // Bouton ajouter
    const addBar = document.createElement('div');
    addBar.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;';

    const nameInp = document.createElement('input');
    nameInp.type = 'text'; nameInp.placeholder = 'Nom du document...';
    nameInp.className = 'rep-input'; nameInp.style.cssText = 'padding:6px;font-size:12px;width:180px;';
    addBar.appendChild(nameInp);

    const fileInp = document.createElement('input');
    fileInp.type = 'file'; fileInp.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    fileInp.style.cssText = 'font-size:11px;';
    addBar.appendChild(fileInp);

    const addBtn = document.createElement('button');
    addBtn.className = 'rep-btn rep-btn-primary'; addBtn.style.cssText = 'font-size:12px;padding:6px 12px;';
    addBtn.textContent = '📤 Ajouter';
    addBtn.onclick = async () => {
      if (!nameInp.value.trim()) { alert('Entrez un nom pour le document.'); return; }
      if (!fileInp.files.length) { alert('Sélectionnez un fichier.'); return; }
      const file = fileInp.files[0];
      addBtn.disabled = true; addBtn.textContent = '⏳ Upload...';
      const url = await uploadDocChauffeur(nom, file);
      if (!url) { alert('Erreur lors de l\'upload. Vérifiez que le bucket "photos" existe dans Supabase Storage.'); addBtn.disabled = false; addBtn.textContent = '📤 Ajouter'; return; }
      const docs = await loadDocsChauffeurAsync(nom);
      docs.push({ id: 'dc_' + Date.now(), type: nameInp.value.trim(), fileName: file.name, url, date: new Date().toISOString() });
      saveDocsChauffeur(nom, docs);
      showDocToast('✅ Document ajouté avec succès');
      render();
    };
    addBar.appendChild(addBtn);
    box.appendChild(addBar);

    // Liste des documents
    if (!docs.length) {
      const empty = document.createElement('p');
      empty.style.cssText = 'color:var(--text-muted);font-size:13px;text-align:center;margin-top:20px;';
      empty.textContent = 'Aucun document pour ce chauffeur.';
      box.appendChild(empty);
    } else {
      docs.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(doc => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:var(--bg-primary);';
        const icon = doc.fileName.match(/\.(jpg|jpeg|png)$/i) ? '🖼' : '📄';
        row.innerHTML = `
          <span style="font-size:18px;">${icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escDC(doc.type)}</div>
            <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escDC(doc.fileName)} · ${new Date(doc.date).toLocaleDateString('fr-FR')}</div>
          </div>`;

        // Bouton voir
        const viewBtn = document.createElement('button');
        viewBtn.className = 'h-btn'; viewBtn.style.cssText = 'font-size:10px;padding:3px 6px;';
        viewBtn.textContent = '👁';
        viewBtn.title = 'Voir le document';
        viewBtn.onclick = () => window.open(doc.url, '_blank');
        row.appendChild(viewBtn);

        // Bouton supprimer
        const delBtn = document.createElement('button');
        delBtn.className = 'h-btn'; delBtn.style.cssText = 'font-size:10px;padding:3px 6px;color:#f87171;border-color:#f87171;';
        delBtn.textContent = '🗑';
        delBtn.title = 'Supprimer';
        delBtn.onclick = () => {
          showConfirmModal('Supprimer ce document ?', async () => {
            await deleteDocChauffeur(doc.url);
            const current = await loadDocsChauffeurAsync(nom);
            saveDocsChauffeur(nom, current.filter(d => d.id !== doc.id));
            render();
          });
        };
        row.appendChild(delBtn);

        box.appendChild(row);
      });
    }
  }

  render();
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


/* ── Toast de confirmation ────────────────────────────────── */
function showDocToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:var(--bg-sidebar);border:1px solid var(--accent);border-radius:10px;padding:14px 24px;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-size:14px;font-weight:600;color:var(--accent);animation:fadeInDown 0.3s ease;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2000);
}
