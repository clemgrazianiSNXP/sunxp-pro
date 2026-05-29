/* js/game-chargement.js — Mini-jeu Chargement Parfait 🏗️ (SunXP Pro) */
console.log('game-chargement.js chargé');

function startGameChargement() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  const LEVELS = [
    { cols: 10, rows: 6, time: 60, shapes: [[1,1],[2,1],[1,2],[2,2],[3,1]] },
    { cols: 10, rows: 6, time: 60, shapes: [[1,1],[2,1],[1,2],[2,2],[3,1],[1,3]] },
    { cols: 9, rows: 6, time: 55, shapes: [[1,1],[2,1],[1,2],[2,2],[3,1],[3,2],[1,3]] },
    { cols: 8, rows: 6, time: 50, shapes: [[2,1],[1,2],[2,2],[3,1],[3,2],[2,3]] },
    { cols: 8, rows: 5, time: 45, shapes: [[2,1],[1,2],[2,2],[3,1],[3,2],[2,3],[3,3]] }
  ];

  let level = 0, score = 0, totalPlaced = 0, alignBonus = 0;
  let grid, cols, rows, timeLeft, timerInterval;
  let currentPiece = null, nextPiece = null;
  let gameActive = true;

  function getLevelConfig() { return LEVELS[Math.min(level, LEVELS.length - 1)]; }

  function genPiece() {
    const cfg = getLevelConfig();
    const shapes = cfg.shapes;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    return { w: shape[0], h: shape[1] };
  }

  function canPlace(piece, startRow, startCol) {
    if (startRow + piece.h > rows || startCol + piece.w > cols) return false;
    if (startRow < 0 || startCol < 0) return false;
    for (let r = 0; r < piece.h; r++) {
      for (let c = 0; c < piece.w; c++) {
        if (grid[startRow + r][startCol + c] !== 0) return false;
      }
    }
    return true;
  }

  function placePiece(piece, startRow, startCol) {
    totalPlaced++;
    for (let r = 0; r < piece.h; r++) {
      for (let c = 0; c < piece.w; c++) {
        grid[startRow + r][startCol + c] = totalPlaced;
      }
    }
    checkAlignBonus();
    // Check if 100% full -> next level
    if (getUsedPercent() >= 100) {
      score += calcScore();
      level++;
      if (level >= LEVELS.length) { endGame(); return; }
      // Reset grid for next level
      const cfg = getLevelConfig();
      cols = cfg.cols;
      rows = cfg.rows;
      timeLeft = cfg.time;
      grid = Array(rows).fill(null).map(() => Array(cols).fill(0));
      totalPlaced = 0;
      currentPiece = genPiece();
      nextPiece = genPiece();
      if (stageTimer) clearInterval(stageTimer);
      initGame();
      return;
    }
    currentPiece = nextPiece;
    nextPiece = genPiece();
    if (!canFitAnywhere(currentPiece)) {
      endGame();
      return;
    }
    renderGrid();
    renderInfo();
  }

  function canFitAnywhere(piece) {
    for (let r = 0; r <= rows - piece.h; r++) {
      for (let c = 0; c <= cols - piece.w; c++) {
        if (canPlace(piece, r, c)) return true;
      }
    }
    return false;
  }

  function checkAlignBonus() {
    for (let r = 0; r < rows; r++) {
      let consecutive = 1;
      for (let c = 1; c < cols; c++) {
        if (grid[r][c] !== 0 && grid[r][c] !== grid[r][c-1] && grid[r][c-1] !== 0) {
          consecutive++;
          if (consecutive === 3) { alignBonus += 100; }
        } else {
          consecutive = 1;
        }
      }
    }
  }

  function getUsedPercent() {
    let used = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] !== 0) used++;
    return Math.round((used / (rows * cols)) * 100);
  }

  function calcScore() {
    const pct = getUsedPercent();
    let base = 0;
    if (pct >= 100) base = 1000;
    else if (pct >= 90) base = 800;
    else if (pct >= 80) base = 600;
    else base = Math.floor(pct * 5);
    return base + alignBonus;
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!gameActive) { clearInterval(timerInterval); return; }
      timeLeft--;
      const el = document.getElementById('charg-timer');
      if (el) {
        el.textContent = timeLeft + 's';
        el.style.color = timeLeft <= 10 ? '#ef4444' : '#fff';
      }
      const bar = document.getElementById('charg-timer-bar');
      const cfg = getLevelConfig();
      if (bar) bar.style.width = (timeLeft / cfg.time * 100) + '%';
      if (timeLeft <= 0) { clearInterval(timerInterval); endGame(); }
    }, 1000);
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    score += calcScore(); // Add current level score
    if (score > 0 && typeof saveScore === 'function') saveScore('chargement', score);
    showGameOver();
  }

  function highlightCells(row, col, valid) {
    // Clear all highlights
    document.querySelectorAll('.charg-cell').forEach(c => {
      c.style.outline = 'none';
      if (c.dataset.filled === '0') c.style.background = 'rgba(255,255,255,0.03)';
    });
    if (!currentPiece || row < 0 || col < 0) return;
    for (let r = 0; r < currentPiece.h; r++) {
      for (let c = 0; c < currentPiece.w; c++) {
        const cell = document.querySelector('.charg-cell[data-r="' + (row+r) + '"][data-c="' + (col+c) + '"]');
        if (cell && cell.dataset.filled === '0') {
          cell.style.background = valid ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)';
          cell.style.outline = valid ? '2px solid #4ade80' : '2px solid #ef4444';
        }
      }
    }
  }

  function renderGrid() {
    const gridEl = document.getElementById('charg-grid');
    if (!gridEl) return;
    const cells = gridEl.querySelectorAll('.charg-cell');
    cells.forEach(cell => {
      const r = parseInt(cell.dataset.r);
      const c = parseInt(cell.dataset.c);
      const filled = grid[r][c] !== 0;
      cell.dataset.filled = filled ? '1' : '0';
      cell.style.background = filled ? '#92400e' : 'rgba(255,255,255,0.03)';
      cell.style.outline = 'none';
      cell.textContent = filled ? '📦' : '';
    });
  }

  function renderInfo() {
    const pct = getUsedPercent();
    const pctEl = document.getElementById('charg-pct');
    if (pctEl) { pctEl.textContent = pct + '%'; pctEl.style.color = pct >= 90 ? '#4ade80' : pct >= 70 ? '#fbbf24' : '#fff'; }
    const barEl = document.getElementById('charg-fill-bar');
    if (barEl) barEl.style.width = pct + '%';
    // Update current piece preview
    const curEl = document.getElementById('charg-cur-preview');
    if (curEl && currentPiece) {
      curEl.style.gridTemplateColumns = 'repeat(' + currentPiece.w + ',22px)';
      let html = '';
      for (let r = 0; r < currentPiece.h; r++) for (let c = 0; c < currentPiece.w; c++) {
        html += '<div style="width:22px;height:22px;background:#f59e0b;border:1px solid rgba(255,255,255,0.3);border-radius:2px;"></div>';
      }
      curEl.innerHTML = html;
    }
    const curSize = document.getElementById('charg-cur-size');
    if (curSize && currentPiece) curSize.textContent = currentPiece.w + 'x' + currentPiece.h;
    // Update next piece preview
    const nxtEl = document.getElementById('charg-nxt-preview');
    if (nxtEl && nextPiece) {
      nxtEl.style.gridTemplateColumns = 'repeat(' + nextPiece.w + ',18px)';
      let html = '';
      for (let r = 0; r < nextPiece.h; r++) for (let c = 0; c < nextPiece.w; c++) {
        html += '<div style="width:18px;height:18px;background:#92400e;border:1px solid rgba(255,255,255,0.2);border-radius:2px;"></div>';
      }
      nxtEl.innerHTML = html;
    }
  }

  function initGame() {
    const cfg = getLevelConfig();
    cols = cfg.cols;
    rows = cfg.rows;
    timeLeft = cfg.time;
    grid = Array(rows).fill(null).map(() => Array(cols).fill(0));
    currentPiece = genPiece();
    nextPiece = genPiece();
    totalPlaced = 0;
    alignBonus = 0;
    gameActive = true;

    const cellSize = Math.min(Math.floor((portal.clientWidth - 80) / cols), Math.floor((portal.clientHeight - 220) / rows), 38);

    let gridHtml = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        gridHtml += '<div class="charg-cell" data-r="' + r + '" data-c="' + c + '" data-filled="0" style="width:' + cellSize + 'px;height:' + cellSize + 'px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:' + Math.max(8, cellSize-20) + 'px;transition:background 0.1s;"></div>';
      }
    }

    portal.innerHTML = '';
    portal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg-primary,#12121a);display:flex;flex-direction:column;overflow:hidden;';

    portal.innerHTML = `
      <div style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <button id="charg-back" style="padding:4px 8px;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);border:1px solid var(--border,#444);border-radius:4px;cursor:pointer;font-size:11px;">←</button>
        <span style="font-size:12px;font-weight:700;">🏗️ Chargement Parfait</span>
        <span id="charg-timer" style="margin-left:auto;font-family:monospace;font-size:14px;font-weight:700;">${timeLeft}s</span>
      </div>
      <div style="height:4px;background:#333;flex-shrink:0;">
        <div id="charg-timer-bar" style="height:100%;width:100%;background:#f97316;transition:width 1s linear;"></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px;overflow:hidden;color:#fff;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="text-align:center;">
            <div style="font-size:9px;color:#9ca3af;">ACTUEL</div>
            <div id="charg-cur-preview" style="display:grid;gap:1px;margin:4px 0;"></div>
            <div id="charg-cur-size" style="font-size:9px;color:#9ca3af;"></div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:9px;color:#9ca3af;">SUIVANT</div>
            <div id="charg-nxt-preview" style="display:grid;gap:1px;margin:4px 0;"></div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:9px;color:#9ca3af;">REMPLI</div>
            <div id="charg-pct" style="font-size:18px;font-weight:900;">0%</div>
          </div>
        </div>
        <div style="background:#374151;border-radius:8px;padding:8px;border:2px solid #6b7280;position:relative;">
          <div id="charg-grid" style="display:grid;grid-template-columns:repeat(${cols},${cellSize}px);gap:1px;">
            ${gridHtml}
          </div>
        </div>
        <div style="width:${cols*(cellSize+1)}px;height:6px;background:#4b5563;border-radius:3px;overflow:hidden;">
          <div id="charg-fill-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#f97316,#4ade80);transition:width 0.3s;border-radius:3px;"></div>
        </div>
        <div style="font-size:10px;color:#9ca3af;">Cliquez sur la grille pour placer le colis (coin haut-gauche)</div>
      </div>
    `;

    // Back button
    document.getElementById('charg-back').onclick = () => {
      gameActive = false;
      if (timerInterval) clearInterval(timerInterval);
      initGamesPage();
    };

    // Bind grid events — NOT recreated on each interaction
    document.querySelectorAll('.charg-cell').forEach(cell => {
      cell.onmouseenter = () => {
        if (!gameActive || !currentPiece) return;
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        const valid = canPlace(currentPiece, r, c);
        highlightCells(r, c, valid);
      };
      cell.onclick = () => {
        if (!gameActive || !currentPiece) return;
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        if (canPlace(currentPiece, r, c)) {
          placePiece(currentPiece, r, c);
        }
      };
      // Touch support
      cell.ontouchstart = (e) => {
        e.preventDefault();
        if (!gameActive || !currentPiece) return;
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        if (canPlace(currentPiece, r, c)) {
          placePiece(currentPiece, r, c);
        }
      };
    });

    const gridEl = document.getElementById('charg-grid');
    if (gridEl) gridEl.onmouseleave = () => highlightCells(-1, -1, false);

    renderInfo();
    startTimer();
  }

  async function showGameOver() {
    const pct = getUsedPercent();
    const scores = await loadStationScores('chargement');
    const top5 = scores.slice(0, 5);

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;background:var(--bg-primary,#12121a);">
        <div style="font-size:48px;margin-bottom:10px;">🏗️📦</div>
        <h2 style="font-size:22px;margin:0 0 8px;">Chargement terminé!</h2>
        <p style="font-size:28px;font-weight:bold;color:#fbbf24;margin:0 0 4px;">${score} pts</p>
        <p style="font-size:13px;color:#9ca3af;margin:0 0 4px;">Remplissage : ${pct}% • ${totalPlaced} colis placés</p>
        <p style="font-size:11px;color:#9ca3af;margin:0 0 20px;">${alignBonus > 0 ? 'Bonus alignement : +' + alignBonus : ''}</p>
        
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;width:100%;max-width:300px;margin-bottom:20px;">
          <h3 style="font-size:14px;margin:0 0 10px;color:#f97316;">🏆 Top 5 Station</h3>
          ${top5.length > 0 ? top5.map((s, i) => `
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);">
              <span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.'} ${s.chauffeur_nom || 'Joueur'}</span>
              <span style="color:#fbbf24;">${s.score} pts</span>
            </div>
          `).join('') : '<p style="font-size:12px;color:#6b7280;">Aucun score enregistré</p>'}
        </div>

        <div style="display:flex;gap:12px;">
          <button onclick="startGameChargement()" style="padding:12px 24px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">🔄 Rejouer</button>
          <button onclick="initGamesPage()" style="padding:12px 24px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:14px;cursor:pointer;">← Retour aux jeux</button>
        </div>
      </div>
    `;
  }

  initGame();
}

window.startGameChargement = startGameChargement;
