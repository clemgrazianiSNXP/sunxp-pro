/* js/bouton-deroulant.js — Menu hamburger déroulant (SunXP Pro) */
console.log('bouton-deroulant.js chargé');

let menuPanelOpen = false;
let menuPanelTab = null; // 'parametres' | 'documents' | 'analyse'

function initMenuDeroulant() {
  const btn = document.getElementById('hamburger-btn');
  if (!btn) return;
  btn.addEventListener('click', toggleMenuPanel);
}

function isDriverMode() {
  return typeof portalChauffeur !== 'undefined' && portalChauffeur !== null;
}

function toggleMenuPanel() {
  const panel = document.getElementById('menu-panel');
  if (!panel) return;
  menuPanelOpen = !menuPanelOpen;
  panel.hidden = !menuPanelOpen;

  if (menuPanelOpen) {
    // Adapter les onglets selon le rôle
    const tabsContainer = panel.querySelector('.menu-panel-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      if (isDriverMode()) {
        // Chauffeur : paramètres + ses propres courbes + demande repos
        tabsContainer.innerHTML = `
          <button class="menu-panel-tab active" data-tab="parametres" onclick="setMenuTab('parametres')" title="Paramètres">⚙️</button>
          <button class="menu-panel-tab" data-tab="mes-stats" onclick="setMenuTab('mes-stats')" title="Mes Statistiques">📊</button>
          <button class="menu-panel-tab" data-tab="repos" onclick="setMenuTab('repos')" title="Demande de repos">📅</button>
        `;
      } else {
        // Responsable : tout + repos + stations
        tabsContainer.innerHTML = `
          <button class="menu-panel-tab active" data-tab="parametres" onclick="setMenuTab('parametres')" title="Paramètres">⚙️</button>
          <button class="menu-panel-tab" data-tab="documents" onclick="setMenuTab('documents')" title="Documents">📄</button>
          <button class="menu-panel-tab" data-tab="analyse" onclick="setMenuTab('analyse')" title="Analyse & Performance">📊</button>
          <button class="menu-panel-tab" data-tab="repos-mgr" onclick="setMenuTab('repos-mgr')" title="Repos demandés">📅</button>
          <button class="menu-panel-tab" data-tab="stations-mgr" onclick="setMenuTab('stations-mgr')" title="Gérer les stations">🏢</button>
        `;
      }
    }
    setMenuTab('parametres');
  }
}

function closeMenuPanel() {
  const panel = document.getElementById('menu-panel');
  if (panel) panel.hidden = true;
  menuPanelOpen = false;
}

function setMenuTab(tab) {
  menuPanelTab = tab;
  // Mettre à jour les onglets actifs
  document.querySelectorAll('.menu-panel-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  // Rendu du contenu
  const content = document.getElementById('menu-panel-content');
  if (!content) return;
  content.innerHTML = '';
  if (tab === 'parametres' && typeof renderParametres === 'function') {
    content.appendChild(renderParametres());
  } else if (tab === 'documents' && typeof renderDocuments === 'function') {
    content.appendChild(renderDocuments());
  } else if (tab === 'analyse' && typeof renderAnalysePerformance === 'function') {
    content.appendChild(renderAnalysePerformance());
  } else if (tab === 'repos-mgr' && typeof renderReposResponsable === 'function') {
    content.appendChild(renderReposResponsable());
  } else if (tab === 'mes-stats' && isDriverMode()) {
    content.appendChild(renderDriverOwnStats());
  } else if (tab === 'repos' && isDriverMode() && typeof renderReposChauffeur === 'function') {
    content.appendChild(renderReposChauffeur());
  } else if (tab === 'stations-mgr' && typeof renderStationsManager === 'function') {
    content.appendChild(renderStationsManager());
  }
}

document.addEventListener('DOMContentLoaded', initMenuDeroulant);

/** Rendu des stats personnelles du chauffeur connecté */
function renderDriverOwnStats() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;';

  if (!portalChauffeur || !portalStationId) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">Non connecté.</p>';
    return wrap;
  }

  const nom = (portalChauffeur.prenom + ' ' + portalChauffeur.nom).trim();
  wrap.innerHTML = `<h3 style="font-size:14px;color:var(--accent);">📊 Mes Statistiques — ${portalChauffeur.prenom}</h3>`;

  // Réutiliser les fonctions d'analyse-performance.js si disponibles
  if (typeof collectChauffeurStats === 'function' && typeof renderChauffeurCurves === 'function') {
    const detailArea = document.createElement('div');
    renderChauffeurCurves(detailArea, portalStationId, nom, portalChauffeur);
    wrap.appendChild(detailArea);
  } else {
    wrap.innerHTML += '<p style="color:var(--text-muted);font-size:13px;">Aucune donnée disponible.</p>';
  }

  return wrap;
}
