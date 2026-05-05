/* js/auth.js — Authentification Supabase (SunXP Pro) */
console.log('auth.js chargé');

let currentUser = null;
let currentProfile = null;

/* ── Vérifier la session au chargement ────────────────────── */
async function checkAuth() {
  await waitForSupabase();
  if (!sb()) { showLoginPage(); return; } // Pas de Supabase → login quand même

  try {
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
    const { data, error } = await sb().from('user_profiles').select('*').eq('id', currentUser.id).single();
    if (error) { console.warn('loadProfile error:', error.message, error); return; }
    console.log('loadProfile: profil trouvé', data);
    if (data) currentProfile = data;
  } catch (e) { console.warn('loadProfile catch:', e.message); }
}

/* ── Redirection selon le rôle ────────────────────────────── */
function redirectByRole() {
  console.log('redirectByRole: currentProfile =', currentProfile);
  if (!currentProfile) { console.warn('redirectByRole: pas de profil, showApp par défaut'); showApp(); return; }

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
  // Cacher l'app
  document.querySelector('.app-layout').style.display = 'none';

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
        <p style="text-align:center;margin-top:16px;font-size:11px;color:var(--text-muted);">
          <a href="legal.html" target="_blank" style="color:var(--text-muted);text-decoration:underline;">CGU & Confidentialité</a>
        </p>
      </div>`;
    document.body.appendChild(loginPage);

    // Bind login
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  }
  loginPage.style.display = 'flex';
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
  document.querySelector('.app-layout').style.display = '';
  // Afficher le bouton logout si connecté
  const logoutBtn = document.getElementById('topbar-logout');
  if (logoutBtn && currentUser) logoutBtn.style.display = '';
}

/* ── Afficher le portail chauffeur directement ────────────── */
function showChauffeurDirect() {
  const loginPage = document.getElementById('login-page');
  if (loginPage) loginPage.style.display = 'none';
  document.querySelector('.app-layout').style.display = '';

  // Cacher la sidebar (le chauffeur n'en a pas besoin)
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.style.display = 'none';

  // Afficher le bouton logout
  const logoutBtn = document.getElementById('topbar-logout');
  if (logoutBtn) logoutBtn.style.display = '';

  // Attendre que les données soient chargées puis ouvrir le portail
  if (currentProfile && currentProfile.station_id) {
    const sid = currentProfile.station_id;
    localStorage.setItem('stationActive', sid);
    sessionStorage.setItem('stationActive', sid);

    // Attendre le preload puis ouvrir le portail
    const tryOpenPortal = (attempts) => {
      if (attempts > 20) { console.warn('showChauffeurDirect: chauffeur non trouvé dans répertoire'); return; }
      const repertoire = (() => { try { return JSON.parse(localStorage.getItem(sid + '-repertoire')) || []; } catch(_) { return []; } })();
      const chauffeur = repertoire.find(c => c.id_amazon === currentProfile.chauffeur_id);
      if (chauffeur && typeof window.openChauffeurPortal === 'function') {
        window.openChauffeurPortal(chauffeur, sid);
      } else {
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
  showLoginPage();
};

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkAuth, 700);
});
