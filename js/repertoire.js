/* js/repertoire.js — Onglet Répertoire (SunXP Pro) */
console.log('repertoire.js chargé');

let repSearchQuery = '';

/* ── Point d'entrée ───────────────────────────────────────── */
function initRepertoire() {
  repSearchQuery = '';
  renderRepertoire();
}

/* ── Persistance ──────────────────────────────────────────── */
function repKey(stationId) { return stationId + '-repertoire'; }

function loadChauffeurs(stationId) {
  try {
    const raw = localStorage.getItem(repKey(stationId));
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function saveChauffeurs(stationId, list) {
  try {
    localStorage.setItem(repKey(stationId), JSON.stringify(list));
    // Sync vers Supabase
    if (typeof dbSaveChauffeurs === 'function') dbSaveChauffeurs(stationId, list);
  } catch (_) {}
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderRepertoire() {
  const container = document.getElementById('module-repertoire');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : 'default';
  const chauffeurs = loadChauffeurs(stationId);

  // Sous-onglets Répertoire / Identifier
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:0;border-bottom:1px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;';
  [['repertoire','👥 Répertoire'],['identifier','🔍 Identifier']].forEach(([id,label]) => {
    const btn = document.createElement('button');
    btn.className = 'h-btn';
    btn.style.cssText = `flex:none;padding:8px 16px;border-radius:0;border:none;border-bottom:2px solid ${repView===id?'var(--accent)':'transparent'};color:${repView===id?'var(--accent)':'var(--text-muted)'};font-size:12px;`;
    btn.textContent = label;
    btn.onclick = () => { repView = id; renderRepertoire(); };
    tabBar.appendChild(btn);
  });
  container.appendChild(tabBar);

  if (repView === 'identifier') {
    container.appendChild(renderIdentifier(stationId));
    return;
  }

  container.appendChild(buildRepToolbar(stationId, chauffeurs));

  const listWrap = document.createElement('div');
  listWrap.style.cssText = 'flex:1;overflow:auto;padding:16px;';
  listWrap.appendChild(buildRepTable(chauffeurs, stationId));
  container.appendChild(listWrap);

  // Zone formulaire (overlay)
  const formZone = document.createElement('div');
  formZone.id = 'rep-form-zone';
  container.appendChild(formZone);
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildRepToolbar(stationId, chauffeurs) {
  const bar = document.createElement('div');
  bar.className = 'rep-toolbar';
  bar.innerHTML = `
    <input class="rep-search" id="rep-search" placeholder="🔍 Rechercher par nom ou prénom..." value="${repSearchQuery}">
    <button class="rep-btn rep-btn-primary" id="rep-add-btn">+ Ajouter un chauffeur</button>
  `;

  bar.querySelector('#rep-search').addEventListener('input', e => {
    repSearchQuery = e.target.value;
    renderRepertoire();
  });

  bar.querySelector('#rep-add-btn').addEventListener('click', () => {
    openForm(null, stationId);
  });

  return bar;
}

/* ── Tableau ──────────────────────────────────────────────── */
function buildRepTable(chauffeurs, stationId) {
  const q = repSearchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = chauffeurs.filter(c => {
    const full = (c.prenom + ' ' + c.nom).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return full.includes(q);
  });

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-muted);text-align:center;margin-top:40px;font-size:14px;';
    empty.textContent = chauffeurs.length ? 'Aucun résultat pour cette recherche.' : 'Aucun chauffeur dans ce répertoire. Cliquez sur "+ Ajouter un chauffeur".';
    return empty;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;padding:4px 0;';

  filtered.forEach(c => {
    const card = document.createElement('div');
    card.style.cssText = [
      'background:var(--bg-sidebar)',
      'border:1px solid var(--border)',
      'border-radius:12px',
      'padding:20px 22px',
      'width:240px',
      'display:flex',
      'flex-direction:column',
      'gap:8px',
      'transition:border-color 0.18s ease,transform 0.18s ease',
      'cursor:default'
    ].join(';');
    card.onmouseenter = () => { card.style.borderColor = 'var(--accent)'; card.style.transform = 'translateY(-2px)'; };
    card.onmouseleave = () => { card.style.borderColor = 'var(--border)'; card.style.transform = ''; };

    const avatar = document.createElement('div');
    avatar.style.cssText = 'width:44px;height:44px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--accent);margin-bottom:4px;';
    avatar.textContent = (c.prenom[0] || '') + (c.nom[0] || '');

    const name = document.createElement('div');
    name.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);';
    name.textContent = c.prenom + ' ' + c.nom;

    const tel = document.createElement('div');
    tel.style.cssText = 'font-size:12px;color:var(--text-muted);';
    tel.textContent = '📞 ' + (c.telephone || '—');

    const amazonId = document.createElement('div');
    amazonId.style.cssText = 'font-size:11px;font-family:monospace;color:var(--accent);background:var(--accent-dim);padding:3px 7px;border-radius:4px;align-self:flex-start;';
    amazonId.textContent = c.id_amazon || '—';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-top:6px;';

    const waLink = document.createElement('a');
    waLink.href = 'https://wa.me/' + waNumber(c.telephone);
    waLink.target = '_blank';
    waLink.style.cssText = 'font-size:18px;text-decoration:none;line-height:1;';
    waLink.textContent = '💬';
    waLink.title = 'WhatsApp';

    const editBtn = document.createElement('button');
    editBtn.className = 'rep-btn rep-btn-edit';
    editBtn.textContent = '✏️ Modifier';
    editBtn.onclick = () => openForm(c, stationId);

    const delBtn = document.createElement('button');
    delBtn.className = 'rep-btn rep-btn-delete';
    delBtn.textContent = '🗑';
    delBtn.onclick = () => deleteChauffeur(c.id, stationId);

    actions.appendChild(waLink);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(avatar);
    card.appendChild(name);
    card.appendChild(tel);
    card.appendChild(amazonId);
    card.appendChild(actions);
    grid.appendChild(card);
  });

  return grid;
}

/* ── Formulaire ───────────────────────────────────────────── */
function openForm(chauffeur, stationId) {
  const zone = document.getElementById('rep-form-zone');
  if (!zone) return;
  showRepertoireForm(
    zone,
    chauffeur,
    (saved) => {
      const list = loadChauffeurs(stationId);
      // Chercher par id OU par id_amazon pour éviter les doublons
      const idx = list.findIndex(c => 
        (c.id && c.id === saved.id) || 
        (c.id_amazon && c.id_amazon === saved.id_amazon)
      );
      if (idx >= 0) list[idx] = saved; else list.push(saved);
      saveChauffeurs(stationId, list);
      zone.innerHTML = '';
      renderRepertoire();
    },
    () => { zone.innerHTML = ''; }
  );
}

function deleteChauffeur(id, stationId) {
  showConfirmModal('Supprimer ce chauffeur ?', () => {
    const list = loadChauffeurs(stationId).filter(c => c.id !== id && !(c.id_amazon && c.id_amazon === id));
    saveChauffeurs(stationId, list);
    renderRepertoire();
  });
}

/* ── Utilitaires ──────────────────────────────────────────── */
function waNumber(tel) {
  return tel.replace(/\D/g, '');
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
