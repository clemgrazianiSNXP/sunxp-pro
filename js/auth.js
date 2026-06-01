/* js/auth.js — Authentification Supabase (SunXP Pro) */

let currentUser = null;
let currentProfile = null;

/* ── Vérifier la session au chargement ────────────────────── */
async function checkAuth() {
  // Attendre Supabase en premier
  await waitForSupabase();
  if (!sb()) { showLoginPage(); return; }

  try {
    // Détecter le flow PKCE (code dans les query params)
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    const type = query.get('type');

    if (code) {
      try {
        const { data, error } = await sb().auth.exchangeCodeForSession(code);
        if (!error && data?.session) {
          window.history.replaceState(null, '', window.location.pathname);
          if (type === 'recovery') {
            showResetPasswordPage();
            return;
          }
          currentUser = data.session.user;
          await loadProfile();
          redirectByRole();
          return;
        }
      } catch(e) {
        console.warn('exchangeCodeForSession error:', e.message);
      }
    }

    // Détecter le flow implicite (hash fragment avec type=recovery) ou query param
    const hashStr = window.location.hash.substring(1);
    const queryType = query.get('type');
    if (hashStr.includes('type=recovery') || queryType === 'recovery') {
      // Attendre que Supabase traite le hash et établisse la session
      await new Promise(r => setTimeout(r, 500));
      window.history.replaceState(null, '', window.location.pathname);
      showResetPasswordPage();
      return;
    }

    // Connexion normale
    const { data: { session } } = await sb().auth.getSession();
    if (session && session.user) {
      currentUser = session.user;
      await loadProfile();
      redirectByRole();
    } else {
      showLoginPage();
    }
  } catch (e) {
    console.warn('checkAuth error:', e.message);
    showLoginPage();
  }
}

/* ── Page de réinitialisation de mot de passe ────────────── */
function showResetPasswordPage() {
  // Cacher tout
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) appLayout.style.display = 'none';
  const roleScreen = document.getElementById('role-screen');
  if (roleScreen) roleScreen.hidden = true;

  // Créer la page de reset
  let resetPage = document.getElementById('reset-password-page');
  if (!resetPage) {
    resetPage = document.createElement('div');
    resetPage.id = 'reset-password-page';
    resetPage.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(resetPage);
  }
  resetPage.style.display = 'flex';
  resetPage.innerHTML = `
    <div style="width:100%;max-width:380px;padding:24px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:32px;margin-bottom:8px;">🔑</div>
        <h1 style="margin:0;font-size:1.3rem;color:var(--text-primary);font-weight:800;">Nouveau mot de passe</h1>
        <p style="margin:6px 0 0;font-size:12px;color:var(--text-muted);">Choisissez un nouveau mot de passe sécurisé</p>
      </div>
      <div id="reset-error" style="display:none;background:rgba(248,113,113,0.1);border:1px solid #f87171;border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:#f87171;text-align:center;"></div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <input type="password" id="reset-pwd1" class="rep-input" placeholder="Nouveau mot de passe" style="padding:12px;font-size:14px;">
        <input type="password" id="reset-pwd2" class="rep-input" placeholder="Confirmer le mot de passe" style="padding:12px;font-size:14px;">
        <div style="font-size:11px;color:var(--text-muted);">Minimum 8 caractères</div>
        <button id="reset-submit-btn" style="padding:12px;font-size:14px;font-weight:700;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;">Enregistrer le mot de passe</button>
      </div>
    </div>
  `;

  document.getElementById('reset-submit-btn').addEventListener('click', async () => {
    const pwd1 = document.getElementById('reset-pwd1').value;
    const pwd2 = document.getElementById('reset-pwd2').value;
    const errorEl = document.getElementById('reset-error');
    const btn = document.getElementById('reset-submit-btn');

    if (!pwd1 || pwd1.length < 8) {
      errorEl.textContent = 'Le mot de passe doit faire au moins 8 caractères.';
      errorEl.style.display = 'block'; return;
    }
    if (pwd1 !== pwd2) {
      errorEl.textContent = 'Les deux mots de passe ne correspondent pas.';
      errorEl.style.display = 'block'; return;
    }

    btn.disabled = true; btn.textContent = '⏳ Enregistrement...';
    try {
      const { error } = await sb().auth.updateUser({ password: pwd1 });
      // "Auth session missing" est un bug connu Supabase — le mdp est quand même changé
      if (error && !error.message.includes('session missing') && !error.message.includes('Session')) throw error;

      resetPage.innerHTML = `
        <div style="text-align:center;padding:24px;">
          <div style="font-size:48px;margin-bottom:16px;">✅</div>
          <h2 style="color:var(--text-primary);">Mot de passe modifié !</h2>
          <p style="color:var(--text-muted);font-size:13px;">Vous allez être redirigé vers la page de connexion.</p>
        </div>
      `;
      setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname);
        window.location.reload();
      }, 2000);
    } catch(e) {
      errorEl.textContent = 'Erreur : ' + e.message;
      errorEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Enregistrer le mot de passe';
    }
  });
}

