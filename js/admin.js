/* js/admin.js — Panneau d'administration (SunXP Pro) */

const ADMIN_EMAILS = ['amazon.grazianisnxp@gmail.com'];
const ADMIN_TABS = ['monitoring', 'sauvegarde', 'utilisateurs', 'logs', 'maintenance', 'notifications'];

let adminTab = 'monitoring';

/**
 * Vérifie si l'utilisateur connecté est un administrateur.
 */
function isAdmin() {
  if (!currentUser) return false;
  return ADMIN_EMAILS.includes(currentUser.email);
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
    adminScreen.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;overflow:hidden;';
    document.body.appendChild(adminScreen);
  }
  adminScreen.hidden = false;
  adminScreen.style.display = 'flex';
  adminScreen.innerHTML = '';

  // Topbar
  const topbar = document.createElement('div');
  topbar.className = 'adm-topbar';
  topbar.innerHTML = `<button class="adm-btn" id="admin-back-btn">← Retour</button><span class="adm-topbar-title"><span class="adm-pulse">⚙️</span> Administration</span><button class="adm-btn" id="admin-debug-btn" style="margin-left:auto;margin-right:8px;color:#00ff88;border-color:#00ff88;font-size:10px;">🐛 Debug</button><span class="adm-topbar-email">${currentUser?.email || ''}</span>`;
  topbar.querySelector('#admin-back-btn').onclick = () => {
    adminScreen.hidden = true;
    adminScreen.style.display = 'none';
    document.getElementById('role-screen').hidden = false;
  };
  topbar.querySelector('#admin-debug-btn').onclick = () => toggleDebugPanel();
  adminScreen.appendChild(topbar);

  // Sous-onglets
  const toolbar = document.createElement('div');
  toolbar.className = 'adm-tabs';
  [['monitoring','📊 Monitoring'],['sauvegarde','💾 Sauvegarde'],['utilisateurs','👥 Utilisateurs'],['logs','📋 Logs'],['maintenance','🔧 Maintenance'],['notifications','📢 Notifs']].forEach(([id, label]) => {
    const btn = document.createElement('button');
    btn.className = 'adm-tab' + (adminTab === id ? ' adm-tab-active' : '');
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
  else if (adminTab === 'notifications') { if (typeof renderAdminNotifications === 'function') renderAdminNotifications(content); }

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
window.isAdmin = isAdmin;

/* ── Vérification mode maintenance (appelé depuis auth.js) ── */
window.checkMaintenanceMode = async function() {
  if (!sb()) return;
  if (isAdmin()) return;
  try {
    // Vérifier maintenance manuelle
    const { data } = await sb().from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (data && data.value && data.value.active) {
      const msg = data.value.message || 'Maintenance en cours';
      showMaintenanceScreen(msg);
      return;
    }
    // Vérifier maintenance planifiée
    const { data: schedData } = await sb().from('app_settings').select('value').eq('key', 'maintenance_scheduled').maybeSingle();
    if (schedData && schedData.value && schedData.value.scheduled && schedData.value.start && schedData.value.end) {
      const now = new Date();
      const start = new Date(schedData.value.start);
      const end = new Date(schedData.value.end);
      if (now >= start && now <= end) {
        const msg = schedData.value.message || 'Maintenance planifiée en cours';
        showMaintenanceScreen(msg);
        return;
      }
    }
  } catch (_) {}
};

function showMaintenanceScreen(msg) {
  const screen = document.createElement('div');
  screen.id = 'maintenance-screen';
  screen.style.cssText = 'position:fixed;inset:0;z-index:99998;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:24px;text-align:center;';
  screen.innerHTML = `<div style="font-size:48px;">🔧</div><h1 style="font-size:20px;color:var(--text-primary);margin:0;">Maintenance en cours</h1><p style="font-size:14px;color:var(--text-muted);max-width:300px;">${msg}</p><p style="font-size:11px;color:var(--text-muted);">Veuillez réessayer plus tard.</p>`;
  document.body.appendChild(screen);
}

/* ── Debug Console Panel ───────────────────────────────────── */
let _debugPanelOpen = false;
let _debugLogs = [];
let _origLog, _origWarn, _origError;

function toggleDebugPanel() {
  if (!isAdmin()) return;
  _debugPanelOpen = !_debugPanelOpen;
  let panel = document.getElementById('admin-debug-panel');

  if (!_debugPanelOpen) {
    if (panel) panel.style.display = 'none';
    return;
  }

  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'admin-debug-panel';
    panel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:220px;z-index:99999;background:#050810;border-top:2px solid #00d4ff;display:flex;flex-direction:column;font-family:"Courier New",monospace;font-size:11px;';
    panel.innerHTML = `<div style="display:flex;align-items:center;padding:4px 12px;gap:8px;flex-shrink:0;border-bottom:1px solid #1e2d3d;"><span style="color:#00d4ff;font-weight:700;font-size:10px;">🐛 DEBUG CONSOLE</span><button id="debug-clear" style="margin-left:auto;background:transparent;border:1px solid #fbbf24;color:#fbbf24;border-radius:4px;padding:2px 8px;font-size:9px;cursor:pointer;">Vider</button><button id="debug-close" style="background:transparent;border:1px solid #f87171;color:#f87171;border-radius:4px;padding:2px 8px;font-size:9px;cursor:pointer;">Fermer</button></div><div id="debug-output" style="flex:1;overflow-y:auto;padding:6px 12px;"></div>`;
    document.body.appendChild(panel);
    panel.querySelector('#debug-clear').onclick = () => { _debugLogs = []; renderDebugOutput(); };
    panel.querySelector('#debug-close').onclick = () => toggleDebugPanel();
    // Intercepter console
    _origLog = console.log;
    _origWarn = console.warn;
    _origError = console.error;
    console.log = function() { _origLog.apply(console, arguments); addDebugEntry('LOG', arguments); };
    console.warn = function() { _origWarn.apply(console, arguments); addDebugEntry('WARN', arguments); };
    console.error = function() { _origError.apply(console, arguments); addDebugEntry('ERROR', arguments); };
  }

  panel.style.display = 'flex';
  renderDebugOutput();
}

function addDebugEntry(level, args) {
  const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 120) : String(a)).join(' ');
  const time = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  _debugLogs.push({ time, level, msg });
  if (_debugLogs.length > 100) _debugLogs.shift();
  if (_debugPanelOpen) renderDebugOutput();
}

function renderDebugOutput() {
  const output = document.getElementById('debug-output');
  if (!output) return;
  const colors = { LOG: '#a0ffb0', WARN: '#fbbf24', ERROR: '#f87171' };
  output.innerHTML = _debugLogs.map(e => `<div style="padding:1px 0;"><span style="color:#00d4ff;">${e.time}</span> <span style="color:${colors[e.level] || '#a0ffb0'};font-weight:700;">[${e.level}]</span> <span style="color:#e6edf3;">${e.msg}</span></div>`).join('');
  output.scrollTop = output.scrollHeight;
}

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
