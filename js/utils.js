/* Utilitaires communs partagés entre tous les modules */

/**
 * Active un module et son onglet correspondant.
 * Retire la classe `active` de tous les .nav-tab et .module-view,
 * puis l'ajoute sur l'onglet et la vue correspondant à moduleId.
 * Si moduleId est inconnu, log un avertissement sans modifier l'affichage.
 *
 * @param {string} moduleId - Identifiant du module (ex: 'heures', 'stats')
 */
function showModule(moduleId) {
  const tab = document.querySelector(`.nav-tab[data-module="${moduleId}"]`);
  const view = document.getElementById(`module-${moduleId}`);

  if (!tab || !view) {
    console.warn(`showModule: module inconnu "${moduleId}"`);
    return;
  }

  // Retirer classe active + effacer tout style inline sur toutes les vues
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.module-view').forEach(el => {
    el.classList.remove('active');
    el.removeAttribute('style'); // efface display:flex inline injecté par les modules
  });

  tab.classList.add('active');
  view.classList.add('active');
}

/**
 * Initialise la navigation latérale.
 * Attache un écouteur click sur chaque .nav-tab et active l'onglet "heures" par défaut.
 */
function initNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showModule(tab.dataset.module);
      dispatchModuleInit(tab.dataset.module);
    });
  });

  showModule('heures');
  dispatchModuleInit('heures');
}

/** Appelle la fonction d'init du module correspondant */
function dispatchModuleInit(moduleId) {
  const fns = {
    heures:     () => typeof initHeures     === 'function' && initHeures(),
    repertoire: () => typeof initRepertoire === 'function' && initRepertoire(),
    primes:     () => typeof initPrimes     === 'function' && initPrimes(),
    stats:      () => typeof initStats      === 'function' && initStats(),
    activite:   () => typeof initActivite   === 'function' && initActivite(),
    planning:   () => typeof initPlanning   === 'function' && initPlanning(),
    degats:     () => {},
    rh:         () => typeof initRH         === 'function' && initRH(),
    flotte:     () => typeof initFlotte     === 'function' && initFlotte(),
    'chef-equipe': () => typeof initChefEquipe === 'function' && initChefEquipe(),
    repos:      () => typeof initRepos      === 'function' && initRepos(),
  };
  if (fns[moduleId]) fns[moduleId]();
}

document.addEventListener('DOMContentLoaded', initNavigation);

/* ── Topbar principale ────────────────────────────────────── */
(function initTopbar() {
  const topbar = document.createElement('div');
  topbar.id = 'main-topbar';
  topbar.style.cssText = [
    'position:fixed','top:0','left:0','right:0','height:36px','z-index:8000',
    'background:var(--bg-sidebar)','border-bottom:1px solid var(--border)',
    'display:flex','align-items:center','justify-content:space-between',
    'padding:0 16px','font-size:12px','color:var(--text-muted)'
  ].join(';');

  // Gauche : date + heure
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:14px;';
  const dateEl = document.createElement('span'); dateEl.id = 'topbar-date';
  const timeEl = document.createElement('span'); timeEl.id = 'topbar-time'; timeEl.style.fontWeight='600';

  // Météo
  const center = document.createElement('div');
  center.id = 'topbar-weather';
  center.style.cssText = 'display:flex;align-items:center;gap:6px;';
  center.textContent = '🌡 —';

  left.appendChild(dateEl); left.appendChild(timeEl); left.appendChild(center);

  // Droite : cloche notifications + bouton thème (décalé pour ne pas être caché par le hamburger)
  const right = document.createElement('div');
  right.style.cssText = 'margin-right:40px;display:flex;align-items:center;gap:8px;';

  // Cloche notifications repos
  const bellBtn = document.createElement('button');
  bellBtn.id = 'topbar-bell';
  bellBtn.style.cssText = 'background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:13px;cursor:pointer;color:var(--text-muted);transition:border-color 0.18s;position:relative;display:none;';
  bellBtn.textContent = '🔔';
  bellBtn.onclick = (e) => { e.stopPropagation(); toggleBellPopup(); };
  right.appendChild(bellBtn);

  const themeBtn = document.createElement('button');
  themeBtn.id = 'theme-toggle';
  themeBtn.style.cssText = 'background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:13px;cursor:pointer;color:var(--text-muted);transition:border-color 0.18s;';
  themeBtn.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
  themeBtn.onclick = () => {
    const isLight = document.body.classList.toggle('light-mode');
    themeBtn.textContent = isLight ? '🌙' : '☀️';
    localStorage.setItem('sunxp_theme', isLight ? 'light' : 'dark');
    localStorage.setItem('sunxp-theme', isLight ? 'light' : 'dark');
    // Nettoyer les overrides inline pour laisser le CSS du thème s'appliquer
    document.body.style.removeProperty('--accent');
    document.body.style.removeProperty('--accent-dim');
    document.body.style.removeProperty('--bg-primary');
    document.body.style.removeProperty('--bg-sidebar');
    document.body.style.removeProperty('--bg-tab-hover');
    document.body.style.removeProperty('--bg-tab-active');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-dim');
    document.documentElement.style.removeProperty('--bg-primary');
    document.documentElement.style.removeProperty('--bg-sidebar');
    document.documentElement.style.removeProperty('--bg-tab-hover');
    document.documentElement.style.removeProperty('--bg-tab-active');
    // Réappliquer les couleurs custom si elles existent
    const savedAccent = localStorage.getItem('sunxp-accent');
    if (savedAccent && typeof applyAccentColor === 'function') applyAccentColor(savedAccent);
    const savedBg = localStorage.getItem('sunxp-bg');
    if (savedBg && typeof applyBgColor === 'function') applyBgColor(savedBg);
  };
  right.appendChild(themeBtn);

  topbar.appendChild(left); topbar.appendChild(right);
  document.body.prepend(topbar);

  // Horloge
  function updateClock() {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('fr-FR', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
    timeEl.textContent = now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  }
  updateClock(); setInterval(updateClock, 1000);

  // Météo via Open-Meteo (sans clé API)
  const WMO = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',71:'🌨',73:'🌨',75:'❄️',80:'🌦',81:'🌧',82:'⛈',95:'⛈',96:'⛈',99:'⛈'};
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const {latitude: lat, longitude: lon} = pos.coords;
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
        .then(r => r.json())
        .then(d => {
          const w = d.current_weather;
          const icon = WMO[w.weathercode] || '🌡';
          center.textContent = `${icon} ${Math.round(w.temperature)}°C`;
        }).catch(() => { center.textContent = '🌡 —'; });
    }, () => { center.textContent = '📍 Localisation refusée'; });
  }
})();
