/* js/game-gps.js — Mini-jeu GPS Cassé 🗺️ (SunXP Pro) */
console.log('game-gps.js chargé');

function startGameGPS() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  let score = 0, round = 0, level = 1, consecutiveExact = 0;
  let gameActive = true;

  function getGridSize() {
    if (level < 3) return 6;
    if (level < 5) return 8;
    if (level < 7) return 10;
    return 12;
  }

  function getInstructionCount() {
    if (level < 3) return 4;
    if (level < 5) return 6;
    if (level < 7) return 8;
    return 10;
  }

  function generateInstructions() {
    const gridSize = getGridSize();
    const count = getInstructionCount();
    const instructions = [];
    // Start near center
    let x = Math.floor(gridSize / 2);
    let y = Math.floor(gridSize / 2);
    const startX = x, startY = y;

    const directions = [
      { name: 'haut', icon: '⬆️', dx: 0, dy: -1 },
      { name: 'droite', icon: '➡️', dx: 1, dy: 0 },
      { name: 'bas', icon: '⬇️', dx: 0, dy: 1 },
      { name: 'gauche', icon: '⬅️', dx: -1, dy: 0 }
    ];

    for (let i = 0; i < count; i++) {
      // Pick a random direction that keeps us in bounds
      let attempts = 0;
      let dir, steps, nx, ny;
      do {
        dir = directions[Math.floor(Math.random() * 4)];
        steps = level < 3 ? 1 : (Math.floor(Math.random() * 2) + 1);
        nx = x + dir.dx * steps;
        ny = y + dir.dy * steps;
        attempts++;
      } while ((nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) && attempts < 20);

      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) {
        // Fallback: just move 1 step in any valid direction
        for (const d of directions) {
          if (x + d.dx >= 0 && x + d.dx < gridSize && y + d.dy >= 0 && y + d.dy < gridSize) {
            dir = d; steps = 1; nx = x + d.dx; ny = y + d.dy; break;
          }
        }
      }

      x = nx; y = ny;

      let text = dir.icon + ' ' + steps + ' case' + (steps > 1 ? 's' : '') + ' vers le ' + dir.name;

      // Level 10+: some instructions hidden
      let hidden = false;
      if (level >= 10 && Math.random() < 0.2) hidden = true;

      instructions.push({ text, hidden });
    }

    return { instructions, startX, startY, endX: x, endY: y, gridSize };
  }

  function startRound() {
    round++;
    level = Math.floor((round - 1) / 2) + 1;
    const data = generateInstructions();
    showInstructions(data);
  }

  function showInstructions(data) {
    const { instructions, startX, startY, endX, endY, gridSize } = data;
    let currentIdx = 0;

    portal.innerHTML = '';
    portal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg-primary,#12121a);display:flex;flex-direction:column;overflow:hidden;';
    portal.innerHTML = `
      <div style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <button onclick="initGamesPage()" style="padding:4px 8px;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);border:1px solid var(--border,#444);border-radius:4px;cursor:pointer;font-size:11px;">←</button>
        <span style="font-size:12px;font-weight:700;">📡 GPS Cassé</span>
        <span style="margin-left:auto;font-size:11px;color:#9ca3af;">Niv.${level} • Manche ${round}</span>
        <span style="font-family:monospace;color:var(--accent,#7c6af7);font-size:13px;font-weight:700;">${score}</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;color:#fff;">
        <div style="font-size:36px;animation:gps-glitch 2s infinite;">📡</div>
        <div style="font-size:12px;color:#4ade80;font-weight:700;">🏭 Départ = centre de la grille (${gridSize}x${gridSize})</div>
        <div style="font-size:11px;color:#9ca3af;">Chaque instruction = un déplacement sur la grille</div>
        <div id="gps-instruction" style="font-size:20px;font-weight:700;min-height:36px;text-align:center;padding:14px 24px;background:var(--bg-sidebar,#1e1e2e);border:2px solid var(--border,#444);border-radius:12px;min-width:260px;transition:all 0.2s;"></div>
        <div id="gps-progress" style="font-size:12px;color:#6b7280;"></div>
        <div style="width:220px;height:5px;background:#333;border-radius:3px;overflow:hidden;">
          <div id="gps-instr-timer" style="height:100%;width:100%;background:#f97316;border-radius:3px;"></div>
        </div>
        <div style="font-size:10px;color:#6b7280;margin-top:8px;">⬆️=haut ⬇️=bas ⬅️=gauche ➡️=droite</div>
      </div>
      <style>
        @keyframes gps-glitch { 0%,90%{transform:translate(0)} 92%{transform:translate(-2px,1px)} 94%{transform:translate(2px,-1px)} 96%{transform:translate(-1px,-1px)} 98%{transform:translate(1px,1px)} 100%{transform:translate(0)} }
      </style>
    `;

    function showNext() {
      if (currentIdx >= instructions.length) {
        setTimeout(() => showGuessPhase(data), 500);
        return;
      }

      const instr = instructions[currentIdx];
      const instrEl = document.getElementById('gps-instruction');
      const progressEl = document.getElementById('gps-progress');
      const timerBarEl = document.getElementById('gps-instr-timer');

      if (instrEl) {
        if (instr.hidden) {
          instrEl.textContent = '📡 ~~~ signal perdu ~~~';
          instrEl.style.color = '#ef4444';
          instrEl.style.borderColor = '#ef4444';
        } else {
          instrEl.textContent = instr.text;
          instrEl.style.color = '#fff';
          instrEl.style.borderColor = 'var(--border,#444)';
        }
      }
      if (progressEl) progressEl.textContent = (currentIdx + 1) + ' / ' + instructions.length;
      if (timerBarEl) {
        timerBarEl.style.transition = 'none';
        timerBarEl.style.width = '100%';
        timerBarEl.offsetHeight;
        timerBarEl.style.transition = 'width 3s linear';
        timerBarEl.style.width = '0%';
      }

      currentIdx++;
      setTimeout(showNext, 3000);
    }

    setTimeout(showNext, 800);
  }

  function showGuessPhase(data) {
    const { startX, startY, endX, endY, gridSize } = data;
    const cellSize = Math.min(Math.floor((portal.clientWidth - 50) / gridSize), Math.floor((portal.clientHeight - 180) / gridSize), 34);

    let gridHtml = '';
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const isStart = (c === startX && r === startY);
        let bg = 'rgba(255,255,255,0.03)';
        let content = '';
        let border = '1px solid rgba(255,255,255,0.08)';
        if (isStart) { bg = 'rgba(74,222,128,0.3)'; content = '🏭'; border = '2px solid #4ade80'; }
        gridHtml += '<div class="gps-cell" data-r="' + r + '" data-c="' + c + '" style="width:' + cellSize + 'px;height:' + cellSize + 'px;background:' + bg + ';border:' + border + ';border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:' + Math.max(9, cellSize - 16) + 'px;transition:all 0.15s;">' + content + '</div>';
      }
    }

    portal.innerHTML = `
      <div style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span style="font-size:12px;font-weight:700;">📡 Où êtes-vous arrivé ?</span>
        <span style="margin-left:auto;font-family:monospace;color:var(--accent,#7c6af7);font-size:13px;font-weight:700;">${score}</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;color:#fff;">
        <div style="font-size:14px;color:#fbbf24;font-weight:700;">👆 Cliquez sur votre case d'arrivée</div>
        <div style="background:#1f2937;border-radius:8px;padding:6px;border:1px solid #4b5563;">
          <div id="gps-grid" style="display:grid;grid-template-columns:repeat(${gridSize},${cellSize}px);gap:1px;">
            ${gridHtml}
          </div>
        </div>
        <div style="font-size:10px;color:#6b7280;">🏭 = Votre point de départ</div>
      </div>
    `;

    // Bind clicks
    document.querySelectorAll('.gps-cell').forEach(cell => {
      cell.onclick = () => {
        if (!gameActive) return;
        const guessR = parseInt(cell.dataset.r);
        const guessC = parseInt(cell.dataset.c);
        evaluateGuess(guessC, guessR, endX, endY, startX, startY, gridSize);
      };
      cell.ontouchstart = (e) => {
        e.preventDefault();
        cell.onclick();
      };
    });
  }

  function evaluateGuess(guessX, guessY, correctX, correctY, startX, startY, gridSize) {
    gameActive = false; // prevent double click
    const dist = Math.abs(guessX - correctX) + Math.abs(guessY - correctY);
    let pts = 0;
    if (dist === 0) { pts = 1000; consecutiveExact++; }
    else if (dist === 1) { pts = 700; consecutiveExact = 0; }
    else if (dist === 2) { pts = 400; consecutiveExact = 0; }
    else { pts = 0; consecutiveExact = 0; }

    if (consecutiveExact >= 3 && consecutiveExact % 3 === 0) pts += 500;
    score += pts;

    // Show result on grid
    document.querySelectorAll('.gps-cell').forEach(cell => {
      const r = parseInt(cell.dataset.r);
      const c = parseInt(cell.dataset.c);
      cell.style.cursor = 'default';
      if (c === correctX && r === correctY) {
        cell.style.background = '#4ade80';
        cell.style.border = '2px solid #22c55e';
        cell.textContent = '🎯';
      }
      if (c === guessX && r === guessY && !(c === correctX && r === correctY)) {
        cell.style.background = '#ef4444';
        cell.style.border = '2px solid #dc2626';
        cell.textContent = '❌';
      }
    });

    // Feedback overlay
    const fb = document.createElement('div');
    fb.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.92);padding:24px 32px;border-radius:14px;text-align:center;z-index:99999;color:#fff;';
    fb.innerHTML = `
      <div style="font-size:28px;margin-bottom:8px;">${dist === 0 ? '🎯 Parfait!' : dist <= 2 ? '👍 Proche!' : '😅 Raté!'}</div>
      <div style="font-size:20px;font-weight:700;color:${pts > 0 ? '#4ade80' : '#ef4444'};">+${pts} pts</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:6px;">${dist === 0 ? 'Case exacte!' : dist + ' case(s) d\'écart'}</div>
      ${consecutiveExact >= 3 && consecutiveExact % 3 === 0 ? '<div style="font-size:13px;color:#fbbf24;margin-top:6px;">🔥 Bonus précision x3 → +500!</div>' : ''}
    `;
    portal.appendChild(fb);

    setTimeout(() => {
      fb.remove();
      gameActive = true;
      if (round >= 10) {
        endGame();
      } else {
        startRound();
      }
    }, 2200);
  }

  function endGame() {
    gameActive = false;
    if (score > 0 && typeof saveScore === 'function') saveScore('gps', score);
    showGameOver();
  }

  async function showGameOver() {
    const scores = await loadStationScores('gps');
    const top5 = scores.slice(0, 5);

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;background:var(--bg-primary,#12121a);">
        <div style="font-size:48px;margin-bottom:10px;">📡🗺️</div>
        <h2 style="font-size:22px;margin:0 0 8px;">GPS réparé!</h2>
        <p style="font-size:28px;font-weight:bold;color:#fbbf24;margin:0 0 4px;">${score} pts</p>
        <p style="font-size:13px;color:#9ca3af;margin:0 0 20px;">${round} manches • Niveau max ${level}</p>
        
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
          <button onclick="startGameGPS()" style="padding:12px 24px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">🔄 Rejouer</button>
          <button onclick="initGamesPage()" style="padding:12px 24px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:14px;cursor:pointer;">← Retour aux jeux</button>
        </div>
      </div>
    `;
  }

  startRound();
}

window.startGameGPS = startGameGPS;
