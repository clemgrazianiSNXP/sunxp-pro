/* js/admin-monitoring.js — Onglet Monitoring (SunXP Pro Admin) */
console.log('admin-monitoring.js chargé');

async function renderAdminMonitoring(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

  // Test connexion
  const connCard = document.createElement('div');
  let connected = false;
  try {
    if (sb()) { const { error } = await sb().from('stations').select('id').limit(1); connected = !error; }
  } catch (_) {}
  connCard.className = 'adm-card ' + (connected ? 'adm-card-ok' : 'adm-card-error');
  connCard.innerHTML = `<span class="adm-status-badge ${connected ? 'adm-status-online' : 'adm-status-error'}">${connected ? 'ONLINE' : 'OFFLINE'}</span><div class="adm-card-title">Connexion Supabase</div><div class="adm-big-number">${connected ? '🟢' : '🔴'}</div>`;
  wrap.appendChild(connCard);

  // Card erreurs de sync récentes (depuis localStorage)
  const syncErrorLog = (() => { try { return JSON.parse(localStorage.getItem('sync-errors-log') || '[]'); } catch(_) { return []; } })();
  const syncErrCard = document.createElement('div');
  if (syncErrorLog.length > 0) {
    syncErrCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid #f87171;border-radius:10px;padding:14px;';
    syncErrCard.innerHTML = '<div style="font-size:13px;font-weight:700;color:#f87171;margin-bottom:8px;">⚠️ Erreurs de sync récentes (' + syncErrorLog.length + ')</div>';
    const errList = document.createElement('div');
    errList.style.cssText = 'display:flex;flex-direction:column;gap:4px;max-height:150px;overflow-y:auto;';
    syncErrorLog.slice(0, 10).forEach(e => {
      const row = document.createElement('div');
      row.style.cssText = 'font-size:10px;padding:4px 8px;background:var(--bg-primary);border-radius:4px;display:flex;gap:8px;align-items:center;';
      const d = e.date ? new Date(e.date).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '?';
      row.innerHTML = `<span style="color:var(--accent);font-family:monospace;min-width:80px;">${d}</span><span style="color:#f87171;font-weight:700;min-width:80px;">${e.table}</span><span style="color:var(--text-muted);flex:1;">${e.message || ''}</span>`;
      errList.appendChild(row);
    });
    syncErrCard.appendChild(errList);
    const clearBtn = document.createElement('button');
    clearBtn.className = 'h-btn';
    clearBtn.style.cssText = 'margin-top:8px;font-size:10px;padding:4px 10px;color:#fbbf24;border-color:#fbbf24;';
    clearBtn.textContent = '🗑 Vider le log d\'erreurs';
    clearBtn.onclick = () => { localStorage.removeItem('sync-errors-log'); localStorage.removeItem('sync-errors-count'); openAdminPanel(); };
    syncErrCard.appendChild(clearBtn);
  } else {
    syncErrCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:12px;';
    syncErrCard.innerHTML = '<div style="font-size:12px;color:#4ade80;font-weight:700;">✅ Aucune erreur de sync</div>';
  }
  wrap.appendChild(syncErrCard);

  // Card Utilisation Supabase (DB + Storage)
  if (connected) {
    // DB size
    let dbSizeMB = 0;
    try {
      const { data: dbSize } = await sb().rpc('get_db_size');
      dbSizeMB = parseFloat(dbSize || 0);
    } catch(e) { console.warn('DB size error:', e.message); }

    const dbLimitMB = 500;
    const dbPct = Math.min((dbSizeMB / dbLimitMB) * 100, 100).toFixed(1);
    const dbColor = dbPct < 60 ? '#4ade80' : dbPct < 80 ? '#fbbf24' : '#f87171';

    // Storage size
    let storageSizeGB = 0;
    try {
      const buckets = ['docs-employes', 'documents', 'papiers-rh', 'photos'];
      for (const bucket of buckets) {
        try {
          const { data: files } = await sb().storage.from(bucket).list('', { limit: 1000 });
          if (files) {
            for (const file of files) {
              if (file.metadata && file.metadata.size) {
                storageSizeGB += file.metadata.size / (1024 * 1024 * 1024);
              }
            }
          }
        } catch(_) {}
      }
    } catch(e) { console.warn('Storage size error:', e.message); }

    const storageLimitGB = 1;
    const storagePct = Math.min((storageSizeGB / storageLimitGB) * 100, 100).toFixed(1);
    const storageColor = storagePct < 60 ? '#4ade80' : storagePct < 80 ? '#fbbf24' : '#f87171';

    const usageCard = document.createElement('div');
    usageCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    usageCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-size:14px;font-weight:700;">📊 Utilisation Supabase</div>
        <button id="refresh-usage-btn" class="h-btn" style="font-size:10px;padding:3px 8px;">🔄 Rafraîchir</button>
      </div>

      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:600;">🗄️ Base de données</span>
          <span style="font-size:11px;font-family:monospace;color:${dbColor};">${parseFloat(dbSizeMB).toFixed(1)} MB / 500 MB</span>
        </div>
        <div style="background:var(--bg-primary);border-radius:20px;height:14px;overflow:hidden;border:1px solid var(--border);position:relative;">
          <div style="height:100%;background:${dbColor};border-radius:20px;width:${dbPct}%;transition:width 0.5s ease;"></div>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;">${dbPct}%</span>
        </div>
        ${parseFloat(dbPct) > 80 ? '<div style="font-size:10px;color:#f87171;margin-top:4px;">⚠️ Base de données bientôt pleine — pensez à upgrader votre plan Supabase</div>' : ''}
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:600;">📁 Storage (fichiers)</span>
          <span style="font-size:11px;font-family:monospace;color:${storageColor};">${(storageSizeGB * 1024).toFixed(0)} MB / 1024 MB</span>
        </div>
        <div style="background:var(--bg-primary);border-radius:20px;height:14px;overflow:hidden;border:1px solid var(--border);position:relative;">
          <div style="height:100%;background:${storageColor};border-radius:20px;width:${storagePct}%;transition:width 0.5s ease;"></div>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;">${storagePct}%</span>
        </div>
        ${parseFloat(storagePct) > 80 ? '<div style="font-size:10px;color:#f87171;margin-top:4px;">⚠️ Storage bientôt plein — pensez à upgrader votre plan Supabase</div>' : ''}
      </div>
    `;
    wrap.appendChild(usageCard);

    setTimeout(() => {
      document.getElementById('refresh-usage-btn')?.addEventListener('click', () => {
        renderAdminMonitoring(container);
      });
    }, 0);
  }

  // Card Activité par station
  if (connected) {
    const actCard = document.createElement('div');
    actCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    actCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">📍 Activité par station</div>';
    try {
      const { data: stList } = await sb().from('stations').select('id, nom');
      const stationsAct = stList || [];
      const actGrid = document.createElement('div');
      actGrid.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      for (const st of stationsAct) {
        const { data: lastLog } = await sb().from('activity_logs').select('*').eq('station_id', st.id).order('created_at', { ascending: false }).limit(1);
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg-primary);border-radius:6px;font-size:11px;';
        if (lastLog && lastLog.length) {
          const log = lastLog[0];
          const logDate = new Date(log.created_at);
          const hoursAgo = (Date.now() - logDate.getTime()) / (1000 * 60 * 60);
          let color = '#4ade80'; // vert < 24h
          if (hoursAgo > 72) color = '#f87171'; // rouge > 3 jours
          else if (hoursAgo > 24) color = '#fbbf24'; // orange > 24h
          const dateStr = logDate.toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
          row.innerHTML = `<span style="font-weight:700;color:var(--text-primary);">${st.nom}</span><span style="color:${color};font-family:monospace;font-size:10px;">${dateStr} · ${log.email || '?'} · ${log.action || '?'}</span>`;
        } else {
          row.innerHTML = `<span style="font-weight:700;color:var(--text-primary);">${st.nom}</span><span style="color:var(--text-muted);font-style:italic;font-size:10px;">Aucune activité enregistrée</span>`;
        }
        actGrid.appendChild(row);
      }
      actCard.appendChild(actGrid);
    } catch (_) { actCard.innerHTML += '<p style="color:#f87171;font-size:11px;">Erreur chargement activité</p>'; }
    wrap.appendChild(actCard);
  }

  // Statut tables + alertes
  if (connected) {
    const tables = [
      'stations', 'chauffeurs', 'responsables',
      'heures', 'stats', 'primes', 'activite',
      'planning', 'planning_meta', 'planning_published',
      'degats', 'camions', 'attribution',
      'repos_demandes', 'acomptes', 'conges_payes',
      'cles_codes', 'contacts', 'problemes_camions',
      'concessions', 'retards', 'absences', 'eos',
      'docs_chauffeurs', 'docs_employes', 'documents',
      'suivi_papiers', 'suivi_entretien',
      'user_profiles', 'push_subscriptions',
      'activity_logs', 'app_settings',
      'admin_notifications', 'admin_notifications_lues',
      'game_scores'
    ];
    const alerts = [];
    const tableCard = document.createElement('div');
    tableCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;overflow:hidden;';
    const tableHdr = document.createElement('div');
    tableHdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 16px;cursor:pointer;user-select:none;';
    tableHdr.innerHTML = '<span style="font-size:14px;font-weight:700;">Tables Supabase</span><span style="font-size:11px;color:var(--text-muted);">▶ Afficher</span>';
    const tableBody = document.createElement('div');
    tableBody.style.cssText = 'display:none;padding:16px;border-top:1px solid var(--border);';
    tableHdr.onclick = () => {
      const open = tableBody.style.display !== 'none';
      tableBody.style.display = open ? 'none' : 'block';
      tableHdr.querySelector('span:last-child').textContent = open ? '▶ Afficher' : '▼ Masquer';
    };
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
          const cell = document.createElement('div');
          cell.style.cssText = 'padding:8px;background:var(--bg-primary);border-radius:6px;font-size:11px;cursor:pointer;transition:border-color 0.15s;border:1px solid transparent;';
          cell.innerHTML = `<b>${t}</b><br><span style="color:${color};">${c} lignes${c === 0 ? ' ⚠️' : ''}</span>`;
          cell.onmouseenter = () => cell.style.borderColor = 'var(--accent)';
          cell.onmouseleave = () => cell.style.borderColor = 'transparent';
          cell.onclick = () => showTableDetail(t);
          grid.appendChild(cell);
          if (c === 0 && ['stations','chauffeurs','user_profiles'].includes(t)) {
            alerts.push(`Table "${t}" est vide (anormal)`);
          }
        }
      } catch (e) {
        grid.innerHTML += `<div style="padding:8px;background:var(--bg-primary);border-radius:6px;font-size:11px;border-left:3px solid #f87171;"><b>${t}</b><br><span style="color:#f87171;">❌ erreur</span></div>`;
        alerts.push(`Table "${t}" erreur: ${e.message}`);
      }
    }
    tableBody.appendChild(grid);
    tableCard.appendChild(tableHdr);
    tableCard.appendChild(tableBody);
    wrap.appendChild(tableCard);

    // Vérification sync localStorage vs Supabase (exhaustive)
    const syncCard = document.createElement('div');
    syncCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;overflow:hidden;';
    const syncCardHdr = document.createElement('div');
    syncCardHdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 16px;cursor:pointer;user-select:none;';
    syncCardHdr.innerHTML = '<span style="font-size:14px;font-weight:700;">🔄 Sync localStorage ↔ Supabase</span><span style="font-size:11px;color:var(--text-muted);">▶ Afficher</span>';
    const syncCardBody = document.createElement('div');
    syncCardBody.style.cssText = 'display:none;padding:16px;border-top:1px solid var(--border);';
    syncCardHdr.onclick = () => {
      const open = syncCardBody.style.display !== 'none';
      syncCardBody.style.display = open ? 'none' : 'block';
      syncCardHdr.querySelector('span:last-child').textContent = open ? '▶ Afficher' : '▼ Masquer';
    };
    syncCard.appendChild(syncCardHdr);
    syncCard.appendChild(syncCardBody);
    const syncGrid = document.createElement('div');
    syncGrid.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    const { data: stationsData } = await sb().from('stations').select('id, nom');
    const stationsList = stationsData || [];

    const syncChecks = [
      { label: 'Chauffeurs', localFn: (sid) => { try { return (JSON.parse(localStorage.getItem(sid+'-repertoire'))||[]).length; } catch(_){return 0;} }, sbTable: 'chauffeurs', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Responsables', localFn: (sid) => { try { return (JSON.parse(localStorage.getItem(sid+'-responsables'))||[]).length; } catch(_){return 0;} }, sbTable: 'responsables', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Heures', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-heures-'))c++;} return c; }, sbTable: 'heures', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Planning', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-planning-')&&!k.includes('-meta-')&&!k.includes('-published'))c++;} return c; }, sbTable: 'planning', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Planning Meta', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-planning-meta-'))c++;} return c; }, sbTable: 'planning_meta', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Planning Published', localFn: (sid) => localStorage.getItem(sid+'-planning-published') ? 1 : 0, sbTable: 'planning_published', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Stats', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-stats-'))c++;} return c; }, sbTable: 'stats', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Primes', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-primes-'))c++;} return c; }, sbTable: 'primes', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Camions', localFn: (sid) => { try { return (JSON.parse(localStorage.getItem(sid+'-camions'))||[]).length; } catch(_){return 0;} }, sbTable: 'camions', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Dégâts', localFn: (sid) => { try { return (JSON.parse(localStorage.getItem(sid+'-degats'))||[]).length; } catch(_){return 0;} }, sbTable: 'degats', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Repos Demandes', localFn: (sid) => { try { return (JSON.parse(localStorage.getItem(sid+'-repos-demandes'))||[]).length; } catch(_){return 0;} }, sbTable: 'repos_demandes', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Acomptes', localFn: (sid) => { try { return (JSON.parse(localStorage.getItem(sid+'-acomptes'))||[]).length; } catch(_){return 0;} }, sbTable: 'acomptes', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Congés Payés', localFn: (sid) => { try { return (JSON.parse(localStorage.getItem(sid+'-conges-payes'))||[]).length; } catch(_){return 0;} }, sbTable: 'conges_payes', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Clés & Codes', localFn: (sid) => localStorage.getItem(sid+'-cles-codes') ? 1 : 0, sbTable: 'cles_codes', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Contacts', localFn: (sid) => { try { return (JSON.parse(localStorage.getItem(sid+'-contacts'))||[]).length; } catch(_){return 0;} }, sbTable: 'contacts', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Problèmes Camions', localFn: (sid) => localStorage.getItem(sid+'-problemes-camions') ? 1 : 0, sbTable: 'problemes_camions', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Concessions', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-concessions-'))c++;} return c; }, sbTable: 'concessions', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Retards', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-retards-'))c++;} return c; }, sbTable: 'retards', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Absences', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-absences-'))c++;} return c; }, sbTable: 'absences', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'EOS', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-eos-'))c++;} return c; }, sbTable: 'eos', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Docs Chauffeurs', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-docs-chauffeur-'))c++;} return c; }, sbTable: 'docs_chauffeurs', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Docs Employés', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-docs-employes-'))c++;} return c; }, sbTable: 'docs_employes', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Documents Bureau', localFn: (sid) => localStorage.getItem(sid+'-documents') ? 1 : 0, sbTable: 'documents', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Suivi Papiers', localFn: (sid) => localStorage.getItem(sid+'-suivi-papiers') ? 1 : 0, sbTable: 'suivi_papiers', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Suivi Entretien', localFn: (sid) => localStorage.getItem(sid+'-suivi-entretien') ? 1 : 0, sbTable: 'suivi_entretien', sbFilter: (q,sid) => q.eq('station_id',sid) },
      { label: 'Attribution', localFn: (sid) => { let c=0; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(sid+'-attribution-'))c++;} return c; }, sbTable: 'attribution', sbFilter: (q,sid) => q.eq('station_id',sid) },
    ];

    let syncIssues = 0;

    for (const station of stationsList) {
      const sid = station.id;
      const stationRows = [];
      let stationIssues = 0;

      for (const check of syncChecks) {
        const localCount = check.localFn(sid);
        const { count: sbCount } = await check.sbFilter(sb().from(check.sbTable).select('*', { count: 'exact', head: true }), sid);
        const isSync = localCount === (sbCount || 0);
        if (!isSync) { syncIssues++; stationIssues++; }
        stationRows.push({ label: check.label, sbTable: check.sbTable, localCount, sbCount: sbCount || 0, isSync });
      }

      const block = document.createElement('div');
      block.style.cssText = 'border:1px solid var(--border);border-radius:8px;overflow:hidden;';

      const stHdr = document.createElement('div');
      stHdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-primary);cursor:pointer;user-select:none;';
      stHdr.innerHTML = `<span style="font-weight:700;font-size:12px;">📍 ${station.nom}</span><span style="font-size:10px;font-family:monospace;color:${stationIssues === 0 ? '#4ade80' : '#fbbf24'};">${stationIssues === 0 ? '✅ OK' : '⚠️ ' + stationIssues + ' diff'} · ${stationRows.length} checks ▶</span>`;

      const stBody = document.createElement('div');
      stBody.style.display = 'none';

      stationRows.forEach(r => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 10px;font-size:10px;background:var(--bg-sidebar);cursor:pointer;border-top:1px solid var(--border);';
        row.innerHTML = `<span>${r.label}</span><span style="color:${r.isSync ? '#4ade80' : '#fbbf24'};">${r.isSync ? '✅' : '⚠️'} Local: ${r.localCount} | SB: ${r.sbCount}</span>`;
        row.onmouseenter = () => row.style.background = 'var(--bg-primary)';
        row.onmouseleave = () => row.style.background = 'var(--bg-sidebar)';
        row.onclick = () => showSyncDetail(r.sbTable, sid, station.nom, r.localCount, r.sbCount);
        stBody.appendChild(row);
      });

      stHdr.onclick = () => {
        const open = stBody.style.display !== 'none';
        stBody.style.display = open ? 'none' : 'block';
        const chevron = stHdr.querySelector('span:last-child');
        chevron.textContent = chevron.textContent.replace(open ? '▼' : '▶', open ? '▶' : '▼');
      };

      block.appendChild(stHdr);
      block.appendChild(stBody);
      syncGrid.appendChild(block);
    }

    // Résumé sync
    const syncSummary = document.createElement('div');
    syncSummary.style.cssText = `margin-top:8px;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;color:${syncIssues === 0 ? '#4ade80' : '#fbbf24'};display:flex;align-items:center;gap:12px;`;
    syncSummary.textContent = syncIssues === 0 ? '✅ Tout est synchronisé' : `⚠️ ${syncIssues} différence(s) détectée(s)`;

    if (syncIssues > 0) {
      const syncBtn = document.createElement('button');
      syncBtn.className = 'rep-btn rep-btn-primary';
      syncBtn.style.cssText = 'font-size:11px;padding:6px 14px;';
      syncBtn.textContent = '🔄 Forcer la sync';
      syncBtn.onclick = async () => {
        syncBtn.textContent = '⏳ Sync en cours...';
        syncBtn.disabled = true;
        try {
          if (typeof window.dbSyncAll === 'function') await window.dbSyncAll();
          else if (typeof dbSyncAll === 'function') await dbSyncAll();
          syncBtn.textContent = '✅ Terminé !';
          setTimeout(() => openAdminPanel(), 1500);
        } catch (e) { syncBtn.textContent = '❌ Erreur'; alert('Erreur sync: ' + e.message); }
      };
      syncSummary.appendChild(syncBtn);
    }

    syncCardBody.appendChild(syncGrid);
    syncCardBody.appendChild(syncSummary);
    wrap.appendChild(syncCard);

    // Card Test de charge
    const loadCard = document.createElement('div');
    loadCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    loadCard.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🔥 Test de charge</div>
      <div style="padding:8px 10px;background:rgba(255,170,0,0.1);border:1px solid #fbbf24;border-radius:6px;font-size:10px;color:#fbbf24;margin-bottom:12px;">⚠️ Ne lancez pas ce test en production avec de vrais utilisateurs connectés</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;"><label style="min-width:120px;color:var(--text-muted);">Utilisateurs :</label><input type="range" id="lt-users" min="1" max="50" value="10" style="flex:1;"><span id="lt-users-val" style="min-width:24px;font-family:monospace;color:var(--accent);">10</span></div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;"><label style="min-width:120px;color:var(--text-muted);">Durée (sec) :</label><select id="lt-duration" style="font-size:11px;padding:3px 6px;"><option value="10">10s</option><option value="30" selected>30s</option><option value="60">60s</option></select></div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;"><label style="min-width:120px;color:var(--text-muted);">Type :</label><select id="lt-type" style="font-size:11px;padding:3px 6px;"><option value="read">Lecture seule</option><option value="readwrite">Lecture + Écriture</option></select></div>
      </div>
      <button id="lt-start" class="rep-btn rep-btn-primary" style="margin-top:12px;font-size:11px;padding:8px 16px;width:100%;">🔥 Lancer le test</button>
      <div id="lt-progress" style="margin-top:10px;display:none;"></div>
      <div id="lt-results" style="margin-top:10px;display:none;"></div>
    `;
    wrap.appendChild(loadCard);

    // Bind load test
    setTimeout(() => {
      const usersSlider = document.getElementById('lt-users');
      const usersVal = document.getElementById('lt-users-val');
      if (usersSlider) usersSlider.oninput = () => { usersVal.textContent = usersSlider.value; };

      document.getElementById('lt-start')?.addEventListener('click', async () => {
        const users = parseInt(document.getElementById('lt-users')?.value || '10');
        const duration = parseInt(document.getElementById('lt-duration')?.value || '30');
        const type = document.getElementById('lt-type')?.value || 'read';
        const btn = document.getElementById('lt-start');
        const progDiv = document.getElementById('lt-progress');
        const resDiv = document.getElementById('lt-results');
        btn.disabled = true; btn.textContent = '⏳ Test en cours...';
        progDiv.style.display = 'block'; resDiv.style.display = 'none';
        progDiv.innerHTML = '<div style="height:6px;background:#1e2d3d;border-radius:3px;overflow:hidden;"><div id="lt-bar" style="height:100%;width:0%;background:var(--accent);transition:width 0.3s;"></div></div><div id="lt-live" style="font-size:10px;color:var(--text-muted);margin-top:4px;font-family:monospace;"></div>';

        const results = { success: 0, fail: 0, times: [], startTime: Date.now() };
        const endTime = Date.now() + duration * 1000;
        const bar = document.getElementById('lt-bar');
        const live = document.getElementById('lt-live');

        async function doRequest() {
          const t0 = performance.now();
          try {
            if (type === 'readwrite' && Math.random() > 0.7) {
              await sb().from('activity_logs').insert({ action: 'load_test', email: currentUser?.email || 'test', metadata: { test: true } });
            } else if (Math.random() > 0.5) {
              await sb().from('chauffeurs').select('*');
            } else {
              await sb().from('heures').select('*').limit(10);
            }
            results.success++;
          } catch (_) { results.fail++; }
          results.times.push(performance.now() - t0);
        }

        // Boucle de test
        while (Date.now() < endTime) {
          const batch = Array.from({ length: users }, () => doRequest());
          await Promise.all(batch);
          const elapsed = Date.now() - results.startTime;
          const pct = Math.min(100, (elapsed / (duration * 1000)) * 100);
          if (bar) bar.style.width = pct + '%';
          if (live) live.textContent = `✅ ${results.success} | ❌ ${results.fail} | Moy: ${results.times.length ? (results.times.reduce((a,b)=>a+b,0)/results.times.length).toFixed(0) : 0}ms`;
          await new Promise(r => setTimeout(r, 200));
        }

        // Rapport final
        const totalTime = ((Date.now() - results.startTime) / 1000).toFixed(1);
        const avg = results.times.length ? (results.times.reduce((a,b)=>a+b,0)/results.times.length).toFixed(0) : 0;
        const min = results.times.length ? Math.min(...results.times).toFixed(0) : 0;
        const max = results.times.length ? Math.max(...results.times).toFixed(0) : 0;
        const total = results.success + results.fail;
        const successRate = total ? ((results.success / total) * 100).toFixed(1) : 0;
        let status = '✅ Supabase tient la charge';
        let statusColor = '#4ade80';
        if (successRate < 95) { status = '❌ Surcharge détectée'; statusColor = '#f87171'; }
        else if (successRate < 99) { status = '⚠️ Quelques erreurs détectées'; statusColor = '#fbbf24'; }

        const report = { date: new Date().toISOString(), users, duration, type, total, success: results.success, fail: results.fail, successRate: parseFloat(successRate), avgMs: parseInt(avg), minMs: parseInt(min), maxMs: parseInt(max), status };

        resDiv.style.display = 'block';
        resDiv.innerHTML = `
          <div style="padding:10px;background:var(--bg-primary);border-radius:8px;font-size:11px;">
            <div style="font-weight:700;color:${statusColor};font-size:13px;margin-bottom:6px;">${status}</div>
            <div style="color:var(--text-primary);">📊 ${total} requêtes en ${totalTime}s</div>
            <div style="color:var(--text-primary);">✅ Taux de succès : <span style="color:${statusColor};font-weight:700;">${successRate}%</span></div>
            <div style="color:var(--text-muted);font-family:monospace;margin-top:4px;">Moy: ${avg}ms | Min: ${min}ms | Max: ${max}ms</div>
          </div>
          <button id="lt-export" class="h-btn" style="margin-top:8px;font-size:10px;padding:4px 10px;">📥 Exporter le rapport</button>
        `;
        document.getElementById('lt-export').onclick = () => {
          const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = 'load-test-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
        };
        btn.disabled = false; btn.textContent = '🔥 Relancer le test';
      });
    }, 0);

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

/* ── Detail modals ────────────────────────────────────────── */
async function showTableDetail(tableName) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:20px;max-width:700px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
  modal.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="margin:0;font-size:15px;color:var(--accent);">📋 ${tableName}</h3><button class="h-btn" style="font-size:12px;" id="admin-detail-close">✕ Fermer</button></div><p style="color:var(--text-muted);font-size:11px;">Chargement...</p>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector('#admin-detail-close').onclick = () => overlay.remove();
  try {
    const { data, error } = await sb().from(tableName).select('*').limit(20).order('created_at', { ascending: false });
    if (error) { modal.querySelector('p').textContent = '❌ ' + error.message; return; }
    if (!data || !data.length) { modal.querySelector('p').textContent = 'Table vide.'; return; }
    const cols = Object.keys(data[0]);
    let html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;"><thead><tr>';
    cols.forEach(c => { html += `<th style="padding:4px 6px;border-bottom:1px solid var(--border);text-align:left;color:var(--accent);white-space:nowrap;">${c}</th>`; });
    html += '</tr></thead><tbody>';
    data.forEach(row => { html += '<tr>'; cols.forEach(c => { let val = row[c]; if (val && typeof val === 'object') val = JSON.stringify(val).slice(0, 60) + '…'; else if (val && String(val).length > 40) val = String(val).slice(0, 40) + '…'; html += `<td style="padding:3px 6px;border-bottom:1px solid var(--border);color:var(--text-primary);white-space:nowrap;">${val ?? '—'}</td>`; }); html += '</tr>'; });
    html += '</tbody></table></div><p style="font-size:10px;color:var(--text-muted);margin-top:8px;">Affichage des 20 dernières lignes.</p>';
    modal.querySelector('p').remove();
    modal.insertAdjacentHTML('beforeend', html);
  } catch (e) { modal.querySelector('p').textContent = '❌ ' + e.message; }
}

async function showSyncDetail(table, stationId, stationNom, localCount, sbCount) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:20px;max-width:500px;width:90%;max-height:70vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
  modal.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="margin:0;font-size:15px;color:var(--accent);">🔄 ${stationNom} — ${table}</h3><button class="h-btn" style="font-size:12px;" id="admin-sync-close">✕</button></div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector('#admin-sync-close').onclick = () => overlay.remove();
  const info = document.createElement('div');
  info.style.cssText = 'display:flex;flex-direction:column;gap:8px;font-size:12px;';
  info.innerHTML = `<div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg-primary);border-radius:6px;"><span>📦 localStorage</span><span style="font-weight:700;">${localCount} entrées</span></div><div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg-primary);border-radius:6px;"><span>☁️ Supabase</span><span style="font-weight:700;">${sbCount} entrées</span></div><div style="padding:8px;border-radius:6px;font-weight:700;color:${localCount === sbCount ? '#4ade80' : '#f87171'};">${localCount === sbCount ? '✅ Synchronisé' : '⚠️ Désynchronisé (' + Math.abs(localCount - sbCount) + ' de différence)'}</div>`;
  if (table === 'heures' || table === 'planning') {
    const prefix = stationId + '-' + (table === 'planning' ? 'planning-' : 'heures-');
    const localKeys = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix) && (table !== 'planning' || !k.includes('-meta-'))) localKeys.push(k.replace(prefix, '')); }
    localKeys.sort().reverse();
    if (localKeys.length) { info.innerHTML += '<div style="font-size:11px;font-weight:700;margin-top:8px;color:var(--text-muted);">Clés locales (dernières 15) :</div>'; localKeys.slice(0, 15).forEach(k => { info.innerHTML += `<div style="font-size:10px;padding:2px 8px;color:var(--text-primary);">• ${k}</div>`; }); }
  } else if (table === 'chauffeurs') {
    try { const local = JSON.parse(localStorage.getItem(stationId + '-repertoire')) || []; if (local.length) { info.innerHTML += '<div style="font-size:11px;font-weight:700;margin-top:8px;color:var(--text-muted);">Chauffeurs locaux :</div>'; local.slice(0, 15).forEach(c => { info.innerHTML += `<div style="font-size:10px;padding:2px 8px;color:var(--text-primary);">• ${c.prenom} ${c.nom} (${c.role || '—'})</div>`; }); if (local.length > 15) info.innerHTML += `<div style="font-size:10px;color:var(--text-muted);padding:2px 8px;">... et ${local.length - 15} autres</div>`; } } catch (_) {}
  }
  modal.appendChild(info);
}
