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
  container.appendChild(wrap);

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
        const DELETE_INSERT_TABLES = ['chauffeurs','degats','activity_logs','responsables','planning','planning_meta','planning_published','push_subscriptions'];
        let restored = 0, errors = [];
        for (const [table, rows] of Object.entries(json.tables)) {
          if (!rows || !rows.length) continue;
          status.textContent = `Restauration ${table}... (${restored}/${tableNames.length})`;
          try {
            if (DELETE_INSERT_TABLES.includes(table)) {
              const cleanRows = rows.map(r => { const { id, ...rest } = r; return rest; });
              await sb().from(table).delete().neq('id', 0);
              if (cleanRows.length) { for (let i = 0; i < cleanRows.length; i += 500) { await sb().from(table).insert(cleanRows.slice(i, i + 500)); } }
            } else if (CONFLICT_MAP[table]) {
              const keepId = ['stations','user_profiles','app_settings'].includes(table);
              const cleanRows = keepId ? rows : rows.map(r => { const { id, ...rest } = r; return rest; });
              for (let i = 0; i < cleanRows.length; i += 500) { await sb().from(table).upsert(cleanRows.slice(i, i + 500), { onConflict: CONFLICT_MAP[table] }); }
            } else { await sb().from(table).upsert(rows); }
            restored++;
          } catch (err) { errors.push(`${table}: ${err.message}`); console.error('Restore error for', table, ':', err); }
        }
        if (errors.length) { status.innerHTML = `✅ ${restored} tables restaurées.<br><span style="color:#f87171;">⚠️ Erreurs: ${errors.join(', ')}</span>`; }
        else { status.textContent = `✅ ${restored} tables restaurées avec succès !`; }
        if (window.logActivity) window.logActivity('admin_restore', { tables: restored, errors: errors.length });
      } catch (err) { status.textContent = '❌ Erreur: ' + err.message; }
    });
  }, 0);
}
