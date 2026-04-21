/* js/chef-equipe.js — Module Chef d'équipe (SunXP Pro) */
console.log('chef-equipe.js chargé');

let ceTab = 'extraction-eos';

function initChefEquipe() {
  ceTab = 'extraction-eos';
  renderChefEquipe();
}

function renderChefEquipe() {
  const container = document.getElementById('module-chef-equipe');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  // Toolbar avec sous-onglets
  const toolbar = document.createElement('div');
  toolbar.className = 'h-toolbar';
  toolbar.innerHTML = `
    <div class="h-toolbar-left">
      <button class="h-btn rh-tab-btn ${ceTab === 'extraction-eos' ? 'rh-tab-active' : ''}" data-cetab="extraction-eos">Extraction EOS</button>
    </div>
    <div class="h-toolbar-center"></div>
    <div class="h-toolbar-right"></div>
  `;
  toolbar.querySelectorAll('.rh-tab-btn').forEach(btn => {
    btn.onclick = () => { ceTab = btn.dataset.cetab; renderChefEquipe(); };
  });
  container.appendChild(toolbar);

  const content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;padding:16px;';

  if (ceTab === 'extraction-eos') {
    if (typeof renderExtractionEOS === 'function') content.appendChild(renderExtractionEOS());
    else content.innerHTML = '<p style="color:var(--text-muted);">Module non chargé.</p>';
  }

  container.appendChild(content);
}
