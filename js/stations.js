/* js/stations.js — Gestion de la sélection de station (SunXP Pro) */

/* ── État interne ─────────────────────────────────────────── */
let stations = [];
let activeStation = null;

/* ── Interface publique ───────────────────────────────────── */
window.getActiveStationId = () => activeStation ? activeStation.id : (loadActiveIdFromStorage() || null);
window.getActiveStation   = () => activeStation;

/* ── Références DOM ───────────────────────────────────────── */
const getEl = id => document.getElementById(id);

/* ── Persistance localStorage ─────────────────────────────── */
const LS_STATIONS = 'stations';
const LS_ACTIVE   = 'stationActive';

function saveStationsToStorage(list) {
  try { localStorage.setItem(LS_STATIONS, JSON.stringify(list)); } catch (e) {}
  // Sync chaque station vers Supabase
  if (typeof dbSaveStation === 'function') {
    list.forEach(s => dbSaveStation(s));
  }
}

function loadStationsFromStorage() {
  try {
    const raw = localStorage.getItem(LS_STATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveActiveToStorage(id) {
  try { localStorage.setItem(LS_ACTIVE, id); } catch (e) {}
}

function clearActiveFromStorage() {
  try { localStorage.removeItem(LS_ACTIVE); } catch (e) {}
}

function loadActiveIdFromStorage() {
  try { return localStorage.getItem(LS_ACTIVE) || null; } catch (e) { return null; }
}

/* ── Chargement des stations ──────────────────────────────── */
async function loadStations() {
  /* 1. Essayer localStorage d'abord */
  const cached = loadStationsFromStorage();
  if (cached && Array.isArray(cached)) {
    stations = cached;
  } else {
    /* 2. Fallback : charger depuis data/stations.json */
    try {
      const res = await fetch('data/stations.json');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      stations = Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('stations.js: impossible de charger stations.json', e);
      stations = [];
    }
    /* Sauvegarder immédiatement dans localStorage */
    saveStationsToStorage(stations);
  }

  renderStationCards(stations);

  /* 3. Restaurer la station active si elle était sélectionnée */
  const savedId = loadActiveIdFromStorage();
  if (savedId) {
    const found = stations.find(s => s.id === savedId);
    if (found) {
      setActiveStation(found, /* skipSave */ true);
      return;
    }
  }

  showStationScreen();
}

/* ── Affichage Station_Screen / App_Layout ────────────────── */
function showStationScreen() {
  const screen = getEl('station-screen');
  const app    = document.querySelector('.app-layout');
  screen.style.display = '';
  screen.hidden = false;
  app.hidden = true;
  app.style.display = 'none';
}

function showAppLayout() {
  const screen = getEl('station-screen');
  const app    = document.querySelector('.app-layout');
  screen.style.display = 'none';
  screen.hidden = true;
  app.hidden = false;
  app.style.display = 'flex';
}

/* ── Rendu des cards ──────────────────────────────────────── */
function renderStationCards(list) {
  const grid  = getEl('station-cards-grid');
  const empty = getEl('station-empty-msg');
  grid.innerHTML = '';

  if (!list.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.forEach(station => {
    const card = document.createElement('div');
    card.className = 'station-card';
    card.innerHTML = `
      <div class="station-card-name">${escHtml(station.nom)}</div>
      <div class="station-card-city">${escHtml(station.ville)}</div>
      <button class="btn-acceder" data-station-id="${escHtml(station.id)}">Accéder</button>
    `;
    card.querySelector('.btn-acceder')
        .addEventListener('click', () => setActiveStation(station));
    grid.appendChild(card);
  });
}

/* ── Sélection d'une station ──────────────────────────────── */
function setActiveStation(station, skipSave) {
  activeStation = station;
  if (!skipSave) saveActiveToStorage(station.id);
  updateNavbar(station);
  showAppLayout();
  if (typeof showToolbar === 'function') showToolbar(true);
  // Preload data from Supabase for this station
  if (typeof preloadStationData === 'function') {
    preloadStationData(station.id).then(() => {
      if (typeof initNavigation === 'function') initNavigation();
    });
  } else {
    if (typeof initNavigation === 'function') initNavigation();
  }
}

function updateNavbar(station) {
  const header = document.querySelector('.sidebar-header');
  header.innerHTML = `
    <span id="navbar-station-name">${escHtml(station.nom)}</span>
    <span style="font-size:11px;color:var(--text-muted)">${escHtml(station.ville)}</span>
    <button id="btn-change-station">⇄ Changer de station</button>
  `;
  getEl('btn-change-station').addEventListener('click', clearActiveStation);
}

/* ── Changement de station ────────────────────────────────── */
function clearActiveStation() {
  activeStation = null;
  clearActiveFromStorage();
  document.querySelector('.sidebar-header').innerHTML = 'SunXP Pro';
  if (typeof closeMenuPanel === 'function') closeMenuPanel();
  if (typeof showToolbar === 'function') showToolbar(false);
  showStationScreen();
}

/* ── Formulaire d'ajout ───────────────────────────────────── */
function showStationForm() {
  getEl('station-form-container').hidden = false;
  getEl('btn-add-station').hidden = true;
  getEl('input-station-nom').focus();
}

function hideStationForm() {
  getEl('station-form-container').hidden = true;
  getEl('btn-add-station').hidden = false;
  getEl('station-form').reset();
  const err = getEl('station-form-error');
  err.hidden = true;
  err.textContent = '';
}

function handleFormSubmit(e) {
  e.preventDefault();
  const nom   = getEl('input-station-nom').value.trim();
  const ville = getEl('input-station-ville').value.trim();
  const err   = getEl('station-form-error');

  if (!nom || !ville) {
    err.textContent = 'Le nom et la ville sont obligatoires.';
    err.hidden = false;
    return;
  }

  const id = nom.toUpperCase().replace(/\s+/g, '_');
  if (stations.find(s => s.id === id)) {
    err.textContent = `Une station avec l'identifiant "${id}" existe déjà.`;
    err.hidden = false;
    return;
  }

  saveStation({ id, nom, ville });
  hideStationForm();
}

/* ── Persistance station ──────────────────────────────────── */
function saveStation(station) {
  stations.push(station);
  saveStationsToStorage(stations);
  renderStationCards(stations);
}

/* ── Utilitaire ───────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Gestion des stations (panneau hamburger) ─────────────── */
function renderStationsManager() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;';
  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">🏢 Gérer les stations</h3>';

  // Liste des stations
  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  stations.forEach(station => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg-tab-active);border:1px solid var(--border);border-radius:6px;';
    const isActive = activeStation && activeStation.id === station.id;
    row.innerHTML = `
      <div>
        <div style="font-weight:600;font-size:13px;${isActive ? 'color:var(--accent);' : ''}">${escHtml(station.nom)} ${isActive ? '✓' : ''}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escHtml(station.ville)}</div>
      </div>`;
    const delBtn = document.createElement('button');
    delBtn.className = 'h-btn';
    delBtn.style.cssText = 'font-size:10px;padding:3px 8px;color:#f87171;border-color:#f87171;';
    delBtn.textContent = '🗑 Supprimer';
    delBtn.onclick = () => {
      showConfirmModal('Supprimer la station ' + station.nom + ' ? Toutes les données associées seront perdues.', () => {
      // Supprimer les données localStorage de cette station
      const prefix = station.id;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(prefix + '-') || k === prefix + '-repertoire') keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      // Supprimer de la liste
      stations = stations.filter(s => s.id !== station.id);
      saveStationsToStorage(stations);
      // Si c'était la station active, revenir à l'écran de sélection
      if (isActive) {
        clearActiveStation();
        closeMenuPanel();
        // Masquer l'app et montrer l'écran station
        document.querySelector('.app-layout').hidden = true;
        document.querySelector('.app-layout').style.display = 'none';
        getEl('station-screen').hidden = false;
        getEl('station-screen').style.display = '';
        renderStationCards(stations);
      }
      // Rafraîchir le panneau
      if (typeof setMenuTab === 'function') setMenuTab('stations-mgr');
      });
    };
    row.appendChild(delBtn);
    list.appendChild(row);
  });

  if (!stations.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Aucune station.</p>';
  }
  wrap.appendChild(list);

  // Formulaire d'ajout
  const addSection = document.createElement('div');
  addSection.style.cssText = 'border-top:1px solid var(--border);padding-top:12px;margin-top:4px;';
  addSection.innerHTML = '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">+ Ajouter une station</div>';
  const form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  form.innerHTML = `
    <input type="text" id="mgr-station-nom" class="rep-input" placeholder="Nom (ex: DWP3)" style="padding:7px;">
    <input type="text" id="mgr-station-ville" class="rep-input" placeholder="Ville (ex: Nice)" style="padding:7px;">
    <button class="h-btn" id="mgr-station-add" style="background:var(--accent);color:#fff;border-color:var(--accent);padding:7px;">Créer</button>
    <p id="mgr-station-error" style="color:#f87171;font-size:11px;display:none;"></p>`;
  addSection.appendChild(form);
  wrap.appendChild(addSection);

  // Bind add
  setTimeout(() => {
    const addBtn = document.getElementById('mgr-station-add');
    if (addBtn) addBtn.onclick = () => {
      const nom = document.getElementById('mgr-station-nom').value.trim();
      const ville = document.getElementById('mgr-station-ville').value.trim();
      const err = document.getElementById('mgr-station-error');
      if (!nom || !ville) { err.textContent = 'Nom et ville obligatoires.'; err.style.display = ''; return; }
      const id = nom.toUpperCase().replace(/\s+/g, '_');
      if (stations.find(s => s.id === id)) { err.textContent = 'Cette station existe déjà.'; err.style.display = ''; return; }
      stations.push({ id, nom, ville });
      saveStationsToStorage(stations);
      renderStationCards(stations);
      if (typeof setMenuTab === 'function') setMenuTab('stations-mgr');
    };
  }, 0);

  return wrap;
}

