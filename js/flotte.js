/* js/flotte.js — Module Flotte (SunXP Pro) */
console.log('flotte.js chargé');

let flotteTab = 'camions'; // 'camions' | 'degats' | 'problemes' | 'entretien' | 'documents' | 'attribution'

function initFlotte() { flotteTab = 'camions'; renderFlotte(); }

/* ── Badge CT expirantes pour sous-onglet Suivi Entretien ── */
function getCTBadgeHTML(sid) {
  const ctCount = typeof getCTExpiringSoon === 'function' ? getCTExpiringSoon(sid).length : 0;
  if (ctCount === 0) return '';
  return ' <span style="background:#f87171;color:#fff;font-size:9px;font-weight:700;min-width:14px;height:14px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px;vertical-align:middle;">' + ctCount + '</span>';
}

function renderFlotte() {
  const container = document.getElementById('module-flotte');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  const sid = window.getActiveStationId ? window.getActiveStationId() : 'default';

  const toolbar = document.createElement('div');
  toolbar.className = 'h-toolbar';
  toolbar.innerHTML = `<div class="h-toolbar-left">
    <button class="h-btn rh-tab-btn ${flotteTab==='camions'?'rh-tab-active':''}" data-ft="camions">🚛 Camions</button>
    <button class="h-btn rh-tab-btn ${flotteTab==='degats'?'rh-tab-active':''}" data-ft="degats">🔧 Dégâts</button>
    <button class="h-btn rh-tab-btn ${flotteTab==='problemes'?'rh-tab-active':''}" data-ft="problemes">⚠️ Problèmes</button>
    <button class="h-btn rh-tab-btn ${flotteTab==='entretien'?'rh-tab-active':''}" data-ft="entretien" style="position:relative;">🛠 Suivi Entretien${getCTBadgeHTML(sid)}</button>
    <button class="h-btn rh-tab-btn ${flotteTab==='documents'?'rh-tab-active':''}" data-ft="documents">📄 Documents</button>
    <button class="h-btn rh-tab-btn ${flotteTab==='attribution'?'rh-tab-active':''}" data-ft="attribution">🔑 Attribution</button>
  </div><div class="h-toolbar-center"></div><div class="h-toolbar-right"></div>`;
  toolbar.querySelectorAll('.rh-tab-btn').forEach(b => { b.onclick = () => { flotteTab = b.dataset.ft; renderFlotte(); }; });
  container.appendChild(toolbar);

  const content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;padding:16px;';
  if (flotteTab === 'camions') content.appendChild(typeof renderCamions === 'function' ? renderCamions() : document.createElement('div'));
  else if (flotteTab === 'degats') content.appendChild(typeof renderDegats === 'function' ? renderDegats() : document.createElement('div'));
  else if (flotteTab === 'problemes') content.appendChild(typeof renderProblemesResponsable === 'function' ? renderProblemesResponsable() : document.createElement('div'));
  else if (flotteTab === 'entretien') content.appendChild(typeof renderSuiviEntretien === 'function' ? renderSuiviEntretien() : document.createElement('div'));
  else if (flotteTab === 'documents') { const p = document.createElement('p'); p.style.cssText = 'color:var(--text-muted);text-align:center;margin-top:40px;'; p.textContent = '📄 Documents — à venir'; content.appendChild(p); }
  else if (flotteTab === 'attribution') content.appendChild(typeof renderAttribution === 'function' ? renderAttribution() : document.createElement('div'));
  container.appendChild(content);
}
