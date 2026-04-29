/* js/annonces.js — Système d'annonces station (SunXP Pro) */
console.log('annonces.js chargé');

function getAnnoncesSid() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }
function getAnnoncesKey() { return getAnnoncesSid() + '-annonces'; }
function loadAnnonces() { try { return JSON.parse(localStorage.getItem(getAnnoncesKey())) || []; } catch (_) { return []; } }
function saveAnnonces(list) {
  const key = getAnnoncesKey();
  try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('annonces', key, { station_id: getAnnoncesSid() }, list);
}
function escA(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>'); }

const ANNONCE_CATEGORIES = [
  { id: 'info', label: '📢 Information', color: '#3b82f6' },
  { id: 'reunion', label: '🤝 Réunion', color: '#8b5cf6' },
  { id: 'changement', label: '🔄 Changement', color: '#f59e0b' },
  { id: 'urgent', label: '🚨 Urgent', color: '#ef4444' },
  { id: 'felicitations', label: '🎉 Félicitations', color: '#10b981' },
];

function getCatById(id) { return ANNONCE_CATEGORIES.find(c => c.id === id) || ANNONCE_CATEGORIES[0]; }

/* ══════════════════════════════════════════════════════════════
   ESPACE RESPONSABLE — Gestion des annonces
   ══════════════════════════════════════════════════════════════ */
function renderAnnoncesManager() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
  header.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">📢 Annonces</h3>';
  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary'; addBtn.textContent = '+ Nouvelle annonce';
  addBtn.onclick = () => showAnnonceForm();
  header.appendChild(addBtn);
  wrap.appendChild(header);

  // Liste
  const annonces = loadAnnonces().sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!annonces.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-muted);text-align:center;margin-top:30px;font-size:13px;';
    empty.textContent = 'Aucune annonce publiée.';
    wrap.appendChild(empty);
  } else {
    annonces.forEach(a => wrap.appendChild(buildAnnonceCard(a, true)));
  }

  return wrap;
}

function buildAnnonceCard(a, withActions) {
  const cat = getCatById(a.categorie);
  const card = document.createElement('div');
  card.style.cssText = `border:1px solid var(--border);border-left:4px solid ${cat.color};border-radius:8px;padding:14px;background:var(--bg-sidebar);`;

  const top = document.createElement('div');
  top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
  top.innerHTML = `
    <span style="font-size:11px;font-weight:600;color:${cat.color};background:${cat.color}15;padding:2px 8px;border-radius:4px;">${cat.label}</span>
    <span style="font-size:10px;color:var(--text-muted);">${formatDateAnnonce(a.date)}</span>`;
  card.appendChild(top);

  const titre = document.createElement('div');
  titre.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:6px;';
  titre.textContent = a.titre;
  card.appendChild(titre);

  const contenu = document.createElement('div');
  contenu.style.cssText = 'font-size:13px;color:var(--text-primary);line-height:1.5;';
  contenu.innerHTML = escA(a.contenu);
  card.appendChild(contenu);

  if (withActions) {
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;margin-top:10px;justify-content:flex-end;';
    const delBtn = document.createElement('button');
    delBtn.className = 'h-btn'; delBtn.style.cssText = 'font-size:10px;padding:3px 8px;color:#f87171;border-color:#f87171;';
    delBtn.textContent = '🗑 Supprimer';
    delBtn.onclick = () => {
      if (typeof showConfirmModal === 'function') {
        showConfirmModal('Supprimer cette annonce ?', () => { deleteAnnonce(a.id); });
      } else {
        if (confirm('Supprimer cette annonce ?')) deleteAnnonce(a.id);
      }
    };
    actions.appendChild(delBtn);
    card.appendChild(actions);
  }

  return card;
}

function deleteAnnonce(id) {
  const list = loadAnnonces().filter(a => a.id !== id);
  saveAnnonces(list);
  if (typeof setMenuTab === 'function') setMenuTab('annonces');
}

