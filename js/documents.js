/* js/documents.js — Onglet Documents du menu déroulant (SunXP Pro) */
console.log('documents.js chargé');

function getDocsKey() {
  const sid = window.getActiveStationId ? window.getActiveStationId() : 'default';
  return sid + '-documents';
}

function loadDocs() {
  try { const raw = localStorage.getItem(getDocsKey()); return raw ? JSON.parse(raw) : []; }
  catch (_) { return []; }
}

function saveDocs(docs) {
  try { localStorage.setItem(getDocsKey(), JSON.stringify(docs)); } catch (_) {}
}

function renderDocuments() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;';

  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin-bottom:4px;">📄 Documents</h3>';

  // Barre de recherche
  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = '🔍 Rechercher un document...';
  search.className = 'analyse-search';
  wrap.appendChild(search);

  // Bouton ajouter
  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary';
  addBtn.textContent = '+ Ajouter un document';
  addBtn.onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const name = prompt('Nom du document :', file.name);
      if (!name) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const docs = loadDocs();
        docs.push({ id: 'd_' + Date.now(), name, fileName: file.name, type: file.type, size: file.size, data: e.target.result, date: new Date().toISOString() });
        saveDocs(docs);
        if (typeof setMenuTab === 'function') setMenuTab('documents');
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };
  wrap.appendChild(addBtn);

  // Liste des documents
  const listWrap = document.createElement('div');
  listWrap.id = 'docs-list';
  wrap.appendChild(listWrap);

  function renderList(query) {
    listWrap.innerHTML = '';
    const docs = loadDocs();
    const q = (query || '').toLowerCase();
    const filtered = docs.filter(d => d.name.toLowerCase().includes(q));

    if (!filtered.length) {
      listWrap.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin-top:16px;">Aucun document.</p>';
      return;
    }

    filtered.forEach(doc => {
      const card = document.createElement('div');
      card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:8px;';

      const icon = doc.type && doc.type.includes('pdf') ? '📕' : doc.type && doc.type.includes('image') ? '🖼️' : '📄';
      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';
      info.innerHTML = `<div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${icon} ${doc.name}</div><div style="font-size:10px;color:var(--text-muted);">${new Date(doc.date).toLocaleDateString('fr-FR')} — ${(doc.size / 1024).toFixed(0)} Ko</div>`;

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';

      // Ouvrir / Imprimer
      const openBtn = document.createElement('button');
      openBtn.className = 'h-btn';
      openBtn.style.cssText = 'font-size:10px;padding:3px 6px;';
      openBtn.textContent = '🖨️';
      openBtn.title = 'Ouvrir / Imprimer';
      openBtn.onclick = () => {
        const w = window.open('');
        if (doc.type && doc.type.includes('pdf')) {
          w.document.write(`<iframe src="${doc.data}" style="width:100%;height:100%;border:none;"></iframe>`);
        } else if (doc.type && doc.type.includes('image')) {
          w.document.write(`<img src="${doc.data}" style="max-width:100%;">`);
        } else {
          w.document.write(`<iframe src="${doc.data}" style="width:100%;height:100%;border:none;"></iframe>`);
        }
      };

      // Supprimer
      const delBtn = document.createElement('button');
      delBtn.className = 'rep-btn rep-btn-delete';
      delBtn.style.cssText = 'font-size:10px;padding:3px 6px;';
      delBtn.textContent = '🗑';
      delBtn.onclick = () => {
        if (!confirm('Supprimer "' + doc.name + '" ?')) return;
        const docs = loadDocs().filter(d => d.id !== doc.id);
        saveDocs(docs);
        renderList(search.value);
      };

      actions.appendChild(openBtn);
      actions.appendChild(delBtn);
      card.appendChild(info);
      card.appendChild(actions);
      listWrap.appendChild(card);
    });
  }

  search.oninput = () => renderList(search.value);
  renderList('');

  return wrap;
}
