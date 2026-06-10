/* js/repertoire.js — Onglet Répertoire (SunXP Pro) */

let repSearchQuery = '';
let repView = 'chauffeurs'; // 'chauffeurs' | 'responsables' | 'identifier'

// Rôles chauffeurs (ordre hiérarchique)
const ROLES_CHAUFFEURS = ['CES', 'BU', 'Formateur', 'Chauffeur'];
// Rôles responsables (ordre hiérarchique)
const ROLES_RESPONSABLES = ['Ressources Humaines', 'Responsable Qualité', 'Mécanicien', 'Gestionnaire de Flotte', 'Chef de Parc', 'Dispatcher', 'Chef d\'équipe'];

/* ── Point d'entrée ───────────────────────────────────────── */
function initRepertoire() {
  repSearchQuery = '';
  renderRepertoire();
}

/* ── Persistance ──────────────────────────────────────────── */
function repKey(stationId) { return stationId + '-repertoire'; }
function repResponsablesKey(stationId) { return stationId + '-responsables'; }

function loadChauffeurs(stationId) {
  try { return JSON.parse(localStorage.getItem(repKey(stationId))) || []; } catch (_) { return []; }
}
function saveChauffeurs(stationId, list) {
  try {
    localStorage.setItem(repKey(stationId), JSON.stringify(list));
    if (typeof dbSaveChauffeurs === 'function') dbSaveChauffeurs(stationId, list);
  } catch (_) {}
}
function loadResponsables(stationId) {
  try { return JSON.parse(localStorage.getItem(repResponsablesKey(stationId))) || []; } catch (_) { return []; }
}
function saveResponsables(stationId, list) {
  try {
    localStorage.setItem(repResponsablesKey(stationId), JSON.stringify(list));
    if (typeof dbSaveResponsables === 'function') dbSaveResponsables(stationId, list);
  } catch (_) {}
}

