/* js/game-tetris.js — Mini-jeu Tetris Colis 📦 (SunXP Pro) */
console.log('game-tetris.js chargé');

function startGameTetris() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;
  
  portal.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
      <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--bg-sidebar);border-bottom:1px solid var(--border);">
        <button onclick="initGamesPage()" style="padding:6px 12px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;cursor:pointer;">← Jeux</button>
        <span style="font-size:14px;font-weight:700;color:var(--text-primary);">📦 Tetris Colis</span>
        <span id="tetris-score" style="margin-left:auto;font-size:13px;font-weight:700;color:var(--accent);font-family:monospace;">Score: 0</span>
      </div>
      <canvas id="tetris-canvas" style="flex:1;display:block;touch-action:none;background:#1a1a2e;"></canvas>
      <div id="tetris-controls" style="display:flex;gap:0;flex-shrink:0;">
        <button id="tc-left" style="flex:1;padding:18px;font-size:24px;background:var(--bg-sidebar);border:1px solid var(--border);color:var(--text-primary);cursor:pointer;">◀</button>
        <button id="tc-drop" style="flex:1;padding:18px;font-size:24px;background:var(--accent);border:none;color:#fff;cursor:pointer;font-weight:700;">⬇</button>
        <button id="tc-right" style="flex:1;padding:18px;font-size:24px;background:var(--bg-sidebar);border:1px solid var(--border);color:var(--text-primary);cursor:pointer;">▶</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById('tetris-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('tetris-score');

  function resize() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
  resize();
  window.addEventListener('resize', resize);

  // Game constants
  const COLS = 8;
  const VAN_HEIGHT_RATIO = 0.15;
  let cellSize = canvas.width / COLS;

  // Game state
  let score = 0;
  let gameOver = false;
  let speed = 2;
  let frameCount = 0;
  let landed = []; // Array of { x, y, w, h, color }
  let current = null; // { x, y, w, h, color }

  const COLORS = ['#f87171','#fbbf24','#4ade80','#60a5fa','#a78bfa','#f97316','#38bdf8','#ec4899'];

  function spawnColis() {
    const w = Math.floor(Math.random() * 2) + 1; // 1-2 cells wide
    const h = Math.floor(Math.random() * 2) + 1; // 1-2 cells tall
    const x = Math.floor(Math.random() * (COLS - w));
    current = { x, y: 0, w, h, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
  }

  function getVanTop() { return canvas.height * (1 - VAN_HEIGHT_RATIO); }

  function checkCollision(cx, cy, cw, ch) {
    cellSize = canvas.width / COLS;
    const bottom = cy + ch * cellSize;
    // Hit van floor
    if (bottom >= getVanTop()) return true;
    // Hit other landed colis
    for (const l of landed) {
      const lx = l.x * cellSize, ly = l.y, lw = l.w * cellSize, lh = l.h * cellSize;
      const px = cx * cellSize, py = cy, pw = cw * cellSize, ph = ch * cellSize;
      if (px < lx + lw && px + pw > lx && py + ph > ly && py < ly + lh) return true;
    }
    return false;
  }

  function landColis() {
    cellSize = canvas.width / COLS;
    landed.push({ x: current.x, y: current.y, w: current.w, h: current.h * cellSize, color: current.color });
    score += current.w * current.h * 10;
    scoreEl.textContent = 'Score: ' + score;
    // Check if overflowed (any landed piece above screen top + margin)
    if (current.y < cellSize) {
      gameOver = true;
      if (score > 0 && typeof saveScore === 'function') saveScore('tetris', score);
      showGameOver();
      return;
    }
    speed = 2 + Math.floor(score / 100) * 0.5;
    spawnColis();
  }

  function showGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText('📦 VAN PLEINE !', canvas.width/2, canvas.height/2 - 30);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 10);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Touchez pour rejouer', canvas.width/2, canvas.height/2 + 50);
  }

  function draw() {
    cellSize = canvas.width / COLS;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i*cellSize, 0); ctx.lineTo(i*cellSize, getVanTop()); ctx.stroke(); }

    // Van
    const vanTop = getVanTop();
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, vanTop, canvas.width, canvas.height - vanTop);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, vanTop, canvas.width-2, canvas.height - vanTop);
    // Van label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚛 VAN', canvas.width/2, canvas.height - 8);

    // Landed colis
    landed.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.fillRect(l.x * cellSize + 1, l.y + 1, l.w * cellSize - 2, l.h - 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.strokeRect(l.x * cellSize + 1, l.y + 1, l.w * cellSize - 2, l.h - 2);
      // Package tape
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(l.x * cellSize + l.w * cellSize/2 - 2, l.y, 4, l.h);
    });

    // Current colis
    if (current && !gameOver) {
      ctx.fillStyle = current.color;
      ctx.fillRect(current.x * cellSize + 1, current.y + 1, current.w * cellSize - 2, current.h * cellSize - 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(current.x * cellSize + 1, current.y + 1, current.w * cellSize - 2, current.h * cellSize - 2);
      // Tape
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(current.x * cellSize + current.w * cellSize/2 - 2, current.y, 4, current.h * cellSize);
    }
  }

  function update() {
    if (gameOver) return;
    frameCount++;
    if (frameCount % Math.max(1, Math.floor(30 / speed)) === 0) {
      current.y += cellSize / 4;
      if (checkCollision(current.x, current.y + current.h * cellSize, current.w, 0)) {
        landColis();
      }
    }
  }

  function gameLoop() {
    if (gameOver) { draw(); showGameOver(); return; }
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Controls
  function moveLeft() { if (!current || gameOver) return; if (current.x > 0) current.x--; }
  function moveRight() { if (!current || gameOver) return; if (current.x + current.w < COLS) current.x++; }
  function dropFast() { if (!current || gameOver) return; current.y += cellSize; if (checkCollision(current.x, current.y + current.h * cellSize, current.w, 0)) landColis(); }

  document.getElementById('tc-left').onclick = moveLeft;
  document.getElementById('tc-right').onclick = moveRight;
  document.getElementById('tc-drop').onclick = dropFast;

  // Keyboard
  document.onkeydown = (e) => {
    if (e.key === 'ArrowLeft') moveLeft();
    if (e.key === 'ArrowRight') moveRight();
    if (e.key === 'ArrowDown' || e.key === ' ') dropFast();
  };

  // Restart on tap when game over
  canvas.onclick = () => {
    if (!gameOver) return;
    score = 0; gameOver = false; speed = 2; landed = []; frameCount = 0;
    scoreEl.textContent = 'Score: 0';
    spawnColis();
    gameLoop();
  };

  // Start
  spawnColis();
  gameLoop();
}

window.startGameTetris = startGameTetris;