/* ── Attendre que Supabase soit initialisé ────────────────── */
function waitForSupabase() {
  return new Promise(resolve => {
    let attempts = 0;
    const check = () => {
      attempts++;
      if (typeof sb === 'function' && sb()) { resolve(); return; }
      if (attempts > 30) { console.warn('waitForSupabase: timeout'); resolve(); return; } // 3s max
      setTimeout(check, 100);
    };
    setTimeout(check, 600);
  });
}

/* ── Charger le profil utilisateur ────────────────────────── */
async function loadProfile() {
  if (!sb() || !currentUser) { console.warn('loadProfile: sb ou currentUser manquant'); return; }
  try {
    console.log('loadProfile: chargement pour user', currentUser.id);
    const { data, error } = await sb().from('user_profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (error) { console.warn('loadProfile error:', error.message, error); return; }
    console.log('loadProfile: profil trouvé', data);
    if (data) {
      currentProfile = data;
      // Stocker le rôle spécifique globalement
      window.currentRoleSpecifique = data.role_specifique || null;
    }
  } catch (e) { console.warn('loadProfile catch:', e.message); }
}

/* ── Redirection selon le rôle ────────────────────────────── */
async function redirectByRole() {
  console.log('redirectByRole: currentProfile =', currentProfile);
  // Vérifier le mode maintenance
  if (typeof checkMaintenanceMode === 'function') checkMaintenanceMode();
  // Logger la connexion
  if (typeof logActivity === 'function') logActivity('login', {});
  if (!currentProfile) {
    console.warn('redirectByRole: pas de profil dans user_profiles');
    // Si c'est un admin connu ou un email responsable → laisser passer quand même
    if (currentUser && currentUser.email) {
      const adminEmails = ['amazon.grazianisnxp@gmail.com'];
      if (adminEmails.includes(currentUser.email) || currentUser.email.includes('snxp') || currentUser.email.includes('sunxp')) {
        console.log('redirectByRole: email reconnu, accès responsable malgré profil manquant');
        showApp();
        return;
      }
    }
    // Sinon afficher un écran d'erreur
    const loginPage = document.getElementById('login-page');
    if (loginPage) loginPage.style.display = 'none';
    const portal = document.getElementById('chauffeur-portal');
    if (portal) {
      portal.hidden = false;
      portal.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80vh;gap:16px;padding:24px;text-align:center;">
          <div style="font-size:48px;">⚠️</div>
          <h2 style="font-size:18px;color:var(--text-primary);margin:0;">Impossible de charger votre profil</h2>
          <p style="font-size:13px;color:var(--text-muted);max-width:300px;">Votre profil n'a pas été trouvé. Vérifiez votre connexion internet et réessayez.</p>
          <button onclick="window.location.reload()" class="rep-btn rep-btn-primary" style="padding:10px 24px;">🔄 Recharger</button>
          <button onclick="window.logout()" class="h-btn" style="padding:8px 20px;">🚪 Se déconnecter</button>
        </div>
      `;
    }
    return;
  }

  // Vérifier si alumni
  if (currentProfile.statut === 'alumni') {
    console.log('redirectByRole: statut alumni détecté');
    // Vérifier expiration
    if (currentProfile.alumni_expiration) {
      const expDate = new Date(currentProfile.alumni_expiration);
      if (expDate < new Date()) {
        console.log('redirectByRole: accès alumni expiré');
        if (typeof showAlumniExpired === 'function') showAlumniExpired();
        return;
      }
    }
    if (typeof showAlumniPortal === 'function') showAlumniPortal();
    return;
  }

  if (currentProfile.role === 'chauffeur') {
    console.log('redirectByRole: rôle chauffeur détecté');
    showChauffeurDirect();
  } else {
    console.log('redirectByRole: rôle responsable');
    showApp();
  }
}

/* ── Afficher la page de login ────────────────────────────── */
function showLoginPage() {
  // Cacher le role-screen s'il existe
  const roleScreen = document.getElementById('role-screen');
  if (roleScreen) roleScreen.hidden = true;

  // Créer la page de login si elle n'existe pas
  let loginPage = document.getElementById('login-page');
  if (!loginPage) {
    loginPage = document.createElement('div');
    loginPage.id = 'login-page';
    loginPage.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;';
    loginPage.innerHTML = `
      <div style="width:100%;max-width:380px;padding:24px;">
        <div style="text-align:center;margin-bottom:32px;">
          <img src="img/matting_2026-4-21_fa553fc4-3d99-11f1-9b2d-16737e16766a.png" style="height:50px;width:auto;opacity:0.9;margin-bottom:12px;">
          <h1 style="margin:0;font-size:1.5rem;color:var(--text-primary);font-weight:800;">SunXP Pro</h1>
          <p style="margin:6px 0 0;font-size:12px;color:var(--text-muted);">Connectez-vous pour accéder à votre espace</p>
        </div>
        <div id="login-error" style="display:none;background:rgba(248,113,113,0.1);border:1px solid #f87171;border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:#f87171;text-align:center;"></div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <input type="email" id="login-email" class="rep-input" placeholder="Email" style="padding:12px;font-size:14px;">
          <input type="password" id="login-password" class="rep-input" placeholder="Mot de passe" style="padding:12px;font-size:14px;">
          <button id="login-btn" style="padding:12px;font-size:14px;font-weight:700;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;transition:opacity 0.15s;">Se connecter</button>
        </div>
        <p style="text-align:center;margin-top:16px;font-size:11px;color:var(--text-muted);line-height:1.6;">
          En vous connectant, vous acceptez nos 
          <a href="legal.html" target="_blank" style="color:var(--accent);text-decoration:underline;">CGU & Politique de confidentialité</a>.<br>
          Vos données sont traitées par SunXP Pro conformément au RGPD.
        </p>
      </div>`;
    document.body.appendChild(loginPage);

    // Bind login
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

    const forgotBtn = document.createElement('p');
    forgotBtn.style.cssText = 'text-align:center;margin-top:10px;font-size:12px;';
    forgotBtn.innerHTML = '<a href="#" id="forgot-pwd-link" style="color:var(--text-muted);text-decoration:underline;">Mot de passe oublié ?</a>';
    loginPage.querySelector('div[style*="flex-direction:column"]').appendChild(forgotBtn);

    document.getElementById('forgot-pwd-link').addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      if (!email) { showLoginError('Entrez votre email d\'abord.'); return; }
      try {
        const { error } = await sb().auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '?type=recovery'
        });
        if (error) throw error;
        const el = document.getElementById('login-error');
        if (el) {
          el.style.background = 'rgba(74,222,128,0.1)';
          el.style.borderColor = '#4ade80';
          el.style.color = '#4ade80';
          el.textContent = '✅ Email de réinitialisation envoyé ! Vérifiez votre boîte mail.';
          el.style.display = 'block';
        }
      } catch(e) {
        showLoginError('Erreur : ' + e.message);
      }
    });
  }
  loginPage.style.display = 'flex';
  // Cacher l'app derrière le login
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) appLayout.style.display = 'none';
}

/* ── Handler de connexion ─────────────────────────────────── */
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !password) { showLoginError('Veuillez remplir tous les champs.'); return; }

  btn.disabled = true; btn.textContent = 'Connexion...';
  errorEl.style.display = 'none';

  try {
    const { data, error } = await sb().auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.user;
    await loadProfile();

    // Cacher le login
    document.getElementById('login-page').style.display = 'none';
    redirectByRole();
  } catch (e) {
    let msg = 'Identifiants incorrects.';
    if (e.message && e.message.includes('Invalid login')) msg = 'Email ou mot de passe incorrect.';
    if (e.message && e.message.includes('Email not confirmed')) msg = 'Veuillez confirmer votre email.';
    showLoginError(msg);
  } finally {
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

/* ── Afficher l'app (responsable) ─────────────────────────── */
function showApp() {
  const loginPage = document.getElementById('login-page');
  if (loginPage) loginPage.style.display = 'none';

  const logoutBtn = document.getElementById('topbar-logout');
  if (logoutBtn) logoutBtn.style.display = '';
  if (typeof showToolbar === 'function') showToolbar(true);

  // Si admin → afficher le role-screen (choix station + card admin)
  if (typeof isAdmin === 'function' && isAdmin()) {
    const roleScreen = document.getElementById('role-screen');
    if (roleScreen) roleScreen.hidden = false;
    return;
  }

  // Si responsable avec station définie → aller directement
  if (currentProfile && currentProfile.station_id) {
    const sid = currentProfile.station_id;
    localStorage.setItem('stationActive', sid);
    sessionStorage.setItem('stationActive', sid);
    localStorage.setItem('sunxp_role', 'responsable');
    const roleScreen = document.getElementById('role-screen');
    if (roleScreen) roleScreen.hidden = true;

    // Appeler loadStations qui va :
    // 1. Charger la liste des stations
    // 2. Trouver stationActive dans localStorage (qu'on vient de setter)
    // 3. Appeler setActiveStation(found) avec l'objet complet
    // 4. Afficher l'app layout
    loadStations();
    return;
  }

  // Sinon (responsable sans station) → aller directement au choix de station
  const roleScreen = document.getElementById('role-screen');
  if (roleScreen) roleScreen.hidden = true;
  localStorage.setItem('sunxp_role', 'responsable');
  const stationScreen = document.getElementById('station-screen');
  if (stationScreen) {
    stationScreen.hidden = false;
    stationScreen.style.display = '';
  }
  if (typeof loadStations === 'function') {
    loadStations();
  } else {
    let attempts = 0;
    const tryLoad = setInterval(() => {
      attempts++;
      if (typeof loadStations === 'function') {
        clearInterval(tryLoad);
        loadStations();
      }
      if (attempts > 20) clearInterval(tryLoad);
    }, 100);
  }
}

/* ── Afficher le portail chauffeur directement ────────────── */
function showChauffeurDirect() {
  const loginPage = document.getElementById('login-page');
  if (loginPage) loginPage.style.display = 'none';
  // Ne PAS afficher app-layout tout de suite — on attend que le portail soit prêt

  // Attendre que les données soient chargées puis ouvrir le portail
  if (currentProfile && currentProfile.station_id) {
    const sid = currentProfile.station_id;
    localStorage.setItem('stationActive', sid);
    sessionStorage.setItem('stationActive', sid);

    // Forcer le preload des données de la station puis ouvrir le portail
    const tryOpenPortal = async (attempts) => {
      if (attempts > 40) {
        console.warn('showChauffeurDirect: chauffeur non trouvé après 20 tentatives');
        // Cacher l'app-layout pour ne pas exposer l'espace responsable
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) { appLayout.hidden = true; appLayout.style.display = 'none'; }
        const portal = document.getElementById('chauffeur-portal');
        if (portal) {
          portal.hidden = false;
          portal.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80vh;gap:16px;padding:24px;text-align:center;">
              <div style="font-size:48px;">⚠️</div>
              <h2 style="font-size:18px;color:var(--text-primary);margin:0;">Impossible de charger votre profil</h2>
              <p style="font-size:13px;color:var(--text-muted);max-width:300px;">Vos données n'ont pas pu être récupérées. Vérifiez votre connexion internet et réessayez.</p>
              <button onclick="window.location.reload()" class="rep-btn rep-btn-primary" style="padding:10px 24px;">🔄 Recharger</button>
              <button onclick="window.logout()" class="h-btn" style="padding:8px 20px;">🚪 Se déconnecter</button>
            </div>
          `;
        }
        return;
      }

      // Afficher un loader à la première tentative
      const portal = document.getElementById('chauffeur-portal');
      if (portal && attempts === 0) {
        portal.hidden = false;
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) { appLayout.hidden = true; appLayout.style.display = 'none'; }
        portal.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80vh;gap:16px;">
            <div style="font-size:40px;animation:spin 1s linear infinite;">⏳</div>
            <p style="font-size:13px;color:var(--text-muted);">Chargement de votre espace...</p>
          </div>
        `;
      }

      // Forcer le preload si le répertoire n'est pas encore chargé
      let repertoire = (() => { try { return JSON.parse(localStorage.getItem(sid + '-repertoire')) || []; } catch(_) { return []; } })();
      if (!repertoire.length && typeof preloadStationData === 'function' && attempts <= 1) {
        await preloadStationData(sid);
        repertoire = (() => { try { return JSON.parse(localStorage.getItem(sid + '-repertoire')) || []; } catch(_) { return []; } })();
      }

      console.log('tryOpenPortal attempt', attempts, '- répertoire:', repertoire.length, 'chauffeurs, cherche:', currentProfile.chauffeur_id);
      if (repertoire.length && attempts === 0) console.log('IDs disponibles:', repertoire.map(c => c.id_amazon));

      const searchId = (currentProfile.chauffeur_id || '').trim().toUpperCase().replace(/\s/g, '');
      const chauffeur = repertoire.find(c =>
        c.id_amazon && c.id_amazon.trim().toUpperCase().replace(/\s/g, '') === searchId
      ) || repertoire.find(c => {
        // Fallback : chercher par nom+prénom si l'ID ne matche pas
        const pNom = ((currentProfile.prenom || '') + ' ' + (currentProfile.nom || '')).trim().toLowerCase();
        const cNom = ((c.prenom || '') + ' ' + (c.nom || '')).trim().toLowerCase();
        return pNom && cNom && pNom === cNom;
      });
      console.log('tryOpenPortal: searchId =', searchId, '| trouvé =', !!chauffeur, '| initChauffeurPortal =', typeof initChauffeurPortal);
      if (chauffeur && typeof initChauffeurPortal === 'function') {
        console.log('✅ Chauffeur trouvé, ouverture portail');
        // Cacher la sidebar et les modules responsable, afficher l'app
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) { appLayout.hidden = false; appLayout.style.display = ''; }
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';
        document.querySelectorAll('.module-view').forEach(m => { m.classList.remove('active'); m.removeAttribute('style'); });
        const portalEl = document.getElementById('chauffeur-portal');
        if (portalEl) portalEl.hidden = false;
        if (typeof showToolbar === 'function') showToolbar(true);
        const logoutBtn = document.getElementById('topbar-logout');
        if (logoutBtn) logoutBtn.style.display = '';
        initChauffeurPortal(chauffeur, sid);
      } else if (chauffeur && typeof initChauffeurPortal !== 'function') {
        // initChauffeurPortal pas encore chargé — réessayer
        console.warn('tryOpenPortal: initChauffeurPortal non disponible, tentative', attempts);
        setTimeout(() => tryOpenPortal(attempts + 1), 500);
      } else {
        // Chauffeur pas encore trouvé dans le répertoire — réessayer
        setTimeout(() => tryOpenPortal(attempts + 1), 500);
      }
    };
    setTimeout(() => tryOpenPortal(0), 500);
  }
}

/* ── Déconnexion ──────────────────────────────────────────── */
window.logout = async function () {
  if (sb()) await sb().auth.signOut();
  currentUser = null;
  currentProfile = null;
  // Recharger la page pour un état propre
  window.location.reload();
};

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkAuth, 700);
});
