/* js/flotte.js — Module Flotte (SunXP Pro) */
console.log('flotte.js chargé');

let flotteTab = 'camions'; // 'camions' | 'degats'

function initFlotte() { flotteTab = 'camions'; renderFlotte(); }

function renderFlotte() {
  const container = document.getElementById('module-flotte');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  const toolbar = document.createElement('div');
  toolbar.className = 'h-toolbar';
  toolbar.innerHTML = `<div class="h-toolbar-left">
    <button class="h-btn rh-tab-btn ${flotteTab==='camions'?'rh-tab-active':''}" data-ft="camions">🚛 Répertoire Camions</button>
    <button class="h-btn rh-tab-btn ${flotteTab==='degats'?'rh-tab-active':''}" data-ft="degats">🔧 Dégâts</button>
  </div><div class="h-toolbar-center"></div><div class="h-toolbar-right"></div>`;
  toolbar.querySelectorAll('.rh-tab-btn').forEach(b => { b.onclick = () => { flotteTab = b.dataset.ft; renderFlotte(); }; });
  container.appendChild(toolbar);

  const content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;padding:16px;';
  if (flotteTab === 'camions') content.appendChild(typeof renderCamions === 'function' ? renderCamions() : document.createElement('div'));
  else content.appendChild(typeof renderDegats === 'function' ? renderDegats() : document.createElement('div'));
  container.appendChild(content);
}
