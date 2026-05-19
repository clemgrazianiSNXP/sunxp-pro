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

    // Vérification sync localStorage vs Supabase
    const syncCard = document.createElement('div');
    syncCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
    syncCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">🔄 Sync localStorage ↔ Supabase</div>';
    const syncGrid = document.createElement('div');
    syncGrid.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

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
      const chDiv = document.createElement('div');
      chDiv.style.cssText = 'padding:6px 10px;background:var(--bg-primary);border-radius:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border:1px solid transparent;transition:border-color 0.15s;';
      chDiv.innerHTML = `<span><b>${station.nom}</b> — Chauffeurs</span><span style="color:${chSync ? '#4ade80' : '#f87171'};">${chSync ? '✅' : '⚠️'} Local: ${localCh.length} | Supabase: ${sbChCount || 0}</span>`;
      chDiv.onmouseenter = () => chDiv.style.borderColor = 'var(--accent)';
      chDiv.onmouseleave = () => chDiv.style.borderColor = 'transparent';
      chDiv.onclick = () => showSyncDetail('chauffeurs', sid, station.nom, localCh.length, sbChCount || 0);
      syncGrid.appendChild(chDiv);

      // Vérifier heures
      let localHeuresCount = 0;
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(sid + '-heures-')) localHeuresCount++; }
      const { count: sbHeuresCount } = await sb().from('heures').select('*', { count: 'exact', head: true }).eq('station_id', sid);
      const hSync = localHeuresCount === (sbHeuresCount || 0);
      if (!hSync) syncIssues++;
      const hDiv = document.createElement('div');
      hDiv.style.cssText = 'padding:6px 10px;background:var(--bg-primary);border-radius:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border:1px solid transparent;transition:border-color 0.15s;';
      hDiv.innerHTML = `<span><b>${station.nom}</b> — Heures</span><span style="color:${hSync ? '#4ade80' : '#fbbf24'};">${hSync ? '✅' : '⚠️'} Local: ${localHeuresCount} | Supabase: ${sbHeuresCount || 0}</span>`;
      hDiv.onmouseenter = () => hDiv.style.borderColor = 'var(--accent)';
      hDiv.onmouseleave = () => hDiv.style.borderColor = 'transparent';
      hDiv.onclick = () => showSyncDetail('heures', sid, station.nom, localHeuresCount, sbHeuresCount || 0);
      syncGrid.appendChild(hDiv);

      // Vérifier planning
      let localPlanCount = 0;
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(sid + '-planning-') && !k.includes('-meta-')) localPlanCount++; }
      const { count: sbPlanCount } = await sb().from('planning').select('*', { count: 'exact', head: true }).eq('station_id', sid);
      const pSync = localPlanCount === (sbPlanCount || 0);
      if (!pSync) syncIssues++;
      const pDiv = document.createElement('div');
      pDiv.style.cssText = 'padding:6px 10px;background:var(--bg-primary);border-radius:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border:1px solid transparent;transition:border-color 0.15s;';
      pDiv.innerHTML = `<span><b>${station.nom}</b> — Planning</span><span style="color:${pSync ? '#4ade80' : '#fbbf24'};">${pSync ? '✅' : '⚠️'} Local: ${localPlanCount} | Supabase: ${sbPlanCount || 0}</span>`;
      pDiv.onmouseenter = () => pDiv.style.borderColor = 'var(--accent)';
      pDiv.onmouseleave = () => pDiv.style.borderColor = 'transparent';
      pDiv.onclick = () => showSyncDetail('planning', sid, station.nom, localPlanCount, sbPlanCount || 0);
      syncGrid.appendChild(pDiv);
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