/* ── Tri hiérarchique ─────────────────────────────────────── */
function sortByRole(list, roleOrder) {
  return [...list].sort((a, b) => {
    const ia = roleOrder.indexOf(a.role);
    const ib = roleOrder.indexOf(b.role);
    const ra = ia >= 0 ? ia : 999;
    const rb = ib >= 0 ? ib : 999;
    return ra - rb;
  });
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderRepertoire() {
  const container = document.getElementById('module-repertoire');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : 'default';

  // Sous-onglets
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:0;border-bottom:1px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;';
  [['chauffeurs','🚛 Chauffeurs'],['responsables','👔 Responsables'],['identifier','🔍 Identifier']].forEach(([id,label]) => {
    const btn = document.createElement('button');
    btn.className = 'h-btn';
    btn.style.cssText = `flex:none;padding:8px 16px;border-radius:0;border:none;border-bottom:2px solid ${repView===id?'var(--accent)':'transparent'};color:${repView===id?'var(--accent)':'var(--text-muted)'};font-size:12px;`;
    btn.textContent = label;
    btn.onclick = () => { repView = id; renderRepertoire(); };
    tabBar.appendChild(btn);
  });
  container.appendChild(tabBar);

  if (repView === 'identifier') {
    if (typeof renderIdentifier === 'function') container.appendChild(renderIdentifier(stationId));
    return;
  }

  if (repView === 'responsables') {
    renderResponsablesView(container, stationId);
    return;
  }

  // Vue Chauffeurs
  const chauffeurs = sortByRole(loadChauffeurs(stationId), ROLES_CHAUFFEURS);
  container.appendChild(buildRepToolbar(stationId, 'chauffeur'));

  const listWrap = document.createElement('div');
  listWrap.style.cssText = 'flex:1;overflow:auto;padding:16px;';
  listWrap.appendChild(buildPersonGrid(chauffeurs, stationId, 'chauffeur'));
  container.appendChild(listWrap);

  const formZone = document.createElement('div');
  formZone.id = 'rep-form-zone';
  container.appendChild(formZone);
}

/* ── Vue Responsables ─────────────────────────────────────── */
function renderResponsablesView(container, stationId) {
  const responsables = sortByRole(loadResponsables(stationId), ROLES_RESPONSABLES);
  container.appendChild(buildRepToolbar(stationId, 'responsable'));

  const listWrap = document.createElement('div');
  listWrap.style.cssText = 'flex:1;overflow:auto;padding:16px;';
  listWrap.appendChild(buildPersonGrid(responsables, stationId, 'responsable'));
  container.appendChild(listWrap);

  const formZone = document.createElement('div');
  formZone.id = 'rep-form-zone';
  container.appendChild(formZone);
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildRepToolbar(stationId, type) {
  const bar = document.createElement('div');
  bar.className = 'rep-toolbar';
  const label = type === 'responsable' ? '+ Ajouter un responsable' : '+ Ajouter un chauffeur';
  bar.innerHTML = `
    <input class="rep-search" id="rep-search" placeholder="🔍 Rechercher par nom ou prénom..." value="${repSearchQuery}">
    <button class="rep-btn rep-btn-primary" id="rep-add-btn">${label}</button>
  `;
  bar.querySelector('#rep-search').addEventListener('input', e => {
    repSearchQuery = e.target.value;
    renderRepertoire();
  });
  bar.querySelector('#rep-add-btn').addEventListener('click', () => {
    openPersonForm(null, stationId, type);
  });
  return bar;
}

/* ── Grille de fiches ─────────────────────────────────────── */
function buildPersonGrid(list, stationId, type) {
  const q = repSearchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = list.filter(c => {
    const full = (c.prenom + ' ' + c.nom + ' ' + (c.role || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return full.includes(q);
  });

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-muted);text-align:center;margin-top:40px;font-size:14px;';
    empty.textContent = list.length ? 'Aucun résultat.' : (type === 'responsable' ? 'Aucun responsable. Cliquez sur "+ Ajouter un responsable".' : 'Aucun chauffeur. Cliquez sur "+ Ajouter un chauffeur".');
    return empty;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;padding:4px 0;';

  filtered.forEach(c => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:20px 22px;width:240px;display:flex;flex-direction:column;gap:8px;transition:border-color 0.18s,transform 0.18s;cursor:default;';
    card.onmouseenter = () => { card.style.borderColor = 'var(--accent)'; card.style.transform = 'translateY(-2px)'; };
    card.onmouseleave = () => { card.style.borderColor = 'var(--border)'; card.style.transform = ''; };

    const avatar = document.createElement('div');
    avatar.style.cssText = 'width:44px;height:44px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--accent);margin-bottom:4px;';
    avatar.textContent = (c.prenom?.[0] || '') + (c.nom?.[0] || '');

    const name = document.createElement('div');
    name.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);';
    name.textContent = c.prenom + ' ' + c.nom;

    const role = document.createElement('div');
    role.style.cssText = 'font-size:11px;color:var(--accent);background:var(--accent-dim);padding:3px 7px;border-radius:4px;align-self:flex-start;font-weight:600;';
    role.textContent = c.role || '—';

    const matricule = document.createElement('div');
    matricule.style.cssText = 'font-size:11px;color:var(--text-muted);';
    matricule.textContent = c.matricule ? '🏷 ' + c.matricule : '';

    const amazonLine = document.createElement('div');
    amazonLine.style.cssText = 'font-size:10px;font-family:monospace;color:var(--text-muted);';
    amazonLine.textContent = c.id_amazon ? '📦 ' + c.id_amazon : '';

    const telLine = document.createElement('div');
    telLine.style.cssText = 'font-size:10px;color:var(--text-muted);';
    telLine.textContent = c.telephone ? '📱 ' + c.telephone : '';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-top:6px;';

    const editBtn = document.createElement('button');
    editBtn.className = 'rep-btn rep-btn-edit';
    editBtn.textContent = '✏️ Modifier';
    editBtn.onclick = () => openPersonForm(c, stationId, type);

    const delBtn = document.createElement('button');
    delBtn.className = 'rep-btn rep-btn-delete';
    delBtn.textContent = '🗑';
    delBtn.onclick = () => deletePerson(c.id, stationId, type);

    actions.appendChild(editBtn);

    // Bouton envoyer mot de passe via WhatsApp
    if (c.telephone) {
      var waPassBtn = document.createElement('button');
      waPassBtn.className = 'h-btn';
      waPassBtn.style.cssText = 'font-size:10px;padding:3px 7px;background:#25d366;color:#fff;border:none;';
      waPassBtn.textContent = '🔑';
      waPassBtn.title = 'Envoyer identifiants WhatsApp';
      waPassBtn.onclick = function() {
        var tel = typeof formatWaTel === 'function' ? formatWaTel(c.telephone) : c.telephone.replace(/\D/g, '');
        var msg = 'Bonjour ' + c.prenom + ' !\n\nVoici tes identifiants pour te connecter à SunXP Pro :\n\n📧 Email : ' + (c.email || '—') + '\n\n📱 Lien de connexion : ' + window.location.origin + '\n\n🔑 Si c\'est ta première connexion ou si tu as oublié ton mot de passe, clique sur "Mot de passe oublié" sur la page de connexion.\n\nBonne journée !';
        navigator.clipboard.writeText(msg).catch(function(){});
        var a = document.createElement('a');
        a.href = 'whatsapp://send?phone=' + tel + '&text=' + encodeURIComponent(msg);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
      actions.appendChild(waPassBtn);
    }

    // Bouton SQL pour responsables
    if (type === 'responsable') {
      const sqlBtn = document.createElement('button');
      sqlBtn.className = 'h-btn';
      sqlBtn.style.cssText = 'font-size:10px;padding:3px 7px;color:#10b981;border-color:#10b981;';
      sqlBtn.textContent = '🗄️ SQL';
      sqlBtn.title = 'Copier le SQL de création de compte Supabase';
      sqlBtn.onclick = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        let pwd = '';
        for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
        const sql = `-- Créer le compte Auth dans Supabase Dashboard > Authentication > Users\n-- Email : ${c.email || 'email@exemple.com'}\n-- Mot de passe : ${pwd}\n\n-- Puis exécuter ce SQL pour créer le profil :\nINSERT INTO user_profiles (id, role, role_specifique, station_id, nom, prenom, statut)\nVALUES (\n  'REMPLACER_PAR_UUID_AUTH',\n  'responsable',\n  '${c.role || 'Dispatcher'}',\n  '${stationId}',\n  '${c.nom || ''}',\n  '${c.prenom || ''}',\n  'actif'\n);\n\n-- Remplacer REMPLACER_PAR_UUID_AUTH par l'UUID généré dans Authentication > Users`;
        navigator.clipboard.writeText(sql).then(() => {
          sqlBtn.textContent = '✅ Copié !';
          sqlBtn.style.color = '#4ade80';
          setTimeout(() => { sqlBtn.textContent = '🗄️ SQL'; sqlBtn.style.color = '#10b981'; }, 2000);
        }).catch(() => {
          const ta = document.createElement('textarea'); ta.value = sql; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
          sqlBtn.textContent = '✅ Copié !'; setTimeout(() => { sqlBtn.textContent = '🗄️ SQL'; }, 2000);
        });
      };
      actions.appendChild(sqlBtn);
    }

    actions.appendChild(delBtn);

    card.appendChild(avatar);
    card.appendChild(name);
    card.appendChild(role);
    if (c.matricule) card.appendChild(matricule);
    if (c.id_amazon) card.appendChild(amazonLine);
    if (c.telephone) card.appendChild(telLine);
    card.appendChild(actions);
    grid.appendChild(card);
  });

  return grid;
}

/* ── Formulaire ───────────────────────────────────────────── */
function openPersonForm(person, stationId, type) {
  const zone = document.getElementById('rep-form-zone');
  if (!zone) return;
  showRepertoireForm(
    zone, person, type,
    (saved) => {
      const isEdit = !!person;
      if (type === 'responsable') {
        const list = loadResponsables(stationId);
        const idx = list.findIndex(c => c.id === saved.id);
        if (idx >= 0) list[idx] = saved; else list.push(saved);
        saveResponsables(stationId, list);
      } else {
        const list = loadChauffeurs(stationId);
        const idx = list.findIndex(c => c.id === saved.id);
        if (idx >= 0) list[idx] = saved; else list.push(saved);
        saveChauffeurs(stationId, list);
      }
      // Log activité
      if (window.logActivity) {
        window.logActivity(isEdit ? 'repertoire_modif' : 'repertoire_ajout', { type, nom: saved.prenom + ' ' + saved.nom, station: stationId });
      }
      zone.innerHTML = '';
      renderRepertoire();
    },
    () => { zone.innerHTML = ''; }
  );
}

function deletePerson(id, stationId, type) {
  const label = type === 'responsable' ? 'ce responsable' : 'ce chauffeur';
  showConfirmModal('Supprimer ' + label + ' ?', () => {
    let deletedName = '';
    if (type === 'responsable') {
      const fullList = loadResponsables(stationId);
      const person = fullList.find(c => c.id === id);
      if (person) deletedName = person.prenom + ' ' + person.nom;
      const list = fullList.filter(c => c.id !== id);
      saveResponsables(stationId, list);
    } else {
      const fullList = loadChauffeurs(stationId);
      const person = fullList.find(c => c.id === id);
      if (person) deletedName = person.prenom + ' ' + person.nom;
      const list = fullList.filter(c => c.id !== id);
      saveChauffeurs(stationId, list);
    }
    // Log activité
    if (window.logActivity) {
      window.logActivity('repertoire_suppression', { type, nom: deletedName, station: stationId });
    }
    renderRepertoire();
  });
}

/* ── Utilitaires ──────────────────────────────────────────── */
function waNumber(tel) { return (tel || '').replace(/\D/g, ''); }
