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
        createBtn.onclick = async () => {
          const email = c.email;
          const amazonPart = (c.id_amazon || '').slice(0, 4);
          const telDigits = (c.telephone || '').replace(/\D/g, '');
          const telPart = telDigits.slice(-4);
          const mdp = amazonPart + telPart;
          if (mdp.length < 6) { alert('Impossible : mot de passe trop court (ID Amazon ou téléphone manquant)'); return; }
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
              options: { data: { nom: c.nom, prenom: c.prenom, role: 'chauffeur' } }
            });
            if (signUpErr) { alert('Erreur: ' + signUpErr.message); createBtn.textContent = '+ Créer le compte'; createBtn.disabled = false; return; }
            const userId = signUpData?.user?.id;
            if (signUpData?.user?.identities?.length === 0) { alert('Ce compte existe déjà: ' + email); createBtn.textContent = '⚠️ Existe'; createBtn.disabled = false; return; }
            // Insérer dans user_profiles
            if (userId) {
              await sb().from('user_profiles').upsert({
                id: userId, role: 'chauffeur', station_id: c.station_id || '',
                chauffeur_id: c.id_amazon || '', nom: c.nom || '', prenom: c.prenom || ''
              });
            }
            createBtn.textContent = '✅ Créé';
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
  } catch (e) { container.innerHTML = '<p style="color:#f87171;">Erreur: ' + e.message + '</p>'; }
}
