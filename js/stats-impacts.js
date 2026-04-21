/* js/stats-impacts.js — Alertes impacts POD & DWC (SunXP Pro) */
console.log('stats-impacts.js chargé');

const POD_THRESHOLD = 98;
const DWC_THRESHOLD = 85;

/**
 * Retourne les chauffeurs impactant le POD (< 98%), triés par % croissant.
 * @param {Array} data — données POD de la semaine
 * @returns {Array<{nom: string, idAmazon: string, podPct: number}>}
 */
function getPodImpacts(data) {
  if (!data || !data.length) return [];
  return data
    .filter(r => parseFloat(r.podPct) < POD_THRESHOLD)
    .map(r => ({
      idAmazon: r.idAmazon,
      nom: typeof resolveDriver === 'function' ? (resolveDriver(r.idAmazon)?.nom || r.idAmazon) : r.idAmazon,
      podPct: parseFloat(r.podPct)
    }))
    .sort((a, b) => a.podPct - b.podPct);
}

/**
 * Retourne les chauffeurs impactant le DWC (< 85%), triés par % croissant.
 * @param {Array} data — données DWC de la semaine
 * @returns {Array<{nom: string, idAmazon: string, dwcPct: number, contactMiss: number}>}
 */
function getDwcImpacts(data) {
  if (!data || !data.length) return [];
  return data
    .filter(r => parseFloat(r.dwcPct) < DWC_THRESHOLD)
    .map(r => ({
      idAmazon: r.idAmazon,
      nom: typeof resolveDriver === 'function' ? (resolveDriver(r.idAmazon)?.nom || r.idAmazon) : r.idAmazon,
      dwcPct: parseFloat(r.dwcPct),
      contactMiss: parseInt(r.contactMiss) || 0
    }))
    .sort((a, b) => a.dwcPct - b.dwcPct);
}

/**
 * Crée un badge d'alerte cliquable avec le nombre d'impacts.
 * Au clic, affiche/masque un panneau avec la liste des chauffeurs.
 * @param {string} type — 'pod' ou 'dwc'
 * @param {Array} impacts — résultat de getPodImpacts ou getDwcImpacts
 * @returns {HTMLElement}
 */
function buildImpactBadge(type, impacts) {
  const container = document.createElement('span');
  container.style.cssText = 'position:relative;display:inline-flex;align-items:center;';

  const badge = document.createElement('button');
  badge.className = 'h-btn';
  const count = impacts.length;
  const hasImpacts = count > 0;

  if (type === 'pod') {
    badge.textContent = `⚠ ${count} POD < ${POD_THRESHOLD}%`;
  } else {
    badge.textContent = `⚠ ${count} DWC < ${DWC_THRESHOLD}%`;
  }

  if (hasImpacts) {
    badge.style.cssText += 'background:rgba(248,113,113,0.15);border-color:#f87171;color:#f87171;font-size:11px;';
  } else {
    badge.style.cssText += 'background:rgba(74,222,128,0.15);border-color:#4ade80;color:#4ade80;font-size:11px;';
    badge.textContent = type === 'pod' ? `✓ POD OK` : `✓ DWC OK`;
  }

  const panel = document.createElement('div');
  panel.className = 'stats-impact-panel';
  panel.hidden = true;

  if (hasImpacts) {
    const title = document.createElement('div');
    title.className = 'stats-impact-title';
    title.textContent = type === 'pod'
      ? `Chauffeurs POD < ${POD_THRESHOLD}%`
      : `Chauffeurs DWC < ${DWC_THRESHOLD}%`;
    panel.appendChild(title);

    impacts.forEach((imp, i) => {
      const row = document.createElement('div');
      row.className = 'stats-impact-row';
      if (type === 'pod') {
        row.innerHTML = `<span class="stats-impact-rank">${i + 1}</span>
          <span class="stats-impact-nom">${imp.nom}</span>
          <span class="stats-impact-val" style="color:#f87171;">${imp.podPct}%</span>`;
      } else {
        row.innerHTML = `<span class="stats-impact-rank">${i + 1}</span>
          <span class="stats-impact-nom">${imp.nom}</span>
          <span class="stats-impact-val" style="color:#f87171;">${imp.dwcPct}%</span>
          <span class="stats-impact-extra">(${imp.contactMiss} miss)</span>`;
      }
      panel.appendChild(row);
    });
  }

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!hasImpacts) return;
    // Fermer les autres panneaux ouverts
    document.querySelectorAll('.stats-impact-panel').forEach(p => { if (p !== panel) p.hidden = true; });
    panel.hidden = !panel.hidden;
  });

  // Fermer au clic extérieur
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) panel.hidden = true;
  });

  container.appendChild(badge);
  container.appendChild(panel);
  return container;
}
