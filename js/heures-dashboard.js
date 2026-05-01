/* js/heures-dashboard.js — Dashboard journalier de l'onglet Heures */

/**
 * Génère le HTML du dashboard journalier.
 * @param {object} dash - données dashboard sauvegardées
 * @param {Array}  rows - lignes chauffeurs du jour
 */
function renderDashboard(dash, rows) {
  const d = dash || {};
  const dsVal = calcDS(d.colis, d.retours);
  const dsPct = parseFloat(dsVal) || 0;
  const dsColor = dsPct >= 98.5 ? '#4ade80' : dsPct >= 97 ? '#f59e0b' : dsPct > 0 ? '#f87171' : 'var(--text-muted)';
  const dsStroke = dsPct > 0 ? Math.min(dsPct, 100) * 2.51327 : 0;

  // Chauffeurs sur la route : présents sans heure de retour
  const presents = (rows || []).filter(r => r.statut === 'Présent' && r.nom && r.nom.trim());
  const withRetour = presents.filter(r => r.retourDepot && r.retourDepot.trim());
  const surRoute = presents.length - withRetour.length;
  const surRouteColor = surRoute > 0 ? '#f59e0b' : '#4ade80';

  return `
    <div class="h-dashboard">
      <div class="h-dash-title">Dashboard journalier</div>

      <div class="h-dash-cards-row">
        <div class="h-dash-mini-card">
          <span class="h-dash-mini-label">DSP</span>
          <input class="h-dash-input h-dash-mini-value" data-dash="dsp" value="${esc(d.dsp || '')}" placeholder="—">
        </div>
        <div class="h-dash-mini-card">
          <span class="h-dash-mini-label">CE</span>
          <input class="h-dash-input h-dash-mini-value" data-dash="ce" value="${esc(d.ce || '')}" placeholder="—">
        </div>
        <div class="h-dash-mini-card">
          <span class="h-dash-mini-label">CES</span>
          <input class="h-dash-input h-dash-mini-value" data-dash="ces" value="${esc(d.ces || '')}" placeholder="—">
        </div>
      </div>

      <div class="h-dash-sep"></div>

      <div class="h-dash-colis-row">
        <div class="h-dash-colis-cell">
          <span class="h-dash-mini-label">📦 Colis expédiés</span>
          <input class="h-dash-input h-dash-colis-input" data-dash="colis" type="number" min="0" value="${esc(d.colis || '')}" placeholder="0">
        </div>
        <div class="h-dash-colis-divider"></div>
        <div class="h-dash-colis-cell">
          <span class="h-dash-mini-label">↩ Retours</span>
          <input class="h-dash-input h-dash-colis-input" data-dash="retours" type="number" min="0" value="${esc(d.retours || '')}" placeholder="0">
        </div>
      </div>

      <div class="h-dash-gauge-wrap">
        <svg class="h-dash-gauge" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" stroke-width="8" opacity="0.3"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="${dsColor}" stroke-width="8"
            stroke-dasharray="${dsStroke} 251.327"
            stroke-linecap="butt" transform="rotate(-90 50 50)"
            style="transition:stroke-dasharray 0.5s ease;"/>
        </svg>
        <div class="h-dash-gauge-text" id="dash-ds" style="color:${dsColor};">${dsVal}</div>
        <div class="h-dash-gauge-label">DS%</div>
      </div>

      <div class="h-dash-cards-row" style="margin-top:4px;">
        <div class="h-dash-mini-card" style="border-color:${surRouteColor};">
          <span class="h-dash-mini-label">🛣 Sur la route</span>
          <span id="dash-sur-route" style="font-size:20px;font-weight:700;color:${surRouteColor};">${surRoute}</span>
        </div>
        <div class="h-dash-mini-card" style="border-color:#4ade80;">
          <span class="h-dash-mini-label">✅ Rentrés</span>
          <span style="font-size:20px;font-weight:700;color:#4ade80;">${withRetour.length}</span>
        </div>
      </div>

      <div class="h-dash-sep"></div>

      <div class="h-dash-field">
        <label>🔴 Absents</label>
        <span class="h-dash-auto-list">${buildStatusList(rows, 'Absent')}</span>
      </div>
      <div class="h-dash-field">
        <label>🟡 Astreinte</label>
        <span class="h-dash-auto-list">${buildStatusList(rows, 'Astreinte')}</span>
      </div>
      <div class="h-dash-field">
        <label>🔵 Chime</label>
        <span class="h-dash-auto-list">${buildStatusList(rows, 'Chime')}</span>
      </div>
      <div class="h-dash-field">
        <label>🩵 Safety</label>
        <span class="h-dash-auto-list">${buildStatusList(rows, 'Safety')}</span>
      </div>

      <div class="h-dash-sep"></div>

      <div class="h-dash-mentor-title">⚠ Impact Mentor</div>
      <div id="dash-mentor-list">${renderMentorList(rows)}</div>
      <button class="h-dash-wa-btn" id="btn-copy-wa">📋 Copier message WhatsApp</button>
    </div>
  `;
}

/**
 * Calcule et formate le DS%
 */
