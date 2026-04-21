/* js/parametres.js — Onglet Paramètres du menu déroulant (SunXP Pro) */
console.log('parametres.js chargé');

const THEMES = [
  { id: 'dark',    label: 'Sombre (défaut)',  cls: '' },
  { id: 'light',   label: 'Clair',            cls: 'light-mode' },
  { id: 'blue',    label: 'Bleu nuit',        cls: 'theme-blue' },
  { id: 'green',   label: 'Vert forêt',       cls: 'theme-green' }
];

const FONTS = [
  { id: 'segoe',    label: 'Segoe UI (défaut)', value: "'Segoe UI', system-ui, sans-serif" },
  { id: 'inter',    label: 'Inter',             value: "'Inter', system-ui, sans-serif" },
  { id: 'roboto',   label: 'Roboto',            value: "'Roboto', system-ui, sans-serif" },
  { id: 'mono',     label: 'Monospace',         value: "'Courier New', monospace" }
];

function renderParametres() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:20px;';

  // ── Couleur d'accent ──
  const themeSection = document.createElement('div');
  themeSection.innerHTML = '<h3 style="font-size:14px;margin-bottom:10px;color:var(--accent);">🎨 Couleur d\'accent</h3>';
  const currentColor = localStorage.getItem('sunxp-accent') || '#7c6af7';
  const colorWrap = document.createElement('div');
  colorWrap.style.cssText = 'display:flex;align-items:center;gap:12px;';
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.value = currentColor;
  colorPicker.style.cssText = 'width:48px;height:48px;border:2px solid var(--border);border-radius:8px;cursor:pointer;background:transparent;padding:0;';
  const colorLabel = document.createElement('span');
  colorLabel.style.cssText = 'font-size:12px;color:var(--text-muted);';
  colorLabel.textContent = currentColor;
  colorPicker.oninput = () => {
    applyAccentColor(colorPicker.value);
    colorLabel.textContent = colorPicker.value;
  };
  colorWrap.appendChild(colorPicker);
  colorWrap.appendChild(colorLabel);
  themeSection.appendChild(colorWrap);

  // Presets rapides
  const presets = document.createElement('div');
  presets.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;';
  ['#7c6af7','#4ade80','#60a5fa','#f97316','#f87171','#fbbf24','#a78bfa','#ec4899','#14b8a6','#ffffff'].forEach(c => {
    const dot = document.createElement('button');
    dot.style.cssText = `width:28px;height:28px;border-radius:50%;border:2px solid ${c === currentColor ? '#fff' : 'transparent'};background:${c};cursor:pointer;transition:border-color 0.15s;`;
    dot.onclick = () => { colorPicker.value = c; applyAccentColor(c); colorLabel.textContent = c; if (typeof setMenuTab === 'function') setMenuTab('parametres'); };
    presets.appendChild(dot);
  });
  themeSection.appendChild(presets);

  // Mode clair/sombre
  const modeWrap = document.createElement('div');
  modeWrap.style.cssText = 'margin-top:12px;';
  modeWrap.innerHTML = '<h3 style="font-size:14px;margin-bottom:8px;color:var(--accent);">🌓 Mode</h3>';
  const isLight = document.body.classList.contains('light-mode');
  const modeBtn = document.createElement('button');
  modeBtn.className = 'menu-param-btn';
  modeBtn.textContent = isLight ? '🌙 Passer en mode sombre' : '☀️ Passer en mode clair';
  modeBtn.onclick = () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('sunxp-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    // Réappliquer les couleurs custom après le toggle
    const savedAccent = localStorage.getItem('sunxp-accent');
    if (savedAccent) {
      applyAccentColor(savedAccent);
    } else {
      // Retirer l'override inline pour laisser le CSS du thème s'appliquer
      document.body.style.removeProperty('--accent');
      document.body.style.removeProperty('--accent-dim');
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-dim');
    }
    const savedBg = localStorage.getItem('sunxp-bg');
    if (savedBg) {
      applyBgColor(savedBg);
    } else {
      document.body.style.removeProperty('--bg-primary');
      document.body.style.removeProperty('--bg-sidebar');
      document.body.style.removeProperty('--bg-tab-hover');
      document.body.style.removeProperty('--bg-tab-active');
      document.documentElement.style.removeProperty('--bg-primary');
      document.documentElement.style.removeProperty('--bg-sidebar');
      document.documentElement.style.removeProperty('--bg-tab-hover');
      document.documentElement.style.removeProperty('--bg-tab-active');
    }
    if (typeof setMenuTab === 'function') setMenuTab('parametres');
  };
  modeWrap.appendChild(modeBtn);
  themeSection.appendChild(modeWrap);

  wrap.appendChild(themeSection);

  // ── Couleur de fond ──
  const bgSection = document.createElement('div');
  bgSection.innerHTML = '<h3 style="font-size:14px;margin-bottom:10px;color:var(--accent);">🖌️ Couleur de fond</h3>';
  const currentBg = localStorage.getItem('sunxp-bg') || '';
  const bgWrap = document.createElement('div');
  bgWrap.style.cssText = 'display:flex;align-items:center;gap:12px;';
  const bgPicker = document.createElement('input');
  bgPicker.type = 'color';
  bgPicker.value = currentBg || getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#12121a';
  bgPicker.style.cssText = 'width:48px;height:48px;border:2px solid var(--border);border-radius:8px;cursor:pointer;background:transparent;padding:0;';
  const bgLabel = document.createElement('span');
  bgLabel.style.cssText = 'font-size:12px;color:var(--text-muted);';
  bgLabel.textContent = bgPicker.value;
  bgPicker.oninput = () => { applyBgColor(bgPicker.value); bgLabel.textContent = bgPicker.value; };
  bgWrap.appendChild(bgPicker);
  bgWrap.appendChild(bgLabel);
  bgSection.appendChild(bgWrap);

  // Presets fond
  const bgPresets = document.createElement('div');
  bgPresets.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;';
  ['#12121a','#0a1628','#0a1a10','#1a1020','#1a1a1a','#2a1a1a','#1a2a2a'].forEach(c => {
    const dot = document.createElement('button');
    dot.style.cssText = `width:28px;height:28px;border-radius:50%;border:2px solid ${c === currentBg ? '#fff' : 'rgba(255,255,255,0.2)'};background:${c};cursor:pointer;`;
    dot.onclick = () => { bgPicker.value = c; applyBgColor(c); bgLabel.textContent = c; };
    bgPresets.appendChild(dot);
  });
  bgSection.appendChild(bgPresets);

  // Bouton reset
  const resetBtn = document.createElement('button');
  resetBtn.className = 'menu-param-btn';
  resetBtn.style.cssText = 'margin-top:8px;font-size:11px;opacity:0.6;';
  resetBtn.textContent = '↩ Réinitialiser les couleurs';
  resetBtn.onclick = () => {
    localStorage.removeItem('sunxp-accent');
    localStorage.removeItem('sunxp-bg');
    document.documentElement.removeAttribute('style');
    if (typeof setMenuTab === 'function') setMenuTab('parametres');
  };
  bgSection.appendChild(resetBtn);

  wrap.appendChild(bgSection);

  // ── Police ──
  const fontSection = document.createElement('div');
  fontSection.innerHTML = '<h3 style="font-size:14px;margin-bottom:10px;color:var(--accent);">🔤 Police</h3>';
  const currentFont = localStorage.getItem('sunxp-font') || 'segoe';
  FONTS.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'menu-param-btn' + (currentFont === f.id ? ' active' : '');
    btn.textContent = f.label;
    btn.style.fontFamily = f.value;
    btn.onclick = () => applyFont(f);
    fontSection.appendChild(btn);
  });
  wrap.appendChild(fontSection);

  // ── Sidebar compacte ──
  const compactSection = document.createElement('div');
  compactSection.innerHTML = '<h3 style="font-size:14px;margin-bottom:10px;color:var(--accent);">📐 Sidebar compacte</h3>';
  const isCompact = localStorage.getItem('sunxp-compact') === 'true';
  const toggle = document.createElement('label');
  toggle.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = isCompact;
  cb.onchange = () => {
    localStorage.setItem('sunxp-compact', cb.checked);
    document.documentElement.style.setProperty('--sidebar-width', cb.checked ? '60px' : '220px');
    document.querySelectorAll('.nav-tab .label').forEach(l => l.style.display = cb.checked ? 'none' : '');
    // Réduire le header sidebar en mode compact
    const sh = document.querySelector('.sidebar-header');
    if (sh) {
      if (cb.checked) {
        sh.style.cssText = 'padding:6px 4px;font-size:9px;overflow:hidden;text-align:center;';
        const csBtn = sh.querySelector('#btn-change-station');
        if (csBtn) { csBtn.dataset.fullText = csBtn.textContent; csBtn.textContent = '⇌'; csBtn.style.fontSize = '14px'; csBtn.style.padding = '4px'; }
      } else {
        sh.style.cssText = '';
        const csBtn = sh.querySelector('#btn-change-station');
        if (csBtn && csBtn.dataset.fullText) { csBtn.textContent = csBtn.dataset.fullText; csBtn.style.fontSize = ''; csBtn.style.padding = ''; }
      }
    }
  };
  toggle.appendChild(cb);
  toggle.appendChild(document.createTextNode('Réduire la sidebar aux icônes'));
  compactSection.appendChild(toggle);
  wrap.appendChild(compactSection);

  return wrap;
}

