/* js/identifier-chauffeurs.js — Identifier des chauffeurs par ID Amazon (SunXP Pro) */
console.log('identifier-chauffeurs.js chargé');

let repView = 'repertoire'; // 'repertoire' | 'identifier'

function renderIdentifier(stationId) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px;';

  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin-bottom:4px;">🔍 Identifier Chauffeurs par ID Amazon</h3><p style="font-size:11px;color:var(--text-muted);">Collez un texte contenant des ID Amazon (ex: AZR123456789). Les ID seront détectés automatiquement.</p>';

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Collez ici un texte avec des ID Amazon...';
  textarea.style.cssText = 'width:100%;min-height:100px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:12px;padding:10px;font-family:var(--font-family);resize:vertical;';
  wrap.appendChild(textarea);

  const btn = document.createElement('button');
  btn.className = 'rep-btn rep-btn-primary';
  btn.textContent = '🔍 Identifier';
  wrap.appendChild(btn);

  const resultArea = document.createElement('div');
  resultArea.id = 'identifier-results';
  wrap.appendChild(resultArea);

  btn.onclick = () => {
    const text = textarea.value;
    if (!text.trim()) return;
    resultArea.innerHTML = '';

    // Extraire les ID Amazon du texte (pattern: A suivi de lettres/chiffres, 4+ chars)
    const ids = [...new Set(text.match(/A[A-Z0-9]{3,}/gi) || [])].map(id => id.toUpperCase());

    if (!ids.length) {
      resultArea.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Aucun ID Amazon détecté dans le texte.</p>';
      return;
    }

    // Chercher dans le répertoire
    const chauffeurs = loadChauffeurs(stationId);

    const table = document.createElement('table');
    table.className = 'h-table';
    table.style.cssText = 'font-size:12px;';
    table.innerHTML = '<thead><tr><th style="text-align:left;padding:6px 8px;">ID Amazon</th><th style="text-align:left;padding:6px 8px;">Chauffeur</th><th style="text-align:left;padding:6px 8px;">Téléphone</th></tr></thead>';

    const tbody = document.createElement('tbody');
    ids.forEach(id => {
      const found = chauffeurs.find(c => (c.id_amazon || '').toUpperCase() === id);
      const tr = document.createElement('tr');
      if (found) {
        tr.innerHTML = `<td style="padding:4px 8px;font-family:monospace;color:var(--accent);">${id}</td><td style="padding:4px 8px;font-weight:600;">${found.prenom} ${found.nom}</td><td style="padding:4px 8px;color:var(--text-muted);">${found.telephone || '—'}</td>`;
      } else {
        tr.innerHTML = `<td style="padding:4px 8px;font-family:monospace;color:#f87171;">${id}</td><td style="padding:4px 8px;color:#f87171;">❌ Non trouvé</td><td style="padding:4px 8px;">—</td>`;
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    resultArea.appendChild(table);

    // Résumé
    const foundCount = ids.filter(id => chauffeurs.some(c => (c.id_amazon || '').toUpperCase() === id)).length;
    const summary = document.createElement('div');
    summary.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:6px;';
    summary.textContent = `${foundCount}/${ids.length} identifiés.`;
    resultArea.appendChild(summary);
  };

  return wrap;
}
