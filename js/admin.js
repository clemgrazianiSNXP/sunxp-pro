/* js/admin.js — Panneau d'administration (SunXP Pro) */
console.log('admin.js chargé');

const ADMIN_EMAILS = ['amazon.grazianisnxp@gmail.com'];
const ADMIN_TABS = ['monitoring', 'sauvegarde', 'utilisateurs', 'logs', 'maintenance'];

let adminTab = 'monitoring';

/**
 * Vérifie si l'utilisateur connecté est un administrateur.
 * Condition : email dans ADMIN_EMAILS (pas besoin de profil user_profiles).
 */
function isAdmin() {
  if (!currentUser) return false;
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
 * Injecte dynamiquement la card "Admin" sur l'écran de choix de rôle si l'utilisateur est admin.
 * La card apparaît à côté de "Responsable" et "Chauffeur".
 */
function injectAdminCard() {
  if (!isAdmin()) return;

  const roleScreen = document.getElementById('role-screen');
  if (!roleScreen) return;

  // Ne pas injecter si déjà présent
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
 * Ouvre le panneau admin en plein écran (sans sidebar, sans station).
 */
function openAdminPanel() {
  // Cacher tout le reste
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) appLayout.style.display = 'none';
  const stationScreen = document.getElementById('station-screen');
  if (stationScreen) { stationScreen.hidden = true; stationScreen.style.display = 'none'; }

  // Créer ou afficher le conteneur admin plein écran
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

  // Topbar admin
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

  if (adminTab === 'monitoring') {
    renderAdminMonitoring(content);
  } else if (adminTab === 'sauvegarde') {
    renderAdminSauvegarde(content);
  } else if (adminTab === 'utilisateurs') {
    renderAdminUtilisateurs(content);
  } else if (adminTab === 'logs') {
    renderAdminLogs(content);
  } else if (adminTab === 'maintenance') {
    renderAdminMaintenance(content);
  }

  adminScreen.appendChild(content);
}

/* ══════════════════════════════════════════════════════════════
   MONITORING
   ══════════════════════════════════════════════════════════════ */
async function renderAdminMonitoring(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

  // Test connexion
  const connCard = document.createElement('div');
  connCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  let connected = false;
  try {
    if (sb()) { const { error } = await sb().from('stations').select('id').limit(1); connected = !error; }
  } catch (_) {}
  connCard.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">Connexion Supabase</div><div style="font-size:24px;">${connected ? '🟢 Connecté' : '🔴 Déconnecté'}</div>`;
  wrap.appendChild(connCard);

  // Statut tables
  if (connected) {
    const tables = ['stations','chauffeurs','heures','stats','primes','activite','planning','planning_meta','degats','camions','repos_demandes','acomptes','conges_payes','user_profiles','push_subscriptions','activity_logs','app_settings'];
    const tableCard = document.createElement('div');
    tableCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    tableCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">Tables Supabase</div>';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;';
    for (const t of tables) {
      try {
        const { count } = await sb().from(t).select('*', { count: 'exact', head: true });
        grid.innerHTML += `<div style="padding:8px;background:var(--bg-primary);border-radius:6px;font-size:11px;"><b>${t}</b><br><span style="color:var(--accent);">${count || 0} lignes</span></div>`;
      } catch (_) {
        grid.innerHTML += `<div style="padding:8px;background:var(--bg-primary);border-radius:6px;font-size:11px;"><b>${t}</b><br><span style="color:#f87171;">erreur</span></div>`;
      }
    }
    tableCard.appendChild(grid);
    wrap.appendChild(tableCard);
  }

  container.innerHTML = '';
  container.appendChild(wrap);
}

/* ══════════════════════════════════════════════════════════════
   SAUVEGARDE
   ══════════════════════════════════════════════════════════════ */
function renderAdminSauvegarde(container) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;max-width:600px;';

  // Export
  const exportCard = document.createElement('div');
  exportCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  exportCard.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">📥 Exporter les données</div><p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Télécharge un fichier JSON avec toutes les données de toutes les stations.</p><button id="admin-export-btn" class="rep-btn rep-btn-primary">Exporter tout</button><div id="admin-export-progress" style="margin-top:8px;font-size:11px;color:var(--text-muted);"></div>`;
  wrap.appendChild(exportCard);

  // Restauration
  const restoreCard = document.createElement('div');
  restoreCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  restoreCard.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">📤 Restaurer depuis un backup</div><p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Importe un fichier JSON pour restaurer les données.</p><input type="file" id="admin-restore-file" accept=".json" style="font-size:12px;"><div id="admin-restore-status" style="margin-top:8px;font-size:11px;color:var(--text-muted);"></div>`;
  wrap.appendChild(restoreCard);

  container.appendChild(wrap);

  // Bind export
  setTimeout(() => {
    document.getElementById('admin-export-btn')?.addEventListener('click', async () => {
      const prog = document.getElementById('admin-export-progress');
      const tables = ['stations','chauffeurs','heures','stats','primes','activite','planning','planning_meta','planning_published','degats','camions','repos_demandes','acomptes','conges_payes','cles_codes','problemes_camions','user_profiles','responsables','eos','concessions','retards','absences'];
      const backup = { version: '1.0', exported_at: new Date().toISOString(), exported_by: currentUser?.email || '', tables: {} };
      let done = 0;
      for (const t of tables) {
        prog.textContent = `Export ${t}... (${done}/${tables.length})`;
        try {
          const { data } = await sb().from(t).select('*');
          backup.tables[t] = data || [];
        } catch (_) { backup.tables[t] = []; }
        done++;
      }
      prog.textContent = '✅ Export terminé ! Téléchargement...';
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sunxp-backup-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('admin-restore-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const status = document.getElementById('admin-restore-status');
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (!json.version || !json.tables) { status.textContent = '❌ Fichier invalide (pas de version/tables)'; return; }
        const tableNames = Object.keys(json.tables);
        if (!confirm(`Restaurer ${tableNames.length} tables ? (${tableNames.join(', ')})`)) return;
        status.textContent = 'Restauration en cours...';
        let restored = 0;
        for (const [table, rows] of Object.entries(json.tables)) {
          if (!rows || !rows.length) continue;
          try { await sb().from(table).upsert(rows); restored++; } catch (_) {}
        }
        status.textContent = `✅ ${restored} tables restaurées !`;
      } catch (err) { status.textContent = '❌ Erreur: ' + err.message; }
    });
  }, 0);
}

