/* js/admin.js — Panneau d'administration (SunXP Pro) */
console.log('admin.js chargé');

const ADMIN_EMAILS = ['amazon.grazianisnxp@gmail.com'];
const ADMIN_TABS = ['monitoring', 'sauvegarde', 'utilisateurs', 'logs', 'maintenance'];

let adminTab = 'monitoring';

/**
 * Vérifie si l'utilisateur connecté est un administrateur.
 */
function isAdmin() {
  if (!currentUser) return false;
  return ADMIN_EMAILS.includes(currentUser.email);
}

/**
 * Initialise le panneau admin.
 */
function initAdmin() {
  const container = document.getElementById('module-admin');
  if (!container) return;

  if (!isAdmin()) {
    container.innerHTML = '<p style="padding:24px;color:var(--text-muted);">⛔ Accès refusé. Vous n\'avez pas les droits administrateur.</p>';
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
 * Injecte dynamiquement la card "Admin" sur l'écran de choix de rôle.
 */
function injectAdminCard() {
  if (!isAdmin()) return;
  const roleScreen = document.getElementById('role-screen');
  if (!roleScreen) return;
  if (document.getElementById('role-admin')) return;
  const grid = roleScreen.querySelector('div[style*="display:flex"]');
  if (!grid) return;

  const card = document.createElement('div');
  card.className = 'station-card';
  card.id = 'role-admin';
  card.style.cursor = 'pointer';
  card.innerHTML = `
    <div class="station-card-name">⚙️</div>
    <div class="station-card-name">Admin</div>
    <button class="btn-acceder">Accéder</button>
  `;
  card.querySelector('.btn-acceder').addEventListener('click', () => {
    roleScreen.hidden = true;
    openAdminPanel();
  });
  grid.appendChild(card);
}

/**
 * Ouvre le panneau admin en plein écran.
 */
function openAdminPanel() {
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) appLayout.style.display = 'none';
  const stationScreen = document.getElementById('station-screen');
  if (stationScreen) { stationScreen.hidden = true; stationScreen.style.display = 'none'; }

  let adminScreen = document.getElementById('admin-screen');
  if (!adminScreen) {
    adminScreen = document.createElement('div');
    adminScreen.id = 'admin-screen';
    adminScreen.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg-primary);display:flex;flex-direction:column;overflow:hidden;';
    document.body.appendChild(adminScreen);
  }
  adminScreen.hidden = false;
  adminScreen.style.display = 'flex';
  adminScreen.innerHTML = '';

  // Topbar
  const topbar = document.createElement('div');
  topbar.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 20px;background:var(--bg-sidebar);border-bottom:1px solid var(--border);flex-shrink:0;';
  topbar.innerHTML = `<button id="admin-back-btn" class="h-btn" style="font-size:14px;">← Retour</button><span style="font-size:16px;font-weight:700;color:var(--text-primary);">⚙️ Administration</span>`;
  topbar.querySelector('#admin-back-btn').onclick = () => {
    adminScreen.hidden = true;
    adminScreen.style.display = 'none';
    document.getElementById('role-screen').hidden = false;
  };
  adminScreen.appendChild(topbar);

  // Sous-onglets
  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;gap:4px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;flex-wrap:wrap;';
  [['monitoring','📊 Monitoring'],['sauvegarde','💾 Sauvegarde'],['utilisateurs','👥 Utilisateurs'],['logs','📋 Logs'],['maintenance','🔧 Maintenance']].forEach(([id, label]) => {
    const btn = document.createElement('button');
    btn.className = 'h-btn';
    btn.style.cssText = `padding:6px 12px;font-size:11px;border-radius:6px;${adminTab === id ? 'background:var(--accent);color:#fff;' : ''}`;
    btn.textContent = label;
    btn.onclick = () => { adminTab = id; openAdminPanel(); };
    toolbar.appendChild(btn);
  });
  adminScreen.appendChild(toolbar);

  // Contenu
  const content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;padding:20px;';

  if (adminTab === 'monitoring') { renderAdminMonitoring(content); }
  else if (adminTab === 'sauvegarde') { renderAdminSauvegarde(content); }
  else if (adminTab === 'utilisateurs') { renderAdminUtilisateurs(content); }
  else if (adminTab === 'logs') { renderAdminLogs(content); }
  else if (adminTab === 'maintenance') { renderAdminMaintenance(content); }

  adminScreen.appendChild(content);
}

// Injection de la card admin après le chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  let attempts = 0;
  const tryInject = () => {
    attempts++;
    if (isAdmin()) { injectAdminCard(); return; }
    if (attempts < 10) setTimeout(tryInject, 1000);
  };
  setTimeout(tryInject, 1500);
});

// Exports globaux
window.initAdmin = initAdmin;
window.isAdmin = isAdmin;

/* ── Vérification mode maintenance (appelé depuis auth.js) ── */
window.checkMaintenanceMode = async function() {
  if (!sb()) return;
  if (isAdmin()) return;
  try {
    const { data } = await sb().from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (data && data.value && data.value.active) {
      const msg = data.value.message || 'Maintenance en cours';
      const screen = document.createElement('div');
      screen.id = 'maintenance-screen';
      screen.style.cssText = 'position:fixed;inset:0;z-index:99998;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:24px;text-align:center;';
      screen.innerHTML = `<div style="font-size:48px;">🔧</div><h1 style="font-size:20px;color:var(--text-primary);margin:0;">Maintenance en cours</h1><p style="font-size:14px;color:var(--text-muted);max-width:300px;">${msg}</p><p style="font-size:11px;color:var(--text-muted);">Veuillez réessayer plus tard.</p>`;
      document.body.appendChild(screen);
    }
  } catch (_) {}
};

/* ── Activity Logger (global) ─────────────────────────────── */
window.logActivity = async function(action, metadata) {
  if (!sb()) return;
  try {
    await sb().from('activity_logs').insert({
      user_id: currentUser?.id || null,
      email: currentUser?.email || 'unknown',
      action: action,
      station_id: (typeof getActiveStationId === 'function' ? getActiveStationId() : null) || (window.getActiveStationId ? window.getActiveStationId() : null),
      metadata: metadata || {}
    });
  } catch (_) {}
};