/* ── Login responsable ─────────────────────────────────────── */
const RESPONSABLE_PWD = 'Sunxppro2026&';

function showResponsableLogin(roleScreen, stationScreen) {
  roleScreen.hidden = true;
  const loginScreen = document.getElementById('responsable-login');
  loginScreen.hidden = false;

  const pwdInput = document.getElementById('responsable-pwd-input');
  const errEl = document.getElementById('responsable-login-error');
  pwdInput.value = '';
  errEl.hidden = true;
  pwdInput.focus();

  const doLogin = () => {
    const pwd = pwdInput.value;
    if (pwd === RESPONSABLE_PWD) {
      errEl.hidden = true;
      loginScreen.hidden = true;
      localStorage.setItem('sunxp_role', 'responsable');
      clearActiveFromStorage();
      activeStation = null;
      stationScreen.hidden = false;
      stationScreen.style.display = '';
      loadStations();
    } else {
      errEl.textContent = 'Mot de passe incorrect.';
      errEl.hidden = false;
      pwdInput.value = '';
      pwdInput.focus();
    }
  };

  document.getElementById('responsable-login-btn').onclick = doLogin;
  pwdInput.onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  document.getElementById('responsable-back-btn').onclick = () => {
    loginScreen.hidden = true;
    roleScreen.hidden = false;
  };
}

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Écran de choix de rôle
  const roleScreen = document.getElementById('role-screen');
  const stationScreen = document.getElementById('station-screen');
  const chauffeurLogin = document.getElementById('chauffeur-login');
  const chauffeurPortal = document.getElementById('chauffeur-portal');

  // Masquer tout sauf le rôle
  stationScreen.hidden = true;
  if (chauffeurLogin) chauffeurLogin.hidden = true;
  if (chauffeurPortal) chauffeurPortal.hidden = true;

  // Attacher les listeners de rôle TOUJOURS
  document.getElementById('role-responsable').querySelector('.btn-acceder').addEventListener('click', () => {
    localStorage.setItem('sunxp_role', 'responsable');
    clearActiveFromStorage();
    activeStation = null;
    roleScreen.hidden = true;
    stationScreen.hidden = false;
    stationScreen.style.display = '';
    loadStations();
  });
  document.getElementById('role-chauffeur').querySelector('.btn-acceder').addEventListener('click', () => {
    roleScreen.hidden = true;
    chauffeurLogin.hidden = false;
  });
  document.getElementById('chauffeur-back-btn')?.addEventListener('click', () => {
    chauffeurLogin.hidden = true;
    roleScreen.hidden = false;
  });
  document.getElementById('chauffeur-login-btn')?.addEventListener('click', handleChauffeurLogin);
  document.getElementById('chauffeur-id-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleChauffeurLogin();
  });

  // Vérifier si une session est active
  const savedRole = localStorage.getItem('sunxp_role');
  const savedActiveId = loadActiveIdFromStorage();

  // Attacher les listeners station TOUJOURS (avant les return)
  getEl('btn-back-to-role')?.addEventListener('click', () => {
    localStorage.removeItem('sunxp_role');
    if (typeof closeMenuPanel === 'function') closeMenuPanel();
    if (typeof showToolbar === 'function') showToolbar(false);
    document.getElementById('station-screen').hidden = true;
    document.getElementById('station-screen').style.display = 'none';
    document.getElementById('role-screen').hidden = false;
  });

  if (false && savedRole === 'responsable' && savedActiveId) {
    roleScreen.hidden = true;
    loadStations();
    return;
  }
  if (false && savedRole === 'chauffeur') {
    const savedChauffeurId = localStorage.getItem('sunxp_chauffeur_id');
    const savedChauffeurStation = localStorage.getItem('sunxp_chauffeur_station');
    if (savedChauffeurId && savedChauffeurStation) {
      roleScreen.hidden = true;
      loginChauffeur(savedChauffeurId, savedChauffeurStation);
      return;
    }
  }
});