function showAnnonceForm(existing) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:24px;width:90%;max-width:450px;display:flex;flex-direction:column;gap:12px;';

  box.innerHTML = `<h3 style="margin:0;font-size:15px;color:var(--accent);">📢 Nouvelle annonce</h3>`;

  // Catégorie
  const selCat = document.createElement('select');
  selCat.className = 'rep-input'; selCat.style.cssText = 'padding:8px;font-size:13px;';
  ANNONCE_CATEGORIES.forEach(c => {
    const o = document.createElement('option'); o.value = c.id; o.textContent = c.label;
    selCat.appendChild(o);
  });
  box.appendChild(selCat);

  // Titre
  const titreInp = document.createElement('input');
  titreInp.type = 'text'; titreInp.placeholder = 'Titre de l\'annonce...';
  titreInp.className = 'rep-input'; titreInp.style.cssText = 'padding:8px;font-size:13px;';
  box.appendChild(titreInp);

  // Contenu
  const contenuArea = document.createElement('textarea');
  contenuArea.placeholder = 'Contenu de l\'annonce...';
  contenuArea.style.cssText = 'background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-size:13px;padding:10px;min-height:100px;resize:vertical;font-family:var(--font-family);';
  box.appendChild(contenuArea);

  // Boutons
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'h-btn'; cancelBtn.textContent = 'Annuler';
  cancelBtn.onclick = () => overlay.remove();
  const pubBtn = document.createElement('button');
  pubBtn.className = 'rep-btn rep-btn-primary'; pubBtn.textContent = '📤 Publier';
  pubBtn.onclick = () => {
    if (!titreInp.value.trim()) { alert('Entrez un titre.'); return; }
    if (!contenuArea.value.trim()) { alert('Entrez un contenu.'); return; }
    const annonces = loadAnnonces();
    annonces.push({
      id: 'ann_' + Date.now(),
      categorie: selCat.value,
      titre: titreInp.value.trim(),
      contenu: contenuArea.value.trim(),
      date: new Date().toISOString()
    });
    saveAnnonces(annonces);
    overlay.remove();
    if (typeof setMenuTab === 'function') setMenuTab('annonces');
  };
  btns.appendChild(cancelBtn); btns.appendChild(pubBtn);
  box.appendChild(btns);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  titreInp.focus();
}

/* ══════════════════════════════════════════════════════════════
   ESPACE CHAUFFEUR — Lecture des annonces
   ══════════════════════════════════════════════════════════════ */
function portalAnnonces() {
  const wrap = document.createElement('div');

  const title = document.createElement('div');
  title.style.cssText = 'text-align:center;margin-bottom:14px;';
  title.innerHTML = '<div style="font-size:15px;font-weight:700;">📢 Annonces</div><div style="font-size:12px;color:var(--text-muted);">Informations de votre station</div>';
  wrap.appendChild(title);

  const annonces = loadAnnonces().sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!annonces.length) {
    const empty = document.createElement('div');
    empty.className = 'portal-card';
    empty.style.cssText += 'text-align:center;';
    empty.innerHTML = '<div style="font-size:24px;margin-bottom:8px;">📭</div><div style="font-size:13px;color:var(--text-muted);">Aucune annonce pour le moment</div>';
    wrap.appendChild(empty);
    return wrap;
  }

  annonces.forEach(a => {
    const cat = getCatById(a.categorie);
    const card = document.createElement('div');
    card.className = 'portal-card';
    card.style.cssText += `text-align:left;align-items:stretch;gap:8px;border-left:4px solid ${cat.color};`;

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:10px;font-weight:600;color:${cat.color};background:${cat.color}15;padding:2px 8px;border-radius:4px;">${cat.label}</span>
        <span style="font-size:10px;color:var(--text-muted);">${formatDateAnnonce(a.date)}</span>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--text-primary);">${escA(a.titre)}</div>
      <div style="font-size:13px;color:var(--text-primary);line-height:1.5;">${escA(a.contenu)}</div>`;
    wrap.appendChild(card);
  });

  return wrap;
}

/* ── Helpers ──────────────────────────────────────────────── */
function formatDateAnnonce(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return "Aujourd'hui " + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Hier ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (_) { return iso; }
}
