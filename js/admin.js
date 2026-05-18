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

  // Statut tables + alertes
  if (connected) {
    const tables = ['stations','chauffeurs','heures','stats','primes','activite','planning','planning_meta','degats','camions','repos_demandes','acomptes','conges_payes','user_profiles','push_subscriptions','activity_logs','app_settings'];
    const alerts = [];
    const tableCard = document.createElement('div');
    tableCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    tableCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">Tables Supabase</div>';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;';
    for (const t of tables) {
      try {
        const { count, error } = await sb().from(t).select('*', { count: 'exact', head: true });
        if (error) {
          grid.innerHTML += `<div style="padding:8px;background:var(--bg-primary);border-radius:6px;font-size:11px;border-left:3px solid #f87171;"><b>${t}</b><br><span style="color:#f87171;">❌ ${error.message}</span></div>`;
          alerts.push(`Table "${t}" inaccessible: ${error.message}`);
        } else {
          const c = count || 0;
          const color = c === 0 ? '#fbbf24' : 'var(--accent)';
          grid.innerHTML += `<div style="padding:8px;background:var(--bg-primary);border-radius:6px;font-size:11px;"><b>${t}</b><br><span style="color:${color};">${c} lignes${c === 0 ? ' ⚠️' : ''}</span></div>`;
          if (c === 0 && ['stations','chauffeurs','user_profiles'].includes(t)) {
            alerts.push(`Table "${t}" est vide (anormal)`);
          }
        }
      } catch (e) {
        grid.innerHTML += `<div style="padding:8px;background:var(--bg-primary);border-radius:6px;font-size:11px;border-left:3px solid #f87171;"><b>${t}</b><br><span style="color:#f87171;">❌ erreur</span></div>`;
        alerts.push(`Table "${t}" erreur: ${e.message}`);
      }
    }
    tableCard.appendChild(grid);
    wrap.appendChild(tableCard);

    // Vérification sync localStorage vs Supabase
    const syncCard = document.createElement('div');
    syncCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    syncCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">🔄 Sync localStorage ↔ Supabase</div>';
    const syncGrid = document.createElement('div');
    syncGrid.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    // Récupérer les stations pour vérifier la sync
    const { data: stationsData } = await sb().from('stations').select('id, nom');
    const stationsList = stationsData || [];

    let syncIssues = 0;
    for (const station of stationsList) {
      const sid = station.id;

      // Vérifier chauffeurs
      const localCh = (() => { try { const r = localStorage.getItem(sid + '-repertoire'); return r ? JSON.parse(r) : []; } catch(_) { return []; } })();
      const { count: sbChCount } = await sb().from('chauffeurs').select('*', { count: 'exact', head: true }).eq('station_id', sid);
      const chSync = localCh.length === (sbChCount || 0);
      if (!chSync) syncIssues++;
      syncGrid.innerHTML += `<div style="padding:6px 10px;background:var(--bg-primary);border-radius:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center;"><span><b>${station.nom}</b> — Chauffeurs</span><span style="color:${chSync ? '#4ade80' : '#f87171'};">${chSync ? '✅' : '⚠️'} Local: ${localCh.length} | Supabase: ${sbChCount || 0}</span></div>`;

      // Vérifier heures (compter les clés localStorage vs Supabase)
      let localHeuresCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(sid + '-heures-')) localHeuresCount++;
      }
      const { count: sbHeuresCount } = await sb().from('heures').select('*', { count: 'exact', head: true }).eq('station_id', sid);
      const hSync = localHeuresCount === (sbHeuresCount || 0);
      if (!hSync) syncIssues++;
      syncGrid.innerHTML += `<div style="padding:6px 10px;background:var(--bg-primary);border-radius:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center;"><span><b>${station.nom}</b> — Heures</span><span style="color:${hSync ? '#4ade80' : '#fbbf24'};">${hSync ? '✅' : '⚠️'} Local: ${localHeuresCount} | Supabase: ${sbHeuresCount || 0}</span></div>`;

      // Vérifier planning
      let localPlanCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(sid + '-planning-') && !k.includes('-meta-')) localPlanCount++;
      }
      const { count: sbPlanCount } = await sb().from('planning').select('*', { count: 'exact', head: true }).eq('station_id', sid);
      const pSync = localPlanCount === (sbPlanCount || 0);
      if (!pSync) syncIssues++;
      syncGrid.innerHTML += `<div style="padding:6px 10px;background:var(--bg-primary);border-radius:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center;"><span><b>${station.nom}</b> — Planning</span><span style="color:${pSync ? '#4ade80' : '#fbbf24'};">${pSync ? '✅' : '⚠️'} Local: ${localPlanCount} | Supabase: ${sbPlanCount || 0}</span></div>`;
    }

    // Résumé sync
    const syncSummary = document.createElement('div');
    syncSummary.style.cssText = `margin-top:8px;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;color:${syncIssues === 0 ? '#4ade80' : '#fbbf24'};`;
    syncSummary.textContent = syncIssues === 0 ? '✅ Tout est synchronisé' : `⚠️ ${syncIssues} différence(s) détectée(s) — Utilisez "Sync All" dans la console pour corriger`;
    syncCard.appendChild(syncGrid);
    syncCard.appendChild(syncSummary);
    wrap.appendChild(syncCard);

    // Alertes
    const alertCard = document.createElement('div');
    alertCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    if (alerts.length) {
      alertCard.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#f87171;">⚠️ Alertes (${alerts.length})</div>`;
      alerts.forEach(a => { alertCard.innerHTML += `<div style="font-size:11px;color:#fbbf24;padding:4px 0;border-bottom:1px solid var(--border);">• ${a}</div>`; });
    } else {
      alertCard.innerHTML = '<div style="font-size:14px;font-weight:700;color:#4ade80;">✅ Aucune alerte — Tout fonctionne</div>';
    }
    wrap.appendChild(alertCard);
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
      if (window.logActivity) window.logActivity('admin_export', { tables: Object.keys(backup.tables).length });
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

        // Mapping des colonnes de conflit pour chaque table
        const CONFLICT_MAP = {
          stations: 'id',
          heures: 'station_id,date_jour',
          stats: 'station_id,type,semaine',
          primes: 'station_id,annee,mois',
          activite: 'station_id,date_jour',
          concessions: 'station_id,semaine',
          retards: 'station_id,semaine',
          camions: 'station_id',
          documents: 'station_id',
          repos_demandes: 'station_id',
          eos: 'station_id,date_jour',
          acomptes: 'station_id',
          conges_payes: 'station_id',
          cles_codes: 'station_id',
          problemes_camions: 'station_id',
          user_profiles: 'id',
          app_settings: 'key',
          absences: 'station_id,semaine'
        };

        // Tables sans contrainte UNIQUE (on delete + insert)
        const DELETE_INSERT_TABLES = ['chauffeurs', 'degats', 'activity_logs', 'responsables', 'planning', 'planning_meta', 'planning_published', 'push_subscriptions'];

        let restored = 0;
        let errors = [];
        for (const [table, rows] of Object.entries(json.tables)) {
          if (!rows || !rows.length) continue;
          status.textContent = `Restauration ${table}... (${restored}/${tableNames.length})`;
          try {
            if (DELETE_INSERT_TABLES.includes(table)) {
              // Pour les tables sans UNIQUE constraint : supprimer tout et réinsérer
              // Retirer les colonnes auto-générées (id)
              const cleanRows = rows.map(r => { const { id, ...rest } = r; return rest; });
              await sb().from(table).delete().neq('id', 0); // delete all
              if (cleanRows.length) {
                // Insérer par batch de 500
                for (let i = 0; i < cleanRows.length; i += 500) {
                  await sb().from(table).insert(cleanRows.slice(i, i + 500));
                }
              }
            } else if (CONFLICT_MAP[table]) {
              // Upsert avec onConflict spécifié
              // Retirer la colonne id auto-générée sauf pour les tables avec id comme PK texte/uuid
              const keepId = ['stations', 'user_profiles', 'app_settings'].includes(table);
              const cleanRows = keepId ? rows : rows.map(r => { const { id, ...rest } = r; return rest; });
              for (let i = 0; i < cleanRows.length; i += 500) {
                await sb().from(table).upsert(cleanRows.slice(i, i + 500), { onConflict: CONFLICT_MAP[table] });
              }
            } else {
              // Fallback : upsert simple
              await sb().from(table).upsert(rows);
            }
            restored++;
          } catch (err) {
            errors.push(`${table}: ${err.message}`);
            console.error('Restore error for', table, ':', err);
          }
        }
        if (errors.length) {
          status.innerHTML = `✅ ${restored} tables restaurées.<br><span style="color:#f87171;">⚠️ Erreurs: ${errors.join(', ')}</span>`;
        } else {
          status.textContent = `✅ ${restored} tables restaurées avec succès !`;
        }
        if (window.logActivity) window.logActivity('admin_restore', { tables: restored, errors: errors.length });
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
        div.innerHTML = `
          <span style="font-weight:700;flex:1;">${p.prenom || ''} ${p.nom || ''}</span>
          <span style="color:var(--accent);">${p.role}</span>
          <span style="color:var(--text-muted);font-size:10px;">${p.station_id || '—'}</span>
          <span style="color:var(--text-muted);font-size:10px;">${p.chauffeur_id || ''}</span>
          <button class="h-btn admin-reset-pwd" data-uid="${p.id}" data-name="${(p.prenom || '') + ' ' + (p.nom || '')}" style="font-size:10px;padding:4px 8px;color:#fbbf24;border-color:#fbbf24;">🔑 Reset MDP</button>
          <button class="h-btn admin-delete-user" data-uid="${p.id}" data-name="${(p.prenom || '') + ' ' + (p.nom || '')}" style="font-size:10px;padding:4px 8px;color:#f87171;border-color:#f87171;">🗑 Supprimer</button>
        `;
        wrap.appendChild(div);
      });
    } else {
      wrap.innerHTML += '<p style="color:var(--text-muted);">Aucun profil trouvé.</p>';
    }
    container.innerHTML = '';
    container.appendChild(wrap);

    // Bind boutons Reset MDP
    container.querySelectorAll('.admin-reset-pwd').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const name = btn.dataset.name;
        const newPwd = prompt(`Nouveau mot de passe pour ${name.trim()} :`);
        if (!newPwd || newPwd.length < 6) { alert('Mot de passe trop court (min 6 caractères)'); return; }
        btn.textContent = '⏳...';
        btn.disabled = true;
        try {
          // Utiliser l'Edge Function admin pour reset le password
          const { data, error } = await sb().functions.invoke('admin-reset-password', {
            body: { user_id: uid, new_password: newPwd }
          });
          if (error) {
            alert('Erreur: ' + error.message);
            btn.textContent = '🔑 Reset MDP';
          } else {
            alert('✅ Mot de passe réinitialisé pour ' + name.trim());
            btn.textContent = '✅ OK';
            if (window.logActivity) window.logActivity('admin_reset_password', { user_id: uid, nom: name.trim() });
          }
        } catch (e) {
          alert('Erreur: ' + e.message);
          btn.textContent = '🔑 Reset MDP';
        }
        btn.disabled = false;
      });
    });

    // Bind boutons Supprimer
    container.querySelectorAll('.admin-delete-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const name = btn.dataset.name;
        if (!confirm(`⚠️ Supprimer définitivement le compte de ${name.trim()} ?\n\nCette action est irréversible.`)) return;
        btn.textContent = '⏳...';
        btn.disabled = true;
        try {
          // Supprimer le profil user_profiles
          const { error: profileErr } = await sb().from('user_profiles').delete().eq('id', uid);
          if (profileErr) { alert('Erreur suppression profil: ' + profileErr.message); btn.textContent = '🗑 Supprimer'; btn.disabled = false; return; }
          // Supprimer le compte auth via Edge Function
          const { error } = await sb().functions.invoke('admin-delete-user', {
            body: { user_id: uid }
          });
          if (error) {
            alert('Profil supprimé mais erreur auth: ' + error.message);
          } else {
            alert('✅ Compte supprimé: ' + name.trim());
            if (window.logActivity) window.logActivity('admin_delete_user', { user_id: uid, nom: name.trim() });
          }
          // Rafraîchir la liste
          renderAdminUtilisateurs(container);
        } catch (e) {
          alert('Erreur: ' + e.message);
          btn.textContent = '🗑 Supprimer';
          btn.disabled = false;
        }
      });
    });
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