function handleChauffeurLogin() {
  const idInput = document.getElementById('chauffeur-id-input').value.replace(/\s/g,'').toUpperCase();
  const errEl = document.getElementById('chauffeur-login-error');
  if (!idInput) { errEl.textContent = 'Veuillez entrer votre ID Amazon.'; errEl.hidden = false; return; }

  // Essayer Supabase d'abord
  if (typeof sb === 'function' && sb()) {
    sb().from('chauffeurs').select('*').ilike('id_amazon', idInput).then(({ data, error }) => {
      if (!error && data && data.length) {
        const found = data[0];
        const stationId = found.station_id;
        // Stocker dans localStorage pour le portail
        localStorage.setItem(stationId + '-repertoire', JSON.stringify(
          data.filter(c => c.station_id === stationId).map(c => ({ nom: c.nom, prenom: c.prenom, telephone: c.telephone, id_amazon: c.id_amazon }))
        ));
        localStorage.setItem('sunxp_role', 'chauffeur');
        localStorage.setItem('sunxp_chauffeur_id', idInput);
        localStorage.setItem('sunxp_chauffeur_station', stationId);
        loginChauffeur(idInput, stationId);
        return;
      }
      // Fallback localStorage
      fallbackLocalLogin(idInput, errEl);
    }).catch(() => fallbackLocalLogin(idInput, errEl));
    return;
  }
  fallbackLocalLogin(idInput, errEl);
}