/* ══════════════════════════════════════════════════════════════
   UTILISATEURS
   ══════════════════════════════════════════════════════════════ */
async function renderAdminUtilisateurs(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  try {
    const { data: profiles } = await sb().from('user_profiles').select('*');
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    wrap.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">👥 Comptes utilisateurs (${(profiles||[]).length})</div>`;
    if (profiles && profiles.length) {
      profiles.forEach(p => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:8px;font-size:12px;';
        div.innerHTML = `<span style="font-weight:700;flex:1;">${p.prenom || ''} ${p.nom || ''}</span><span style="color:var(--accent);">${p.role}</span><span style="color:var(--text-muted);font-size:10px;">${p.station_id || '—'}</span><span style="color:var(--text-muted);font-size:10px;">${p.chauffeur_id || ''}</span>`;
        wrap.appendChild(div);
      });
    } else {
      wrap.innerHTML += '<p style="color:var(--text-muted);">Aucun profil trouvé.</p>';
    }
    container.innerHTML = '';
    container.appendChild(wrap);
  } catch (e) { container.innerHTML = '<p style="color:#f87171;">Erreur: ' + e.message + '</p>'; }
}

/* ══════════════════════════════════════════════════════════════
   LOGS
   ══════════════════════════════════════════════════════════════ */
