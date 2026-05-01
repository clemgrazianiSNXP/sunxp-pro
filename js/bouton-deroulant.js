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

  // Si le portail chauffeur est en cours de chargement (toolbar visible mais portalChauffeur pas encore set),
  // ne pas ouvrir le menu pour éviter d'afficher les onglets responsable
  const portalVisible = document.getElementById('chauffeur-portal') && !document.getElementById('chauffeur-portal').hidden;
  if (portalVisible && !isDriverMode()) return;

  menuPanelOpen = !menuPanelOpen;
  panel.hidden = !menuPanelOpen;

  if (menuPanelOpen) {
    // Adapter les onglets selon le rôle
    const tabsContainer = panel.querySelector('.menu-panel-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      if (isDriverMode()) {
        // Chauffeur : paramètres + ses propres courbes + demandes
        tabsContainer.innerHTML = `
          <button class="menu-panel-tab active" data-tab="parametres" onclick="setMenuTab('parametres')" title="Paramètres">⚙️</button>
          <button class="menu-panel-tab" data-tab="mes-stats" onclick="setMenuTab('mes-stats')" title="Mes Statistiques">📊</button>
          <button class="menu-panel-tab" data-tab="contacts-ch" onclick="setMenuTab('contacts-ch')" title="Contacts">📇</button>
          <button class="menu-panel-tab" data-tab="repos" onclick="setMenuTab('repos')" title="Demande de repos">📅</button>
          <button class="menu-panel-tab" data-tab="acompte" onclick="setMenuTab('acompte')" title="Demande d'acompte">💶</button>
          <button class="menu-panel-tab" data-tab="conges" onclick="setMenuTab('conges')" title="Congés payés">🏖</button>
        `;
      } else {
        // Responsable : tout + demandes + stations
        tabsContainer.innerHTML = `
          <button class="menu-panel-tab active" data-tab="parametres" onclick="setMenuTab('parametres')" title="Paramètres">⚙️</button>
          <button class="menu-panel-tab" data-tab="documents" onclick="setMenuTab('documents')" title="Documents bureau">📄</button>
          <button class="menu-panel-tab" data-tab="docs-chauffeurs" onclick="setMenuTab('docs-chauffeurs')" title="Documents chauffeurs">👤</button>
          <button class="menu-panel-tab" data-tab="analyse" onclick="setMenuTab('analyse')" title="Analyse & Performance">📊</button>
          <button class="menu-panel-tab" data-tab="badges-mgr" onclick="setMenuTab('badges-mgr')" title="Badges chauffeurs">🏆</button>
          <button class="menu-panel-tab" data-tab="contacts" onclick="setMenuTab('contacts')" title="Contacts">📇</button>
          <button class="menu-panel-tab" data-tab="demandes-mgr" onclick="setMenuTab('demandes-mgr')" title="Demandes chauffeurs">📋</button>
          <button class="menu-panel-tab" data-tab="stations-mgr" onclick="setMenuTab('stations-mgr')" title="Gérer les stations">🏢</button>
        `;
      }
    }
    bindTabTooltips();
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
  } else if (tab === 'docs-chauffeurs' && typeof renderDocsChauffeurs === 'function') {
    content.appendChild(renderDocsChauffeurs());
  } else if (tab === 'analyse' && typeof renderAnalysePerformance === 'function') {
    content.appendChild(renderAnalysePerformance());
  } else if (tab === 'repos-mgr' && typeof renderReposResponsable === 'function') {
    content.appendChild(renderReposResponsable());
  } else if (tab === 'demandes-mgr' && typeof renderDemandesManager === 'function') {
    content.appendChild(renderDemandesManager());
  } else if (tab === 'mes-stats' && isDriverMode()) {
    content.appendChild(renderDriverOwnStats());
  } else if (tab === 'repos' && isDriverMode() && typeof renderReposChauffeur === 'function') {
    content.appendChild(renderReposChauffeur());
  } else if (tab === 'acompte' && isDriverMode() && typeof renderAcompteChauffeur === 'function') {
    content.appendChild(renderAcompteChauffeur());
  } else if (tab === 'conges' && isDriverMode() && typeof renderCongesChauffeur === 'function') {
    content.appendChild(renderCongesChauffeur());
  } else if (tab === 'stations-mgr' && typeof renderStationsManager === 'function') {
    content.appendChild(renderStationsManager());
  } else if (tab === 'badges-mgr' && typeof renderBadgesManager === 'function') {
    content.appendChild(renderBadgesManager());
  } else if (tab === 'contacts' && typeof renderContactsManager === 'function') {
    content.appendChild(renderContactsManager());
  } else if (tab === 'contacts-ch' && typeof renderContactsChauffeur === 'function') {
    content.appendChild(renderContactsChauffeur());
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

/* ── Tooltip au survol des onglets hamburger ──────────────── */
function bindTabTooltips() {
  let tooltip = null;
  document.querySelectorAll('.menu-panel-tab').forEach(tab => {
    tab.addEventListener('mouseenter', e => {
      if (tooltip) tooltip.remove();
      const title = tab.getAttribute('title');
      if (!title) return;
      tooltip = document.createElement('div');
      tooltip.className = 'menu-tab-tooltip';
      tooltip.textContent = title;
      document.body.appendChild(tooltip);
      const rect = tab.getBoundingClientRect();
      tooltip.style.top = (rect.top + rect.height / 2 - tooltip.offsetHeight / 2) + 'px';
      tooltip.style.left = (rect.left - tooltip.offsetWidth - 8) + 'px';
    });
    tab.addEventListener('mouseleave', () => {
      if (tooltip) { tooltip.remove(); tooltip = null; }
    });
    tab.addEventListener('click', () => {
      if (tooltip) { tooltip.remove(); tooltip = null; }
    });
  });
}
