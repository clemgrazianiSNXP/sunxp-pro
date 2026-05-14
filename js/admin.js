/* js/admin.js — Panneau d'administration (SunXP Pro) */
console.log('admin.js chargé');

const ADMIN_EMAILS = ['music.music.music@hotmail.fr'];
const ADMIN_TABS = ['monitoring', 'sauvegarde', 'utilisateurs', 'logs', 'maintenance'];

let adminTab = 'monitoring';

/**
 * Vérifie si l'utilisateur connecté est un administrateur.
 * Conditions : rôle "responsable" + email dans ADMIN_EMAILS.
 */
function isAdmin() {
  if (!currentUser || !currentProfile) return false;
  if (currentProfile.role !== 'responsable') return false;
  return ADMIN_EMAILS.includes(currentUser.email);
}

/**
 * Initialise le panneau admin.
 * Vérifie l'accès et rend le contenu ou refuse l'affichage.
 */
function initAdmin() {
  const container = document.getElementById('module-admin');
  if (!container) return;

  if (!isAdmin()) {
    container.innerHTML = '<p style="padding:24px;color:var(--text-muted);">⛔ Accès refusé. Vous n\'avez pas les droits administrateur.</p>';
    // Rediriger vers l'accueil
    if (typeof showModule === 'function') showModule('accueil');
    if (typeof dispatchModuleInit === 'function') dispatchModuleInit('accueil');
    return;
  }

  renderAdmin();
}

/**
 * Rendu principal du panneau admin avec navigation par sous-onglets.
 */
function renderAdmin() {
  const container = document.getElementById('module-admin');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  // Barre de sous-onglets
  const toolbar = document.createElement('div');
  toolbar.className = 'h-toolbar';
  toolbar.innerHTML = `<div class="h-toolbar-left">
    <button class="h-btn rh-tab-btn ${adminTab==='monitoring'?'rh-tab-active':''}" data-admtab="monitoring">📊 Monitoring</button>
    <button class="h-btn rh-tab-btn ${adminTab==='sauvegarde'?'rh-tab-active':''}" data-admtab="sauvegarde">💾 Sauvegarde</button>
    <button class="h-btn rh-tab-btn ${adminTab==='utilisateurs'?'rh-tab-active':''}" data-admtab="utilisateurs">👥 Utilisateurs</button>
    <button class="h-btn rh-tab-btn ${adminTab==='logs'?'rh-tab-active':''}" data-admtab="logs">📋 Logs</button>
    <button class="h-btn rh-tab-btn ${adminTab==='maintenance'?'rh-tab-active':''}" data-admtab="maintenance">🔧 Maintenance</button>
  </div><div class="h-toolbar-center"></div><div class="h-toolbar-right"></div>`;
  toolbar.querySelectorAll('.rh-tab-btn').forEach(b => {
    b.onclick = () => { adminTab = b.dataset.admtab; renderAdmin(); };
  });
  container.appendChild(toolbar);

  // Zone de contenu du sous-onglet actif
  const content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;padding:16px;';

  if (adminTab === 'monitoring') {
    content.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:40px;">📊 Monitoring — contenu à venir</p>';
  } else if (adminTab === 'sauvegarde') {
    content.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:40px;">💾 Sauvegarde — contenu à venir</p>';
  } else if (adminTab === 'utilisateurs') {
    content.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:40px;">👥 Utilisateurs — contenu à venir</p>';
  } else if (adminTab === 'logs') {
    content.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:40px;">📋 Logs — contenu à venir</p>';
  } else if (adminTab === 'maintenance') {
    content.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:40px;">🔧 Maintenance — contenu à venir</p>';
  }

  container.appendChild(content);
}

/**
 * Injecte dynamiquement l'onglet "Admin" dans la sidebar si l'utilisateur est admin.
 * Appelé après vérification de l'authentification.
 */
function injectAdminTab() {
  if (!isAdmin()) return;

  const navTabs = document.querySelector('.nav-tabs');
  if (!navTabs) return;

  // Ne pas injecter si déjà présent
  if (navTabs.querySelector('[data-module="admin"]')) return;

  const li = document.createElement('li');
  li.className = 'nav-tab';
  li.dataset.module = 'admin';
  li.innerHTML = '<span class="icon">⚙️</span><span class="label">Admin</span>';

  li.addEventListener('click', () => {
    if (typeof showModule === 'function') showModule('admin');
    if (typeof dispatchModuleInit === 'function') dispatchModuleInit('admin');
  });

  navTabs.appendChild(li);
}

// Injection de l'onglet admin après le chargement du DOM et l'authentification
document.addEventListener('DOMContentLoaded', () => {
  // Attendre que l'auth soit terminée avant d'injecter l'onglet
  setTimeout(() => {
    injectAdminTab();
  }, 2000);
});

// Exports globaux
window.initAdmin = initAdmin;
window.isAdmin = isAdmin;