async function renderAdminLogs(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  try {
    const { data: logs } = await sb().from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    wrap.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">📋 Derniers logs (${(logs||[]).length})</div>`;
    if (logs && logs.length) {
      logs.forEach(l => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:8px 10px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:6px;font-size:11px;display:flex;gap:8px;align-items:center;';
        const date = new Date(l.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
        div.innerHTML = `<span style="color:var(--text-muted);min-width:90px;">${date}</span><span style="font-weight:700;color:var(--accent);min-width:60px;">${l.action}</span><span style="flex:1;color:var(--text-primary);">${l.email}</span><span style="color:var(--text-muted);font-size:10px;">${l.station_id || ''}</span>`;
        wrap.appendChild(div);
      });
    } else {
      wrap.innerHTML += '<p style="color:var(--text-muted);">Aucun log enregistré.</p>';
    }
    container.innerHTML = '';
    container.appendChild(wrap);
  } catch (e) { container.innerHTML = '<p style="color:#f87171;">Erreur: ' + e.message + '</p>'; }
}

/* ══════════════════════════════════════════════════════════════
   MAINTENANCE
   ══════════════════════════════════════════════════════════════ */
async function renderAdminMaintenance(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  // Lire l'état actuel
  let maintenanceActive = false;
  let maintenanceMsg = '';
  try {
    const { data } = await sb().from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (data && data.value) { maintenanceActive = data.value.active || false; maintenanceMsg = data.value.message || ''; }
  } catch (_) {}

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;max-width:500px;';

  const statusCard = document.createElement('div');
  statusCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  statusCard.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🔧 Mode Maintenance</div>
    <div style="font-size:18px;margin-bottom:12px;">${maintenanceActive ? '🔴 ACTIF' : '🟢 Inactif'}</div>
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;color:var(--text-muted);">Message affiché aux utilisateurs :</label>
      <input type="text" id="admin-maint-msg" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;" value="${maintenanceMsg}" placeholder="Maintenance en cours, retour prévu à 14h...">
    </div>
    <div style="display:flex;gap:8px;">
      <button id="admin-maint-on" class="rep-btn rep-btn-delete" style="flex:1;">${maintenanceActive ? '🔄 Mettre à jour' : '🔴 Activer la maintenance'}</button>
      ${maintenanceActive ? '<button id="admin-maint-off" class="rep-btn rep-btn-primary" style="flex:1;">🟢 Désactiver</button>' : ''}
    </div>
  `;
  wrap.appendChild(statusCard);
  container.innerHTML = '';
  container.appendChild(wrap);

  // Bind
  setTimeout(() => {
    document.getElementById('admin-maint-on')?.addEventListener('click', async () => {
      const msg = document.getElementById('admin-maint-msg')?.value || 'Maintenance en cours';
      await sb().from('app_settings').upsert({ key: 'maintenance', value: { active: true, message: msg, activated_at: new Date().toISOString(), activated_by: currentUser?.email || '' }, updated_at: new Date().toISOString(), updated_by: currentUser?.email || '' });
      // Push notification
      if (typeof sendPushToStation === 'function') {
        const { data: stations } = await sb().from('stations').select('id');
        if (stations) for (const s of stations) { sendPushToStation(s.id, '🔧 Maintenance', msg); }
      }
      openAdminPanel();
    });
    document.getElementById('admin-maint-off')?.addEventListener('click', async () => {
      await sb().from('app_settings').upsert({ key: 'maintenance', value: { active: false, message: '' }, updated_at: new Date().toISOString(), updated_by: currentUser?.email || '' });
      openAdminPanel();
    });
  }, 0);
}

// Injection de la card admin après le chargement du DOM et l'authentification
document.addEventListener('DOMContentLoaded', () => {
  // Retry toutes les secondes pendant 10s (attendre que currentUser soit défini par auth.js)
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
  if (isAdmin()) return; // Admin bypass
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
