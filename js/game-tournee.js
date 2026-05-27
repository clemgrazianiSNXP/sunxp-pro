/* js/game-tournee.js — Mini-jeu Tournée Parfaite 🗺️ (SunXP Pro) */
console.log('game-tournee.js chargé');

function startGameTournee() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  let difficulty = null; // 'easy','normal','expert'
  let addresses = [];
  let visited = [];
  let totalDist = 0;
  let timer = 0;
  let timerInterval = null;
  let gameActive = false;

  function showMenu() {
    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);">
        <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);">
          <button onclick="initGamesPage()" style="padding:5px 10px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;">← Jeux</button>
          <span style="font-size:14px;font-weight:700;">🗺️ Tournée Parfaite</span>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;">
          <div style="font-size:40px;">🗺️</div>
          <h2 style="margin:0;font-size:18px;">Choisissez la difficulté</h2>
          <p style="color:var(--text-muted,#888);font-size:12px;text-align:center;max-width:280px;">Planifiez l'itinéraire le plus court pour livrer tous les colis. Cliquez les adresses dans l'ordre optimal !</p>
          <button onclick="window._startTournee('easy')" style="width:200px;padding:12px;background:#4ade80;color:#000;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">🟢 Facile (15 stops)</button>
          <button onclick="window._startTournee('normal')" style="width:200px;padding:12px;background:#fbbf24;color:#000;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">🟡 Normal (25 stops, 60s)</button>
          <button onclick="window._startTournee('expert')" style="width:200px;padding:12px;background:#f87171;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">🔴 Expert (30 stops, 45s)</button>
        </div>
      </div>
    `;
  }

  window._startTournee = function(diff) {
    difficulty = diff;
    const numAddresses = diff === 'easy' ? 15 : diff === 'normal' ? 25 : 30;
    const timeLimit = diff === 'easy' ? 0 : diff === 'normal' ? 60 : 45;
    
    // Generate random addresses on a grid
    addresses = [];
    const used = new Set();
    used.add('0-0'); // depot
    for (let i = 0; i < numAddresses; i++) {
      let x, y, key;
      do { x = Math.floor(Math.random() * 10); y = Math.floor(Math.random() * 10); key = x+'-'+y; } while (used.has(key));
      used.add(key);
      addresses.push({ id: i, x, y, delivered: false });
    }
    visited = [{ x: 0, y: 0 }]; // Start at depot
    totalDist = 0;
    gameActive = true;
    timer = timeLimit;

    renderGame(timeLimit);

    if (timeLimit > 0) {
      timerInterval = setInterval(() => {
        timer--;
        const timerEl = document.getElementById('tournee-timer');
        if (timerEl) timerEl.textContent = timer + 's';
        if (timer <= 0) { clearInterval(timerInterval); endGame(); }
      }, 1000);
    }
  };

  function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

  function renderGame(timeLimit) {
    const remaining = addresses.filter(a => !a.delivered).length;
    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);">
        <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);flex-shrink:0;font-size:11px;">
          <button onclick="window._tourneeBack()" style="padding:4px 8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px;">←</button>
          <span style="font-weight:700;">🗺️ Tournée</span>
          <span style="margin-left:auto;color:var(--accent,#7c6af7);font-family:monospace;">Restant: ${remaining}</span>
          ${timeLimit > 0 ? '<span id="tournee-timer" style="color:#f87171;font-weight:700;margin-left:8px;">' + timer + 's</span>' : ''}
          <span style="color:var(--text-muted);margin-left:8px;">Dist: ${totalDist.toFixed(1)}</span>
        </div>
        <div id="tournee-grid" style="flex:1;position:relative;margin:8px;border:1px solid var(--border,#333);border-radius:8px;background:#2a3040;overflow:hidden;"></div>
      </div>
    `;

    const grid = document.getElementById('tournee-grid');
    
    // Draw streets (background grid lines)
    for (let i = 1; i < 10; i++) {
      const hLine = document.createElement('div');
      hLine.style.cssText = 'position:absolute;left:0;right:0;height:1px;background:rgba(255,255,255,0.08);top:' + (i * 10) + '%;';
      grid.appendChild(hLine);
      const vLine = document.createElement('div');
      vLine.style.cssText = 'position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.08);left:' + (i * 10) + '%;';
      grid.appendChild(vLine);
    }

    // Draw route lines (SVG)
    if (visited.length > 1) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      let path = '';
      visited.forEach((v, i) => {
        const px = (v.x * 10 + 5) + '%';
        const py = (v.y * 10 + 5) + '%';
        path += (i === 0 ? 'M' : 'L') + ' ' + px + ' ' + py + ' ';
      });
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path);
      pathEl.setAttribute('stroke', '#60a5fa');
      pathEl.setAttribute('stroke-width', '2');
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke-linecap', 'round');
      svg.appendChild(pathEl);
      grid.appendChild(svg);
    }

    // Depot
    const depot = document.createElement('div');
    depot.style.cssText = 'position:absolute;left:3%;top:3%;width:24px;height:24px;background:#f97316;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;z-index:2;border:2px solid #fff;';
    depot.textContent = '🏭';
    depot.title = 'Dépôt';
    grid.appendChild(depot);

    // Addresses
    addresses.forEach(a => {
      const el = document.createElement('div');
      const left = (a.x * 10 + 2) + '%';
      const top = (a.y * 10 + 2) + '%';
      el.style.cssText = 'position:absolute;left:' + left + ';top:' + top + ';width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;cursor:pointer;z-index:3;transition:transform 0.1s;';
      if (a.delivered) {
        el.style.background = '#4ade80';
        el.style.color = '#000';
        el.style.border = '2px solid #22c55e';
        el.style.cursor = 'default';
        el.textContent = '✓';
      } else {
        el.style.background = '#f87171';
        el.style.color = '#fff';
        el.style.border = '2px solid #dc2626';
        el.textContent = a.id + 1;
        el.onmouseenter = () => el.style.transform = 'scale(1.3)';
        el.onmouseleave = () => el.style.transform = '';
        el.onclick = () => deliverAddress(a);
      }
      grid.appendChild(el);
    });
  }

  function deliverAddress(addr) {
    if (!gameActive) return;
    addr.delivered = true;
    const last = visited[visited.length - 1];
    const d = dist(last, addr);
    totalDist += d;
    visited.push({ x: addr.x, y: addr.y });

    const remaining = addresses.filter(a => !a.delivered).length;
    if (remaining === 0) {
      // Return to depot
      const lastP = visited[visited.length - 1];
      totalDist += dist(lastP, { x: 0, y: 0 });
      visited.push({ x: 0, y: 0 });
      endGame();
    } else {
      const timeLimit = difficulty === 'easy' ? 0 : difficulty === 'normal' ? 60 : 45;
      renderGame(timeLimit);
    }
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    
    const delivered = addresses.filter(a => a.delivered).length;
    let score = Math.round(100000 / Math.max(1, totalDist));
    
    // Events for expert mode
    let events = [];
    if (difficulty === 'expert') {
      if (Math.random() > 0.5) { events.push({ type: 'route_barree', text: '🚧 Route barrée ! +20% distance', penalty: Math.round(score * 0.2) }); score -= Math.round(score * 0.2); }
      if (Math.random() > 0.6) { events.push({ type: 'absent', text: '🚪 Client absent ! -500 pts', penalty: 500 }); score -= 500; }
      if (Math.random() > 0.7) { events.push({ type: 'bonus', text: '⚡ Livraison express ! +1000 pts', penalty: -1000 }); score += 1000; }
    }
    score = Math.max(0, score);

    if (score > 0 && typeof saveScore === 'function') saveScore('tournee', score);

    let eventsHtml = '';
    if (events.length) {
      eventsHtml = '<div style="margin-top:12px;">' + events.map(e => '<div style="font-size:11px;padding:4px 8px;background:rgba(255,255,255,0.05);border-radius:4px;margin-bottom:4px;">' + e.text + '</div>').join('') + '</div>';
    }

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);align-items:center;justify-content:center;padding:20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🏁</div>
        <h2 style="margin:0 0 8px;font-size:20px;">Tournée terminée !</h2>
        <div style="font-size:14px;color:var(--text-muted);">${delivered}/${addresses.length} adresses livrées</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Distance totale: ${totalDist.toFixed(1)} unités</div>
        <div style="font-size:28px;font-weight:700;color:var(--accent,#7c6af7);margin:16px 0;font-family:monospace;">${score} pts</div>
        ${eventsHtml}
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button onclick="window._startTournee('${difficulty}')" style="padding:10px 20px;background:var(--accent,#7c6af7);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">🔄 Rejouer</button>
          <button onclick="initGamesPage()" style="padding:10px 20px;background:var(--bg-sidebar);color:var(--text-primary);border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer;">← Jeux</button>
        </div>
      </div>
    `;
  }

  window._tourneeBack = function() {
    if (timerInterval) clearInterval(timerInterval);
    showMenu();
  };

  showMenu();
}

window.startGameTournee = startGameTournee;