function calcDS(colis, retours) {
  const c = parseFloat(colis);
  const r = parseFloat(retours);
  if (!c || isNaN(c) || c === 0) return '—';
  const pct = ((c - (r || 0)) / c * 100).toFixed(2);
  return pct + '%';
}

/**
 * Génère la liste des chauffeurs en impact Mentor
 */
function renderMentorList(rows) {
  if (!rows || !rows.length) return '<span class="h-dash-empty">Aucun</span>';
  const impacted = rows.filter(r => r.statut === 'Présent' && hasFaute(r.mentor, r.trajet));
  if (!impacted.length) return '<span class="h-dash-empty">Aucun ✓</span>';
  return impacted.map(r =>
    `<div class="h-dash-mentor-row">
      <span>${esc(r.nom)}</span>
      <span class="h-dash-mentor-score">Mentor: ${esc(r.mentor)} / Trajet: ${r.trajet}★</span>
    </div>`
  ).join('');
}

/**
 * Génère le message WhatsApp pour les chauffeurs en impact Mentor
 */
function buildWAMessage(rows, dateStr, stationId) {
  const impacted = (rows || []).filter(r => r.statut === 'Présent' && hasFaute(r.mentor, r.trajet));
  if (!impacted.length) return 'Aucun chauffeur en impact Mentor aujourd\'hui ✅';
  const lines = impacted.map(r => `• ${r.nom} — Mentor: ${r.mentor} / Trajet: ${r.trajet}★`);
  return `📊 Impact Mentor — ${stationId} — ${dateStr}\n${lines.join('\n')}`;
}

/**
 * Attache les listeners du dashboard (inputs + bouton WA)
 */
function bindDashboard(saveCallback, rows, dateStr, stationId) {
  document.querySelectorAll('.h-dash-input').forEach(input => {
    input.addEventListener('change', () => {
      const dsEl = document.getElementById('dash-ds');
      if (dsEl) {
        const colis   = document.querySelector('[data-dash="colis"]')?.value;
        const retours = document.querySelector('[data-dash="retours"]')?.value;
        const dsVal = calcDS(colis, retours);
        const dsPct = parseFloat(dsVal) || 0;
        const dsColor = dsPct >= 98.5 ? '#4ade80' : dsPct >= 97 ? '#f59e0b' : dsPct > 0 ? '#f87171' : 'var(--text-muted)';
        const dsStroke = dsPct > 0 ? Math.min(dsPct, 100) * 2.51327 : 0;
        dsEl.textContent = dsVal;
        dsEl.style.color = dsColor;
        const gaugeCircle = document.querySelector('.h-dash-gauge circle:nth-child(2)');
        if (gaugeCircle) {
          gaugeCircle.setAttribute('stroke', dsColor);
          gaugeCircle.setAttribute('stroke-dasharray', dsStroke + ' 251.327');
        }
      }
      saveCallback();
    });
    // Mise à jour DS en temps réel pour colis/retours uniquement
    if (input.dataset.dash === 'colis' || input.dataset.dash === 'retours') {
      input.addEventListener('input', () => {
        const dsEl = document.getElementById('dash-ds');
        if (!dsEl) return;
        const colis   = document.querySelector('[data-dash="colis"]')?.value;
        const retours = document.querySelector('[data-dash="retours"]')?.value;
        const dsVal = calcDS(colis, retours);
        const dsPct = parseFloat(dsVal) || 0;
        const dsColor = dsPct >= 98.5 ? '#4ade80' : dsPct >= 97 ? '#f59e0b' : dsPct > 0 ? '#f87171' : 'var(--text-muted)';
        const dsStroke = dsPct > 0 ? Math.min(dsPct, 100) * 2.51327 : 0;
        dsEl.textContent = dsVal;
        dsEl.style.color = dsColor;
        const gaugeCircle = document.querySelector('.h-dash-gauge circle:nth-child(2)');
        if (gaugeCircle) {
          gaugeCircle.setAttribute('stroke', dsColor);
          gaugeCircle.setAttribute('stroke-dasharray', dsStroke + ' 251.327');
        }
      });
    }
  });

  const waBtn = document.getElementById('btn-copy-wa');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      const msg = buildWAMessage(rows, dateStr, stationId);
      navigator.clipboard.writeText(msg).then(() => {
        waBtn.textContent = '✅ Copié !';
        setTimeout(() => { waBtn.textContent = '📋 Copier message WhatsApp'; }, 2000);
      }).catch(() => {
        prompt('Copiez ce message :', msg);
      });
    });
  }
}

/**
 * Lit les valeurs du dashboard depuis le DOM
 */
function readDashboardValues() {
  const out = {};
  document.querySelectorAll('.h-dash-input').forEach(input => {
    out[input.dataset.dash] = input.value;
  });
  return out;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildStatusList(rows, statut) {
  if (!rows || !rows.length) return '<span style="color:var(--text-muted);font-size:11px;">—</span>';
  const names = rows.filter(r => r.statut === statut && r.nom && r.nom.trim()).map(r => esc(r.nom));
  if (!names.length) return '<span style="color:var(--text-muted);font-size:11px;">—</span>';
  return names.map(n => `<div style="font-size:11px;color:var(--text-primary);padding:1px 0;">${n}</div>`).join('');
}
