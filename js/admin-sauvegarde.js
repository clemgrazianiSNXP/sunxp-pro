/* js/admin-sauvegarde.js — Onglet Sauvegarde (SunXP Pro Admin) */
console.log('admin-sauvegarde.js chargé');

function renderAdminSauvegarde(container) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;max-width:600px;';

  const exportCard = document.createElement('div');
  exportCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  exportCard.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">📥 Exporter les données</div><p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Télécharge un fichier JSON avec toutes les données de toutes les stations.</p><button id="admin-export-btn" class="rep-btn rep-btn-primary">Exporter tout</button><div id="admin-export-progress" style="margin-top:8px;font-size:11px;color:var(--text-muted);"></div>`;
  wrap.appendChild(exportCard);

  const restoreCard = document.createElement('div');
  restoreCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  restoreCard.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">📤 Restaurer depuis un backup</div><p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Importe un fichier JSON pour restaurer les données.</p><input type="file" id="admin-restore-file" accept=".json" style="font-size:12px;"><div id="admin-restore-status" style="margin-top:8px;font-size:11px;color:var(--text-muted);"></div>`;
  wrap.appendChild(restoreCard);

  // Historique des backups
  const historyCard = document.createElement('div');
  historyCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  historyCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:8px;">📋 Historique des backups</div><p style="font-size:11px;color:var(--text-muted);">Chargement...</p>';
  wrap.appendChild(historyCard);

  container.appendChild(wrap);

  // Charger l'historique
  (async () => {
    try {
      const { data } = await sb().from('app_settings').select('value').eq('key', 'backup_history').maybeSingle();
      const history = (data && data.value && Array.isArray(data.value)) ? data.value : [];
      historyCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:10px;">📋 Historique des backups</div>';
      if (!history.length) {
        historyCard.innerHTML += '<div style="padding:10px;background:rgba(255,170,0,0.1);border:1px solid #ffaa00;border-radius:6px;font-size:11px;color:#ffaa00;">⚠️ Aucun backup enregistré. Pensez à exporter régulièrement vos données.</div>';
      } else {
        const list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
        history.slice(0, 10).forEach(h => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--bg-primary);border-radius:6px;font-size:11px;';
          const date = h.date ? new Date(h.date).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '?';
          row.innerHTML = `<span style="color:var(--text-primary);">📦 ${date}</span><span style="color:var(--text-muted);font-family:monospace;font-size:10px;">${h.email || '?'} · ${h.tables || '?'} tables</span>`;
          list.appendChild(row);
        });
        historyCard.appendChild(list);
      }
    } catch (_) { historyCard.innerHTML += '<p style="color:#f87171;font-size:11px;">Erreur chargement historique</p>'; }
  })();

  setTimeout(() => {
    document.getElementById('admin-export-btn')?.addEventListener('click', async () => {
      const prog = document.getElementById('admin-export-progress');
      const tables = ['stations','chauffeurs','heures','stats','primes','activite','planning','planning_meta','planning_published','degats','camions','repos_demandes','acomptes','conges_payes','cles_codes','problemes_camions','user_profiles','responsables','eos','concessions','retards','absences'];
      const backup = { version: '1.0', exported_at: new Date().toISOString(), exported_by: currentUser?.email || '', tables: {} };
      let done = 0;
      for (const t of tables) {
        prog.textContent = `Export ${t}... (${done}/${tables.length})`;
        try { const { data } = await sb().from(t).select('*'); backup.tables[t] = data || []; } catch (_) { backup.tables[t] = []; }
        done++;
      }
      prog.textContent = '✅ Export terminé ! Téléchargement...';
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = 'sunxp-backup-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json';
      a.click(); URL.revokeObjectURL(url);
      if (window.logActivity) window.logActivity('admin_export', { tables: Object.keys(backup.tables).length });
      // Sauvegarder dans l'historique des backups
      try {
        const { data: histData } = await sb().from('app_settings').select('value').eq('key', 'backup_history').maybeSingle();
        const history = (histData && histData.value && Array.isArray(histData.value)) ? histData.value : [];
        history.unshift({ date: new Date().toISOString(), email: currentUser?.email || '', tables: Object.keys(backup.tables).length });
        if (history.length > 20) history.length = 20;
        await sb().from('app_settings').upsert({ key: 'backup_history', value: history, updated_at: new Date().toISOString(), updated_by: currentUser?.email || '' });
      } catch (_) {}
    });

    document.getElementById('admin-restore-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const status = document.getElementById('admin-restore-status');
      try {
        const text = await file.text(); const json = JSON.parse(text);
        if (!json.version || !json.tables) { status.textContent = '❌ Fichier invalide (pas de version/tables)'; return; }
        const tableNames = Object.keys(json.tables);
        if (!confirm(`Restaurer ${tableNames.length} tables ? (${tableNames.join(', ')})`)) return;
        status.textContent = 'Restauration en cours...';

        const CONFLICT_MAP = { stations:'id', heures:'station_id,date_jour', stats:'station_id,type,semaine', primes:'station_id,annee,mois', activite:'station_id,date_jour', concessions:'station_id,semaine', retards:'station_id,semaine', camions:'station_id', documents:'station_id', repos_demandes:'station_id', eos:'station_id,date_jour', acomptes:'station_id', conges_payes:'station_id', cles_codes:'station_id', problemes_camions:'station_id', user_profiles:'id', app_settings:'key', absences:'station_id,semaine' };
        const DELETE_INSERT_TABLES = ['chauffeurs','degats','activity_logs','responsables','planning','planning_meta'];
        // Tables à structure inconnue — try/catch séparé
        const FRAGILE_TABLES = ['planning_published', 'push_subscriptions'];

        let restored = 0, errors = [], lsUpdated = 0;

        for (const [table, rows] of Object.entries(json.tables)) {
          if (!rows || !rows.length) continue;
          status.textContent = `Restauration ${table}... (${restored}/${tableNames.length})`;

          // Tables fragiles (structure inconnue) — try/catch isolé
          if (FRAGILE_TABLES.includes(table)) {
            try {
              const cleanRows = rows.map(r => { const { id, ...rest } = r; return rest; });
              await sb().from(table).delete().not('id', 'is', null);
              if (cleanRows.length) {
                for (let i = 0; i < cleanRows.length; i += 500) { await sb().from(table).insert(cleanRows.slice(i, i + 500)); }
              }
              restored++;
            } catch (err) {
              errors.push(`${table}: structure inconnue — ${err.message}`);
              console.warn(`⚠️ Table fragile "${table}" échouée:`, err.message);
            }
            continue;
          }

          try {
            if (DELETE_INSERT_TABLES.includes(table)) {
              const cleanRows = rows.map(r => { const { id, ...rest } = r; return rest; });
              await sb().from(table).delete().not('id', 'is', null);
              if (cleanRows.length) {
                for (let i = 0; i < cleanRows.length; i += 500) { await sb().from(table).insert(cleanRows.slice(i, i + 500)); }
              }

              // Sync localStorage pour planning
              if (table === 'planning') {
                for (const row of rows) {
                  if (row.station_id && row.year && row.month && row.data) {
                    const key = row.station_id + '-planning-' + row.year + '-' + String(row.month).padStart(2, '0');
                    localStorage.setItem(key, JSON.stringify(row.data));
                    lsUpdated++;
                  }
                }
              }

            } else if (CONFLICT_MAP[table]) {
              const keepId = ['stations','user_profiles','app_settings'].includes(table);
              const cleanRows = keepId ? rows : rows.map(r => { const { id, ...rest } = r; return rest; });
              for (let i = 0; i < cleanRows.length; i += 500) { await sb().from(table).upsert(cleanRows.slice(i, i + 500), { onConflict: CONFLICT_MAP[table] }); }

              // Sync localStorage pour camions
              if (table === 'camions') {
                const byStation = {};
                for (const row of rows) {
                  if (!row.station_id) continue;
                  if (!byStation[row.station_id]) byStation[row.station_id] = [];
                  if (row.data) byStation[row.station_id].push(...(Array.isArray(row.data) ? row.data : []));
                }
                for (const [sid, list] of Object.entries(byStation)) {
                  localStorage.setItem(sid + '-camions', JSON.stringify(list));
                  lsUpdated++;
                }
              }

            } else {
              await sb().from(table).upsert(rows);
            }
            restored++;
          } catch (err) {
            errors.push(`${table}: ${err.message}`);
            console.error('Restore error for', table, ':', err);
          }
        }

        // Résumé final
        let html = `<div style="margin-top:8px;">`;
        html += `<div style="font-size:13px;font-weight:700;color:#4ade80;margin-bottom:6px;">✅ Restauration terminée</div>`;
        html += `<div style="font-size:11px;color:var(--text-primary);margin-bottom:4px;">📦 ${restored} tables restaurées avec succès</div>`;
        if (lsUpdated) html += `<div style="font-size:11px;color:var(--text-primary);margin-bottom:4px;">💾 ${lsUpdated} entrées localStorage mises à jour</div>`;
        if (errors.length) {
          html += `<div style="font-size:11px;color:#f87171;margin-bottom:4px;">⚠️ ${errors.length} erreur(s) :</div>`;
          errors.forEach(e => { html += `<div style="font-size:10px;color:#f87171;padding-left:8px;">• ${e}</div>`; });
        }
        html += `<div style="font-size:10px;color:var(--text-muted);margin-top:8px;font-style:italic;">⚠️ Si certaines données n'apparaissent pas, rechargez la page.</div>`;
        html += `<button onclick="window.location.reload()" class="rep-btn rep-btn-primary" style="margin-top:10px;font-size:11px;padding:8px 16px;">🔄 Recharger l'application</button>`;
        html += `</div>`;
        status.innerHTML = html;

        if (window.logActivity) window.logActivity('admin_restore', { tables: restored, errors: errors.length, localStorage: lsUpdated });
      } catch (err) { status.textContent = '❌ Erreur: ' + err.message; }
    });
  }, 0);
}
