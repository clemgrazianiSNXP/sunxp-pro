/* js/admin-utilisateurs.js — Onglet Utilisateurs (SunXP Pro Admin) */

async function renderAdminUtilisateurs(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  try {
    const { data: profiles } = await sb().from('user_profiles').select('*');

    // ── Section "Chauffeurs sans compte" ──
    const { data: allChauffeurs } = await sb().from('chauffeurs').select('*');
    const profileIds = (profiles || []).map(p => p.chauffeur_id).filter(Boolean);
    const sansCompte = (allChauffeurs || []).filter(c => c.email && c.id_amazon && !profileIds.includes(c.id_amazon));

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    if (sansCompte.length > 0) {
      const scSection = document.createElement('div');
      scSection.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;';
      scSection.innerHTML = `<div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:10px;">⚠️ Chauffeurs sans compte (${sansCompte.length})</div>`;
      const scList = document.createElement('div');
      scList.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

      sansCompte.forEach(c => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-primary);border-radius:6px;font-size:11px;';
        row.innerHTML = `
          <span style="font-weight:700;flex:1;color:var(--text-primary);">${c.prenom || ''} ${c.nom || ''}</span>
          <span style="color:var(--text-muted);font-size:10px;">${c.station_id || ''}</span>
          <span style="color:var(--accent);font-size:10px;font-family:monospace;">${c.id_amazon || ''}</span>
          <span style="color:var(--text-muted);font-size:10px;">${c.email || ''}</span>
        `;
        const createBtn = document.createElement('button');
        createBtn.className = 'h-btn';
        createBtn.style.cssText = 'font-size:9px;padding:3px 8px;color:#4ade80;border-color:#4ade80;white-space:nowrap;';
        createBtn.textContent = '+ Créer le compte';
        createBtn.onclick = async (e) => {
          e.stopPropagation();
          console.log('🔧 Créer le compte cliqué pour:', c.email, c.id_amazon);
          const email = c.email;
          if (!email) { alert('Pas d\'email pour ce chauffeur'); return; }
          const amazonPart = (c.id_amazon || '').slice(0, 4);
          const telDigits = (c.telephone || '').replace(/\D/g, '');
          const telPart = telDigits.slice(-4);
          let mdp = amazonPart + telPart;
          if (mdp.length < 6) mdp = mdp + '0000'.slice(0, 6 - mdp.length); // Compléter à 6 min
          createBtn.textContent = '⏳...'; createBtn.disabled = true;
          try {
            // Créer le compte via un client séparé
            const signUpClient = window.supabase.createClient(
              'https://uqgwmrvtjulpbblucrht.supabase.co',
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3dtcnZ0anVscGJibHVjcmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODA0MDcsImV4cCI6MjA5MjM1NjQwN30.h1NkKsNuqFubREY0Zzt2VIJYqjJHKn14BUALocVwk5s',
              { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
            );
            const { data: signUpData, error: signUpErr } = await signUpClient.auth.signUp({
              email: email,
              password: mdp,
              options: { 
                data: { nom: c.nom, prenom: c.prenom, role: 'chauffeur' },
                emailRedirectTo: window.location.origin
              }
            });
            console.log('signUp result:', { signUpData, signUpErr });
            if (signUpErr) { alert('Erreur: ' + signUpErr.message); createBtn.textContent = '+ Créer le compte'; createBtn.disabled = false; return; }
            const userId = signUpData?.user?.id;
            if (signUpData?.user?.identities?.length === 0) { alert('Ce compte existe déjà: ' + email); createBtn.textContent = '⚠️ Existe'; createBtn.disabled = false; return; }
            // Insérer dans user_profiles
            if (userId) {
              const { error: profileErr } = await sb().from('user_profiles').upsert({
                id: userId, role: 'chauffeur', station_id: c.station_id || '',
                chauffeur_id: c.id_amazon || '', nom: c.nom || '', prenom: c.prenom || ''
              });
              if (profileErr) console.warn('Profile insert error:', profileErr.message);
            }
            createBtn.textContent = '✅ Créé (mdp: ' + mdp + ')';
            createBtn.style.color = '#4ade80';
            if (window.logActivity) window.logActivity('admin_create_account', { email, nom: c.prenom + ' ' + c.nom, station: c.station_id });
          } catch (err) { alert('Erreur: ' + err.message); createBtn.textContent = '+ Créer le compte'; createBtn.disabled = false; }
        };
        row.appendChild(createBtn);
        scList.appendChild(row);
      });

      scSection.appendChild(scList);
      wrap.appendChild(scSection);
    }

    wrap.innerHTML += `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">👥 Comptes utilisateurs (${(profiles||[]).length})</div>`;
    if (profiles && profiles.length) {
      profiles.forEach(p => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:8px;font-size:12px;';
        const isAlumni = p.statut === 'alumni';
        const statutBadge = isAlumni
          ? '<span style="background:#6b7280;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">ALUMNI</span>'
          : '<span style="background:#4ade80;color:#000;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">ACTIF</span>';
        div.innerHTML = `
          ${statutBadge}
          <span style="font-weight:700;flex:1;">${p.prenom || ''} ${p.nom || ''}</span>
          <span style="color:var(--accent);">${p.role}</span>
          <span style="color:var(--text-muted);font-size:10px;">${p.station_id || '—'}</span>
          <span style="color:var(--text-muted);font-size:10px;">${p.chauffeur_id || ''}</span>
          <button class="h-btn admin-reset-pwd" data-uid="${p.id}" data-name="${(p.prenom || '') + ' ' + (p.nom || '')}" style="font-size:10px;padding:4px 8px;color:#fbbf24;border-color:#fbbf24;">🔑 Reset MDP</button>
          <button class="h-btn admin-alumni-toggle" data-uid="${p.id}" data-name="${(p.prenom || '') + ' ' + (p.nom || '')}" data-statut="${p.statut || 'actif'}" style="font-size:10px;padding:4px 8px;color:${isAlumni ? '#4ade80' : '#6b7280'};border-color:${isAlumni ? '#4ade80' : '#6b7280'};">${isAlumni ? '✅ Réactiver' : '📦 Alumni'}</button>
          <button class="h-btn admin-delete-user" data-uid="${p.id}" data-name="${(p.prenom || '') + ' ' + (p.nom || '')}" style="font-size:10px;padding:4px 8px;color:#f87171;border-color:#f87171;">🗑 Supprimer</button>
          <button class="h-btn admin-export-rgpd" data-uid="${p.id}" data-name="${(p.prenom || '') + ' ' + (p.nom || '')}" data-station="${p.station_id || ''}" data-chauffeur="${p.chauffeur_id || ''}" style="font-size:10px;padding:4px 8px;color:#58a6ff;border-color:#58a6ff;">📥 RGPD</button>
        `;
        wrap.appendChild(div);
      });
    } else {
      wrap.innerHTML += '<p style="color:var(--text-muted);">Aucun profil trouvé.</p>';
    }
    container.innerHTML = '';
    container.appendChild(wrap);

    // Bind boutons Alumni toggle
    container.querySelectorAll('.admin-alumni-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const name = btn.dataset.name;
        const currentStatut = btn.dataset.statut;

        if (currentStatut === 'alumni') {
          // Réactiver
          if (!confirm(`Réactiver le compte de ${name.trim()} ?`)) return;
          btn.textContent = '⏳...'; btn.disabled = true;
          const { error } = await sb().from('user_profiles').update({ statut: 'actif', alumni_expiration: null }).eq('id', uid);
          if (error) { alert('Erreur: ' + error.message); btn.textContent = '✅ Réactiver'; btn.disabled = false; return; }
          if (window.logActivity) window.logActivity('admin_reactivate_user', { user_id: uid, nom: name.trim() });
          renderAdminUtilisateurs(container);
        } else {
          // Passer en alumni — modale date expiration
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
          overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
          const modal = document.createElement('div');
          modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:24px;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
          modal.innerHTML = `
            <h3 style="margin:0 0 12px;font-size:15px;color:var(--text-primary);">📦 Passer en Alumni</h3>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">${name.trim()} aura accès uniquement à ses documents.</p>
            <label style="font-size:11px;color:var(--text-muted);">Date d'expiration (optionnel) :</label>
            <input type="date" id="alumni-exp-date" class="rep-input" style="padding:8px;margin-top:4px;margin-bottom:16px;">
            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <button class="h-btn" id="alumni-cancel" style="padding:8px 14px;">Annuler</button>
              <button class="rep-btn rep-btn-primary" id="alumni-confirm" style="padding:8px 14px;">Confirmer</button>
            </div>
          `;
          overlay.appendChild(modal);
          document.body.appendChild(overlay);
          modal.querySelector('#alumni-cancel').onclick = () => overlay.remove();
          modal.querySelector('#alumni-confirm').onclick = async () => {
            const expDate = modal.querySelector('#alumni-exp-date').value || null;
            overlay.remove();
            btn.textContent = '⏳...'; btn.disabled = true;
            const { error } = await sb().from('user_profiles').update({ statut: 'alumni', alumni_expiration: expDate }).eq('id', uid);
            if (error) { alert('Erreur: ' + error.message); btn.textContent = '📦 Alumni'; btn.disabled = false; return; }
            if (window.logActivity) window.logActivity('admin_set_alumni', { user_id: uid, nom: name.trim(), expiration: expDate });
            renderAdminUtilisateurs(container);
          };
        }
      });
    });

    container.querySelectorAll('.admin-reset-pwd').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid; const name = btn.dataset.name;
        const newPwd = prompt(`Nouveau mot de passe pour ${name.trim()} :`);
        if (!newPwd || newPwd.length < 6) { alert('Mot de passe trop court (min 6 caractères)'); return; }
        btn.textContent = '⏳...'; btn.disabled = true;
        try {
          const { data, error } = await sb().functions.invoke('admin-reset-password', { body: { user_id: uid, new_password: newPwd } });
          if (error) { alert('Erreur: ' + error.message); btn.textContent = '🔑 Reset MDP'; }
          else { alert('✅ Mot de passe réinitialisé pour ' + name.trim()); btn.textContent = '✅ OK'; if (window.logActivity) window.logActivity('admin_reset_password', { user_id: uid, nom: name.trim() }); }
        } catch (e) { alert('Erreur: ' + e.message); btn.textContent = '🔑 Reset MDP'; }
        btn.disabled = false;
      });
    });

    container.querySelectorAll('.admin-delete-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid; const name = btn.dataset.name;
        if (!confirm(`⚠️ Supprimer définitivement le compte de ${name.trim()} ?\n\nCette action est irréversible.`)) return;
        btn.textContent = '⏳...'; btn.disabled = true;
        try {
          const { error: profileErr } = await sb().from('user_profiles').delete().eq('id', uid);
          if (profileErr) { alert('Erreur suppression profil: ' + profileErr.message); btn.textContent = '🗑 Supprimer'; btn.disabled = false; return; }
          const { error } = await sb().functions.invoke('admin-delete-user', { body: { user_id: uid } });
          if (error) { alert('Profil supprimé mais erreur auth: ' + error.message); }
          else { alert('✅ Compte supprimé: ' + name.trim()); if (window.logActivity) window.logActivity('admin_delete_user', { user_id: uid, nom: name.trim() }); }
          renderAdminUtilisateurs(container);
        } catch (e) { alert('Erreur: ' + e.message); btn.textContent = '🗑 Supprimer'; btn.disabled = false; }
      });
    });

    // Bind boutons Export RGPD
    container.querySelectorAll('.admin-export-rgpd').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const nom = btn.dataset.name.trim();
        const stationId = btn.dataset.station;
        const chauffeurId = btn.dataset.chauffeur;
        btn.textContent = '⏳...'; btn.disabled = true;

        // Récupérer le profil
        const p = (profiles || []).find(pr => pr.id === uid) || {};

        // Collecter les données
        const exportData = { heures: [], stats_dsdpmo: [], primes: [], docs_employes: [], game_scores: [] };

        try {
          if (stationId && chauffeurId) {
            // Heures
            const { data: heuresRows } = await sb().from('heures').select('date_jour, data').eq('station_id', stationId);
            if (heuresRows) {
              heuresRows.forEach(row => {
                if (row.data && row.data.rows) {
                  Object.values(row.data.rows).forEach(r => {
                    if (r.nom && r.nom.trim() === nom) {
                      exportData.heures.push({ date: row.date_jour, statut: r.statut || '', heureVague: r.heureVague || '', retourDepot: r.retourDepot || '', pause: r.pause || '' });
                    }
                  });
                }
              });
            }

            // Stats
            const { data: statsRows } = await sb().from('stats').select('*').eq('station_id', stationId);
            if (statsRows) {
              statsRows.forEach(s => {
                if (s.data && Array.isArray(s.data)) {
                  s.data.forEach(d => {
                    if (d.nom && d.nom.trim() === nom) {
                      exportData.stats_dsdpmo.push({ semaine: s.semaine, colis: d.colis || '', dcrPct: d.dcrPct || '', dnrDpmo: d.dnrDpmo || '' });
                    }
                  });
                }
              });
            }

            // Primes
            const { data: primesRows } = await sb().from('primes').select('*').eq('station_id', stationId);
            if (primesRows) {
              primesRows.forEach(pr => {
                if (pr.data && pr.data[chauffeurId]) {
                  const row = pr.data[chauffeurId];
                  exportData.primes.push({ annee: pr.annee, mois: pr.mois, jours: row.jours || '', absences: row.absences || '' });
                }
              });
            }

            // Docs employes
            const { data: docsRows } = await sb().from('docs_employes').select('*').eq('station_id', stationId).eq('chauffeur_nom', nom);
            if (docsRows) {
              docsRows.forEach(d => {
                if (d.data && Array.isArray(d.data)) exportData.docs_employes.push(...d.data);
              });
            }

            // Game scores
            const { data: gameRows } = await sb().from('game_scores').select('*').eq('chauffeur_id', chauffeurId).eq('station_id', stationId);
            if (gameRows) exportData.game_scores = gameRows;
          }
        } catch (e) { console.warn('RGPD export data error:', e.message); }

        // Générer un fichier HTML lisible
        const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
        const formatDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR') : '—';

        let html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Données personnelles — ${nom}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #1a1a2e; }
  h1 { color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 8px; }
  h2 { color: #0066cc; margin-top: 32px; font-size: 16px; border-left: 4px solid #0066cc; padding-left: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #0066cc; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 7px 12px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) { background: #f5f8ff; }
  .meta { background: #f0f4ff; border: 1px solid #ccd9ff; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; }
  .empty { color: #999; font-style: italic; font-size: 13px; padding: 8px 0; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 12px; }
</style>
</head>
<body>
<h1>📋 Données personnelles — ${nom}</h1>
<div class="meta">
  <strong>Date d'export :</strong> ${formatDateTime(new Date().toISOString())}<br>
  <strong>Objet :</strong> Exercice du droit d'accès RGPD<br>
  <strong>Responsable du traitement :</strong> SunXP Pro — M. Battaglia<br>
  <strong>Contact :</strong> RHsunxp@outlook.fr
</div>

<h2>👤 Informations personnelles</h2>
<table>
  <tr><th>Champ</th><th>Valeur</th></tr>
  <tr><td>Nom</td><td>${p.nom || '—'}</td></tr>
  <tr><td>Prénom</td><td>${p.prenom || '—'}</td></tr>
  <tr><td>Rôle</td><td>${p.role || '—'}</td></tr>
  <tr><td>Station</td><td>${p.station_id || '—'}</td></tr>
  <tr><td>ID Amazon</td><td>${p.chauffeur_id || '—'}</td></tr>
  <tr><td>Statut</td><td>${p.statut || 'actif'}</td></tr>
</table>

<h2>⏰ Heures travaillées (${exportData.heures.length} entrées)</h2>
${exportData.heures.length ? `
<table>
  <tr><th>Date</th><th>Statut</th><th>Heure départ</th><th>Retour dépôt</th><th>Pause</th></tr>
  ${exportData.heures.slice(0, 100).map(h => `
  <tr>
    <td>${formatDate(h.date)}</td>
    <td>${h.statut || '—'}</td>
    <td>${h.heureVague || '—'}</td>
    <td>${h.retourDepot || '—'}</td>
    <td>${h.pause || '—'} min</td>
  </tr>`).join('')}
  ${exportData.heures.length > 100 ? `<tr><td colspan="5" style="color:#999;font-style:italic;">... et ${exportData.heures.length - 100} entrées supplémentaires</td></tr>` : ''}
</table>` : '<p class="empty">Aucune donnée d\'heures.</p>'}

<h2>📊 Statistiques de performance (${exportData.stats_dsdpmo.length} semaines)</h2>
${exportData.stats_dsdpmo.length ? `
<table>
  <tr><th>Semaine</th><th>Colis livrés</th><th>DCR %</th><th>DNR DPMO</th></tr>
  ${exportData.stats_dsdpmo.map(s => `
  <tr>
    <td>${s.semaine || '—'}</td>
    <td>${s.colis || '—'}</td>
    <td>${s.dcrPct || '—'} %</td>
    <td>${s.dnrDpmo || '—'}</td>
  </tr>`).join('')}
</table>` : '<p class="empty">Aucune statistique disponible.</p>'}

<h2>💰 Primes (${exportData.primes.length} mois)</h2>
${exportData.primes.length ? `
<table>
  <tr><th>Période</th><th>Jours travaillés</th><th>Prime base</th><th>Absences</th></tr>
  ${exportData.primes.map(pr => `
  <tr>
    <td>${pr.annee || '—'} / ${pr.mois || '—'}</td>
    <td>${pr.jours || '—'}</td>
    <td>${pr.jours ? (pr.jours >= 16 ? '140' : '—') : '—'} €</td>
    <td>${pr.absences || '0'}</td>
  </tr>`).join('')}
</table>` : '<p class="empty">Aucune donnée de prime.</p>'}

<h2>📄 Documents RH (${exportData.docs_employes.length} documents)</h2>
${exportData.docs_employes.length ? `
<table>
  <tr><th>Document</th><th>Date d'ajout</th><th>Lien</th></tr>
  ${exportData.docs_employes.map(d => `
  <tr>
    <td>${d.docName || d.nom_document || '—'}</td>
    <td>${formatDate(d.createdAt || d.created_at)}</td>
    <td>${d.fileUrl ? `<a href="${d.fileUrl}" target="_blank">Voir le document</a>` : '—'}</td>
  </tr>`).join('')}
</table>` : '<p class="empty">Aucun document RH.</p>'}

<h2>🎮 Scores de jeux (${exportData.game_scores.length} entrées)</h2>
${exportData.game_scores.length ? `
<table>
  <tr><th>Jeu</th><th>Score</th><th>Date</th></tr>
  ${exportData.game_scores.map(s => `
  <tr>
    <td>${s.game_id || '—'}</td>
    <td>${s.score || '—'}</td>
    <td>${formatDate(s.created_at)}</td>
  </tr>`).join('')}
</table>` : '<p class="empty">Aucun score de jeu.</p>'}

<div class="footer">
  Document généré le ${formatDateTime(new Date().toISOString())} par SunXP Pro.<br>
  Pour toute question : RHsunxp@outlook.fr — Conformément au Règlement (UE) 2016/679 (RGPD).
</div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = 'donnees-rgpd-' + nom.replace(/\s/g, '-').toLowerCase() + '-' + new Date().toISOString().slice(0, 10) + '.html';
        a.click(); URL.revokeObjectURL(url);

        btn.textContent = '✅ Exporté'; btn.disabled = false;
        if (window.logActivity) window.logActivity('admin_export_rgpd', { user_id: uid, nom });
        alert('✅ Export RGPD généré pour ' + nom);
      });
    });
  } catch (e) { container.innerHTML = '<p style="color:#f87171;">Erreur: ' + e.message + '</p>'; }
}