function fallbackLocalLogin(idInput, errEl) {
  const stationsRaw = localStorage.getItem('stations');
  let stationsList = [];
  try { stationsList = JSON.parse(stationsRaw) || []; } catch(_) {}
  if (!stationsList.length) {
    fetch('data/stations.json').then(r=>r.json()).then(data => {
      searchChauffeurInStations(data, idInput, errEl);
    }).catch(() => { errEl.textContent = 'Impossible de charger les stations.'; errEl.hidden = false; });
    return;
  }
  searchChauffeurInStations(stationsList, idInput, errEl);
}

function searchChauffeurInStations(stationsList, idInput, errEl) {
  const cleanId = id => String(id||'').replace(/\s/g,'').toUpperCase();
  for (const station of stationsList) {
    const sid = station.id || station.nom;
    try {
      const raw = localStorage.getItem(sid + '-repertoire');
      if (!raw) continue;
      const list = JSON.parse(raw);
      const found = list.find(c =>
        cleanId(c.id_amazon) === cleanId(idInput) ||
        cleanId(c.idAmazon) === cleanId(idInput)
      );
      if (found) {
        localStorage.setItem('sunxp_role', 'chauffeur');
        localStorage.setItem('sunxp_chauffeur_id', idInput);
        localStorage.setItem('sunxp_chauffeur_station', sid);
        loginChauffeur(idInput, sid);
        return;
      }
    } catch(_) {}
  }
  errEl.textContent = 'ID Amazon non trouvé dans aucune station.';
  errEl.hidden = false;
}

function loginChauffeur(idAmazon, stationId) {
  const cleanId = id => String(id||'').replace(/\s/g,'').toUpperCase();

  // Essayer de charger depuis Supabase si localStorage vide
  const tryLogin = (list) => {
    const chauffeur = list.find(c => cleanId(c.id_amazon) === cleanId(idAmazon) || cleanId(c.idAmazon) === cleanId(idAmazon));
    if (!chauffeur) { document.getElementById('role-screen').hidden = false; return; }

    document.getElementById('role-screen').hidden = true;
    document.getElementById('chauffeur-login').hidden = true;
    document.getElementById('station-screen').hidden = true;
    document.getElementById('station-screen').style.display = 'none';
    document.querySelector('.app-layout').hidden = true;
    document.querySelector('.app-layout').style.display = 'none';

    const portal = document.getElementById('chauffeur-portal');
    portal.hidden = false;

    window.getActiveStationId = () => stationId;
    window.getActiveStation = () => ({ id: stationId });
    if (typeof showToolbar === 'function') showToolbar(true);

    // Pré-charger les données depuis Supabase avant d'afficher le portail
    preloadStationData(stationId).then(() => {
      initChauffeurPortal(chauffeur, stationId);
    });
  };

  try {
    const raw = localStorage.getItem(stationId + '-repertoire');
    if (raw) {
      tryLogin(JSON.parse(raw));
      return;
    }
  } catch (_) {}

  // Fallback Supabase
  if (typeof sb === 'function' && sb()) {
    sb().from('chauffeurs').select('*').eq('station_id', stationId).then(({ data }) => {
      if (data && data.length) {
        const list = data.map(c => ({ nom: c.nom, prenom: c.prenom, telephone: c.telephone, id_amazon: c.id_amazon }));
        localStorage.setItem(stationId + '-repertoire', JSON.stringify(list));
        tryLogin(list);
      } else {
        document.getElementById('role-screen').hidden = false;
      }
    }).catch(() => { document.getElementById('role-screen').hidden = false; });
  } else {
    document.getElementById('role-screen').hidden = false;
  }
}
