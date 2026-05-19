/* js/admin-logs.js — Onglet Logs (SunXP Pro Admin) */
console.log('admin-logs.js chargé');

let _logsPage = 0;
let _logsFilters = { station: '', action: '', dateFrom: '', dateTo: '' };
const LOGS_PER_PAGE = 50;

async function renderAdminLogs(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';

  // Charger les stations et actions distinctes pour les filtres
  let stations = [];
  let actions = [];
  try {
    const { data: stData } = await sb().from('stations').select('id, nom');
    stations = stData || [];
    const { data: actData } = await sb().from('activity_logs').select('action');
    if (actData) {
      const set = new Set(actData.map(a => a.action));
      actions = [...set].sort();
    }
  } catch (_) {}

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

  // Barre de filtres
  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';

  // Filtre station
  const selStation = document.createElement('select');
  selStation.style.cssText = 'font-size:11px;padding:5px 8px;border-radius:6px;';
  selStation.innerHTML = '<option value="">Toutes les stations</option>' + stations.map(s => `<option value="${s.id}" ${_logsFilters.station === s.id ? 'selected' : ''}>${s.nom}</option>`).join('');
  filterBar.appendChild(selStation);

  // Filtre action
  const selAction = document.createElement('select');
  selAction.style.cssText = 'font-size:11px;padding:5px 8px;border-radius:6px;';
  selAction.innerHTML = '<option value="">Toutes les actions</option>' + actions.map(a => `<option value="${a}" ${_logsFilters.action === a ? 'selected' : ''}>${a}</option>`).join('');
  filterBar.appendChild(selAction);

  // Filtre date début
  const inpFrom = document.createElement('input');
  inpFrom.type = 'date';
  inpFrom.style.cssText = 'font-size:11px;padding:4px 6px;border-radius:6px;';
  inpFrom.value = _logsFilters.dateFrom;
  inpFrom.title = 'Date début';
  filterBar.appendChild(inpFrom);

  // Filtre date fin
  const inpTo = document.createElement('input');
  inpTo.type = 'date';
  inpTo.style.cssText = 'font-size:11px;padding:4px 6px;border-radius:6px;';
  inpTo.value = _logsFilters.dateTo;
  inpTo.title = 'Date fin';
  filterBar.appendChild(inpTo);

  // Bouton réinitialiser
  const resetBtn = document.createElement('button');
  resetBtn.className = 'h-btn';
  resetBtn.style.cssText = 'font-size:10px;padding:4px 10px;';
  resetBtn.textContent = '↺ Réinitialiser';
  resetBtn.onclick = () => {
    _logsFilters = { station: '', action: '', dateFrom: '', dateTo: '' };
    _logsPage = 0;
    renderAdminLogs(container);
  };
  filterBar.appendChild(resetBtn);

  wrap.appendChild(filterBar);

  // Container pour les logs
  const logsContainer = document.createElement('div');
  logsContainer.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
  wrap.appendChild(logsContainer);

  // Pagination
  const paginationBar = document.createElement('div');
  paginationBar.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;margin-top:8px;';
  wrap.appendChild(paginationBar);

  container.innerHTML = '';
  container.appendChild(wrap);

  // Fonction de chargement des logs
  async function loadLogs() {
    logsContainer.innerHTML = '<p style="color:var(--text-muted);font-size:11px;">Chargement...</p>';

    try {
      let query = sb().from('activity_logs').select('*', { count: 'exact' });

      // Appliquer les filtres
      if (_logsFilters.station) query = query.eq('station_id', _logsFilters.station);
      if (_logsFilters.action) query = query.eq('action', _logsFilters.action);
      if (_logsFilters.dateFrom) query = query.gte('created_at', _logsFilters.dateFrom + 'T00:00:00');
      if (_logsFilters.dateTo) query = query.lte('created_at', _logsFilters.dateTo + 'T23:59:59');

      // Pagination
      const from = _logsPage * LOGS_PER_PAGE;
      const to = from + LOGS_PER_PAGE - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data: logs, count, error } = await query;
      if (error) { logsContainer.innerHTML = `<p style="color:#f87171;">Erreur: ${error.message}</p>`; return; }

      const totalPages = Math.ceil((count || 0) / LOGS_PER_PAGE);

      logsContainer.innerHTML = '';

      // Header avec compteur
      const header = document.createElement('div');
      header.style.cssText = 'font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:4px;display:flex;justify-content:space-between;';
      header.innerHTML = `<span>📋 Logs (${count || 0} total)</span><span style="font-size:10px;color:var(--text-muted);">Page ${_logsPage + 1}/${totalPages || 1}</span>`;
      logsContainer.appendChild(header);

      if (logs && logs.length) {
        logs.forEach(l => {
          const div = document.createElement('div');
          div.style.cssText = 'padding:8px 10px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:6px;font-size:11px;display:flex;gap:8px;align-items:center;';
          const date = new Date(l.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

          // Couleur action
          let actionColor = 'var(--accent)';
          if (l.action && (l.action.includes('delete') || l.action.includes('suppression'))) actionColor = '#f87171';
          else if (l.action && (l.action.includes('login') || l.action.includes('ajout'))) actionColor = '#4ade80';
          else if (l.action && (l.action.includes('modif') || l.action.includes('update'))) actionColor = '#fbbf24';

          div.innerHTML = `<span style="color:var(--accent);min-width:90px;font-family:monospace;font-size:10px;">${date}</span><span style="font-weight:700;color:${actionColor};min-width:130px;">${l.action}</span><span style="flex:1;color:var(--text-primary);">${l.email}</span><span style="color:var(--text-muted);font-size:10px;">${l.station_id || ''}</span>`;
          logsContainer.appendChild(div);
        });
      } else {
        logsContainer.innerHTML += '<p style="color:var(--text-muted);text-align:center;margin-top:12px;">Aucun log trouvé.</p>';
      }

      // Pagination buttons
      paginationBar.innerHTML = '';
      if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'h-btn';
        prevBtn.style.cssText = 'font-size:11px;padding:5px 12px;';
        prevBtn.textContent = '← Précédent';
        prevBtn.disabled = _logsPage === 0;
        prevBtn.onclick = () => { _logsPage--; loadLogs(); };
        paginationBar.appendChild(prevBtn);

        const pageInfo = document.createElement('span');
        pageInfo.style.cssText = 'font-size:11px;color:var(--text-muted);font-family:monospace;';
        pageInfo.textContent = `${_logsPage + 1} / ${totalPages}`;
        paginationBar.appendChild(pageInfo);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'h-btn';
        nextBtn.style.cssText = 'font-size:11px;padding:5px 12px;';
        nextBtn.textContent = 'Suivant →';
        nextBtn.disabled = _logsPage >= totalPages - 1;
        nextBtn.onclick = () => { _logsPage++; loadLogs(); };
        paginationBar.appendChild(nextBtn);
      }
    } catch (e) { logsContainer.innerHTML = `<p style="color:#f87171;">Erreur: ${e.message}</p>`; }
  }

  // Bind filtres
  const applyFilters = () => {
    _logsFilters.station = selStation.value;
    _logsFilters.action = selAction.value;
    _logsFilters.dateFrom = inpFrom.value;
    _logsFilters.dateTo = inpTo.value;
    _logsPage = 0;
    loadLogs();
  };
  selStation.onchange = applyFilters;
  selAction.onchange = applyFilters;
  inpFrom.onchange = applyFilters;
  inpTo.onchange = applyFilters;

  // Chargement initial
  loadLogs();
}