function applyAccentColor(color) {
  // Appliquer sur body pour ne pas écraser les variables de body.light-mode
  document.body.style.setProperty('--accent', color);
  document.body.style.setProperty('--accent-dim', color + '22');
  localStorage.setItem('sunxp-accent', color);
}

function applyBgColor(color) {
  // Appliquer sur body pour ne pas écraser les variables de body.light-mode
  document.body.style.setProperty('--bg-primary', color);
  document.body.style.setProperty('--bg-sidebar', lighten(color, 8));
  document.body.style.setProperty('--bg-tab-hover', lighten(color, 14));
  document.body.style.setProperty('--bg-tab-active', lighten(color, 18));
  localStorage.setItem('sunxp-bg', color);
}

/** Éclaircit une couleur hex de N unités (0-255) */
function lighten(hex, amount) {
  let r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, r + amount); g = Math.min(255, g + amount); b = Math.min(255, b + amount);
  return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
}

function applyTheme(theme) {
  // Retirer toutes les classes de thème
  document.body.classList.remove('light-mode', 'theme-blue', 'theme-green');
  if (theme.cls) document.body.classList.add(theme.cls);
  localStorage.setItem('sunxp-theme', theme.id);
  // Rafraîchir le panneau
  if (typeof setMenuTab === 'function') setMenuTab('parametres');
}

