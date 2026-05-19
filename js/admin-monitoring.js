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

  // Card Supabase Storage
  if (connected) {
    const storageCard = document.createElement('div');
    storageCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    storageCard.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="font-size:14px;font-weight:700;">☁️ Supabase Storage</span><button id="adm-storage-refresh" class="h-btn" style="font-size:9px;padding:3px 8px;">🔄 Rafraîchir</button></div><p style="font-size:11px;color:var(--text-muted);">Chargement...</p>';
    wrap.appendChild(storageCard);

    // Charger les infos storage
    (async () => {
      try {
        const { data: buckets, error: bErr } = await sb().storage.listBuckets();
        if (bErr || !buckets) { storageCard.querySelector('p').textContent = '❌ ' + (bErr?.message || 'Erreur'); return; }

        let totalBytes = 0;
        const bucketInfos = [];

        for (const bucket of buckets) {
          let fileCount = 0, bucketSize = 0;
          try {
            const { data: files } = await sb().storage.from(bucket.name).list('', { limit: 1000 });
            if (files) {
              fileCount = files.length;
              files.forEach(f => { if (f.metadata && f.metadata.size) bucketSize += f.metadata.size; });
            }
          } catch (_) {}
          totalBytes += bucketSize;
          bucketInfos.push({ name: bucket.name, files: fileCount, size: bucketSize });
        }

        const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
        const pct = Math.min(100, (totalBytes / (500 * 1024 * 1024)) * 100).toFixed(0);
        let gaugeColor = '#4ade80';
        if (totalMB > 400) gaugeColor = '#f87171';
        else if (totalMB > 300) gaugeColor = '#fbbf24';

        let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="font-size:14px;font-weight:700;">☁️ Supabase Storage</span><button id="adm-storage-refresh" class="h-btn" style="font-size:9px;padding:3px 8px;">🔄 Rafraîchir</button></div>';

        // Jauge
        html += `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;"><span style="color:var(--text-primary);font-weight:700;">Utilisé : ${totalMB} MB / 500 MB</span><span style="color:${gaugeColor};font-family:monospace;">${pct}%</span></div><div style="height:8px;background:#1e2d3d;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${gaugeColor};border-radius:4px;transition:width 0.3s;"></div></div></div>`;

        // Alerte si > 400MB
        if (totalMB > 400) {
          html += '<div style="padding:8px 10px;background:rgba(255,61,61,0.1);border:1px solid #f87171;border-radius:6px;font-size:10px;color:#f87171;margin-bottom:10px;">⚠️ Limite Storage bientôt atteinte — pensez à upgrader votre plan Supabase ou supprimer des fichiers inutiles</div>';
        }

        // Liste buckets
        html += '<div style="display:flex;flex-direction:column;gap:4px;">';
        bucketInfos.forEach(b => {
          const sizeMB = (b.size / (1024 * 1024)).toFixed(2);
          html += `<div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--bg-primary);border-radius:5px;font-size:10px;"><span style="color:var(--text-primary);font-weight:700;">📁 ${b.name}</span><span style="color:var(--text-muted);font-family:monospace;">${b.files} fichiers · ${sizeMB} MB</span></div>`;
        });
        html += '</div>';

        storageCard.innerHTML = html;
        storageCard.querySelector('#adm-storage-refresh').onclick = () => openAdminPanel();
      } catch (e) { storageCard.querySelector('p').textContent = '❌ ' + e.message; }
    })();
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
    const tables = ['stations','chauffeurs','heures','stats','primes','activite','planning','planning_meta','degats','camions','repos_demandes','acomptes','conges_payes','user_profiles','push_subscriptions','activity_logs','app_settings'];
    const alerts = [];
    const tableCard = document.createElement('div');
    tableCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    tableCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">Tables Supabase <span style="font-size:10px;color:var(--text-muted);">(cliquer pour détails)</span></div>';
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
    tableCard.appendChild(grid);
    wrap.appendChild(tableCard);

    // Vérification sync localStorage vs Supabase (exhaustive)
    const syncCard = document.createElement('div');
    syncCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    syncCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">🔄 Sync localStorage ↔ Supabase</div>';
    const syncGrid = document.createElement('div');
    syncGrid.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    const { data: stationsData } = await sb().from('stations').select('id, nom');
    const stationsList = stationsData || [];

    const SYNC_MAP = [
      { table: 'chauffeurs', label: 'Chauffeurs', lsKey: sid => sid + '-repertoire', type: 'array' },
      { table: 'responsables', label: 'Responsables', lsKey: sid => sid + '-responsables', type: 'array' },
      { table: 'heures', label: 'Heures', prefix: sid => sid + '-heures-', type: 'multi' },
      { table: 'planning', label: 'Planning', prefix: sid => sid + '-planning-', exclude: ['-meta-', '-published'], type: 'multi' },
      { table: 'planning_meta', label: 'Planning Meta', prefix: sid => sid + '-planning-meta-', type: 'multi' },
      { table: 'planning_published', label: 'Planning Published', lsKey: sid => sid + '-planning-published', type: 'single' },
      { table: 'primes', label: 'Primes', prefix: sid => sid + '-primes-', type: 'multi' },
      { table: 'stats', label: 'Stats', prefix: sid => sid + '-stats-', type: 'multi' },
      { table: 'camions', label: 'Camions', lsKey: sid => sid + '-camions', type: 'single' },
      { table: 'degats', label: 'Dégâts', lsKey: sid => sid + '-degats', type: 'array' },
      { table: 'acomptes', label: 'Acomptes', lsKey: sid => sid + '-acomptes', type: 'single' },
      { table: 'repos_demandes', label: 'Repos Demandes', lsKey: sid => sid + '-repos-demandes', type: 'single' },
      { table: 'conges_payes', label: 'Congés Payés', lsKey: sid => sid + '-conges-payes', type: 'single' },
      { table: 'cles_codes', label: 'Clés & Codes', lsKey: sid => sid + '-cles-codes', type: 'single' },
      { table: 'eos', label: 'EOS', prefix: sid => sid + '-eos-', type: 'multi' },
      { table: 'concessions', label: 'Concessions', prefix: sid => sid + '-concessions-', type: 'multi' },
      { table: 'retards', label: 'Retards', prefix: sid => sid + '-retards-', type: 'multi' },
      { table: 'activite', label: 'Activité', prefix: sid => sid + '-activite-', type: 'multi' }
    ];

    let syncIssues = 0;

    for (const station of stationsList) {
      const sid = station.id;
      let stationIssues = 0;
      const rows = [];

      for (const mapping of SYNC_MAP) {
        let localCount = 0;
        let sbCount = 0;
        try {
          if (mapping.type === 'multi') {
            const pfx = mapping.prefix(sid);
            for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(pfx)) { if (mapping.exclude) { if (!mapping.exclude.some(ex => k.includes(ex))) localCount++; } else localCount++; } }
          } else if (mapping.type === 'array') {
            const raw = localStorage.getItem(mapping.lsKey(sid));
            if (raw) { try { localCount = JSON.parse(raw).length || 0; } catch(_) {} }
          } else if (mapping.type === 'single') {
            if (localStorage.getItem(mapping.lsKey(sid))) localCount = 1;
          }
          const { count, error } = await sb().from(mapping.table).select('*', { count: 'exact', head: true }).eq('station_id', sid);
          if (!error) sbCount = count || 0;
        } catch (_) {}

        if (localCount === 0 && sbCount === 0) continue;
        const isSync = (mapping.type === 'array' || mapping.type === 'single') ? (localCount > 0) === (sbCount > 0) : localCount === sbCount;
        if (!isSync) { stationIssues++; syncIssues++; }
        rows.push({ label: mapping.label, table: mapping.table, localCount, sbCount, isSync });
      }

      if (!rows.length) continue;

      // Accordion par station
      const stationBlock = document.createElement('div');
      stationBlock.style.cssText = 'border:1px solid var(--border);border-radius:8px;overflow:hidden;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-primary);cursor:pointer;user-select:none;';
      header.innerHTML = `<span style="font-weight:700;font-size:12px;color:var(--text-primary);">📍 ${station.nom}</span><span style="font-size:10px;font-family:monospace;color:${stationIssues === 0 ? '#4ade80' : '#f87171'};">${stationIssues === 0 ? '✅ OK' : '⚠️ ' + stationIssues + ' diff'} · ${rows.length} tables ▾</span>`;

      const body = document.createElement('div');
      body.style.cssText = 'display:none;padding:6px 10px;display:flex;flex-direction:column;gap:3px;';
      body.style.display = 'none';

      rows.forEach(r => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px 8px;border-radius:4px;font-size:10px;background:var(--bg-sidebar);';
        row.innerHTML = `<span style="color:var(--text-primary);">${r.label}</span><span style="color:${r.isSync ? '#4ade80' : '#f87171'};font-family:monospace;">${r.isSync ? '✅' : '⚠️'} L:${r.localCount} | S:${r.sbCount}</span>`;
        row.style.cursor = 'pointer';
        row.onclick = () => showSyncDetail(r.table, sid, station.nom, r.localCount, r.sbCount);
        body.appendChild(row);
      });

      header.onclick = () => { body.style.display = body.style.display === 'none' ? 'flex' : 'none'; };
      stationBlock.appendChild(header);
      stationBlock.appendChild(body);
      syncGrid.appendChild(stationBlock);
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
