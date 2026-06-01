/* js/alumni-portal.js — Portail Alumni (anciens employés) (SunXP Pro) */

/**
 * Affiche le portail alumni : page simple avec documents téléchargeables.
 * Appelé depuis auth.js quand currentProfile.statut === 'alumni'.
 */
async function showAlumniPortal() {
  // Cacher toute l'app
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) appLayout.style.display = 'none';
  const roleScreen = document.getElementById('role-screen');
  if (roleScreen) roleScreen.hidden = true;
  const stationScreen = document.getElementById('station-screen');
  if (stationScreen) { stationScreen.hidden = true; stationScreen.style.display = 'none'; }
  const loginPage = document.getElementById('login-page');
  if (loginPage) loginPage.style.display = 'none';

  // Créer l'écran alumni
  let alumniScreen = document.getElementById('alumni-screen');
  if (!alumniScreen) {
    alumniScreen = document.createElement('div');
    alumniScreen.id = 'alumni-screen';
    alumniScreen.style.cssText = 'position:fixed;inset:0;z-index:9998;background:var(--bg-primary);display:flex;flex-direction:column;overflow:hidden;';
    document.body.appendChild(alumniScreen);
  }
  alumniScreen.hidden = false;
  alumniScreen.style.display = 'flex';
  alumniScreen.innerHTML = '';

  const nom = ((currentProfile.prenom || '') + ' ' + (currentProfile.nom || '')).trim();

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:var(--bg-sidebar);border-bottom:1px solid var(--border);flex-shrink:0;';
  header.innerHTML = `
    <div>
      <div style="font-size:16px;font-weight:700;color:var(--text-primary);">📦 Espace Alumni</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Bonjour ${nom}</div>
    </div>
    <button id="alumni-logout-btn" class="h-btn" style="color:#f87171;border-color:#f87171;font-size:12px;">🚪 Déconnexion</button>
  `;
  alumniScreen.appendChild(header);

  // Contenu
  const content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;padding:24px;display:flex;flex-direction:column;align-items:center;gap:16px;';
  content.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Chargement de vos documents...</p>';
  alumniScreen.appendChild(content);

  // Bind déconnexion
  header.querySelector('#alumni-logout-btn').onclick = async () => {
    if (sb()) await sb().auth.signOut();
    window.location.reload();
  };

  // Charger les documents depuis Supabase
  try {
    if (!sb()) { content.innerHTML = '<p style="color:var(--text-muted);">Connexion indisponible.</p>'; return; }

    // Chercher les documents par nom complet (prenom nom ou nom prenom)
    const nomComplet1 = (currentProfile.prenom || '') + ' ' + (currentProfile.nom || '');
    const nomComplet2 = (currentProfile.nom || '') + ' ' + (currentProfile.prenom || '');

    const { data: docs, error } = await sb()
      .from('docs_employes')
      .select('*')
      .or(`chauffeur_nom.eq.${nomComplet1.trim()},chauffeur_nom.eq.${nomComplet2.trim()}`);

    if (error) {
      content.innerHTML = `<p style="color:#f87171;">Erreur: ${error.message}</p>`;
      return;
    }

    content.innerHTML = '';

    // Titre
    const title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);align-self:flex-start;';
    title.textContent = '📄 Mes documents';
    content.appendChild(title);

    if (!docs || !docs.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px;';
      empty.innerHTML = '<div style="font-size:40px;margin-bottom:12px;">📭</div>Aucun document disponible pour le moment.<br><span style="font-size:11px;">Contactez votre ancien responsable si vous pensez qu\'il manque des documents.</span>';
      content.appendChild(empty);
    } else {
      const grid = document.createElement('div');
      grid.style.cssText = 'display:flex;flex-direction:column;gap:10px;width:100%;max-width:500px;';

      docs.forEach(doc => {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;';

        const icon = document.createElement('div');
        icon.style.cssText = 'font-size:24px;flex-shrink:0;';
        icon.textContent = '📄';

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;';
        info.innerHTML = `
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${doc.nom_document || doc.type || 'Document'}</div>
          <div style="font-size:10px;color:var(--text-muted);">${doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : ''}</div>
        `;

        const dlBtn = document.createElement('button');
        dlBtn.className = 'rep-btn rep-btn-primary';
        dlBtn.style.cssText = 'font-size:11px;padding:6px 12px;flex-shrink:0;';
        dlBtn.textContent = '⬇ Télécharger';
        dlBtn.onclick = () => {
          if (doc.file_url) window.open(doc.file_url, '_blank');
          else alert('Lien de téléchargement non disponible.');
        };

        card.appendChild(icon);
        card.appendChild(info);
        card.appendChild(dlBtn);
        grid.appendChild(card);
      });

      content.appendChild(grid);
    }
  } catch (e) {
    content.innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`;
  }
}

/**
 * Affiche un écran "Accès expiré" et déconnecte.
 */
function showAlumniExpired() {
  // Cacher tout
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) appLayout.style.display = 'none';
  const roleScreen = document.getElementById('role-screen');
  if (roleScreen) roleScreen.hidden = true;
  const loginPage = document.getElementById('login-page');
  if (loginPage) loginPage.style.display = 'none';

  const screen = document.createElement('div');
  screen.style.cssText = 'position:fixed;inset:0;z-index:99998;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:24px;text-align:center;';
  screen.innerHTML = `
    <div style="font-size:48px;">⏰</div>
    <h1 style="font-size:20px;color:var(--text-primary);margin:0;">Accès expiré</h1>
    <p style="font-size:14px;color:var(--text-muted);max-width:300px;">Votre accès alumni a expiré. Contactez votre ancien responsable pour prolonger l'accès.</p>
    <button id="alumni-expired-logout" class="rep-btn rep-btn-primary" style="margin-top:12px;">🚪 Se déconnecter</button>
  `;
  document.body.appendChild(screen);

  screen.querySelector('#alumni-expired-logout').onclick = async () => {
    if (sb()) await sb().auth.signOut();
    window.location.reload();
  };
}