function applyFont(font) {
  document.documentElement.style.setProperty('--font-family', font.value);
  document.body.style.fontFamily = font.value;
  localStorage.setItem('sunxp-font', font.id);
  if (typeof setMenuTab === 'function') setMenuTab('parametres');
}

// Appliquer les préférences sauvegardées au chargement
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('sunxp-theme');
  if (savedTheme === 'light') document.body.classList.add('light-mode');
  const savedAccent = localStorage.getItem('sunxp-accent');
  if (savedAccent) applyAccentColor(savedAccent);
  const savedBg = localStorage.getItem('sunxp-bg');
  if (savedBg) applyBgColor(savedBg);
  const savedFont = localStorage.getItem('sunxp-font');
  if (savedFont) {
    const f = FONTS.find(fo => fo.id === savedFont);
    if (f) {
      document.documentElement.style.setProperty('--font-family', f.value);
      document.body.style.fontFamily = f.value;
    }
  }
  const savedCompact = localStorage.getItem('sunxp-compact');
  if (savedCompact === 'true') {
    document.documentElement.style.setProperty('--sidebar-width', '60px');
    document.querySelectorAll('.nav-tab .label').forEach(l => l.style.display = 'none');
    const sh = document.querySelector('.sidebar-header');
    if (sh) {
      sh.style.cssText = 'padding:6px 4px;font-size:9px;overflow:hidden;text-align:center;';
      const csBtn = sh.querySelector('#btn-change-station');
      if (csBtn) { csBtn.dataset.fullText = csBtn.textContent; csBtn.textContent = '⇌'; csBtn.style.fontSize = '14px'; csBtn.style.padding = '4px'; }
    }
  }
});
