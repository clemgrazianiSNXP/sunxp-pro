/* js/game-colis.js — Mini-jeu Dernier Colis 🏃 (SunXP Pro) */
console.log('game-colis.js chargé');

function startGameDernier() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  portal.innerHTML = '';
  portal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#12121a;display:flex;flex-direction:column;overflow:hidden;';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  portal.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = portal.clientWidth;
    H = portal.clientHeight;
    canvas.width = W;
    canvas.height = H;
  }
  resize();
  window.addEventListener('resize', resize);

  // Game state
  let score = 0, lives = 3, level = 1, colisAttrapés = 0;
  let combo = 0, comboMultiplier = 1, comboTimer = 0;
  let slowTimer = 0, slowActive = false;
  let gameOver = false, animFrame = null;
  let lastTime = 0;

  // Player
  const PLAYER_W = 50, PLAYER_H = 60;
  let playerX = W / 2 - PLAYER_W / 2;
  const playerSpeed = 400; // px/s
  let moveLeft = false, moveRight = false;

  // Colis
  let colis = [];
  let spawnTimer = 0;
  let baseSpawnInterval = 1.0; // seconds
  let baseSpeed = 120; // px/s

  // Clouds
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({ x: Math.random() * W, y: 20 + Math.random() * 80, w: 60 + Math.random() * 80, speed: 10 + Math.random() * 20 });
  }

  // Colis types
  const COLIS_NORMAL = 'normal';
  const COLIS_GOLD = 'gold';
  const COLIS_RED = 'red';
  const COLIS_BLUE = 'blue';
  const COLIS_PURPLE = 'purple';

  function getSpawnInterval() {
    return Math.max(0.3, baseSpawnInterval - level * 0.05);
  }

  function getColisSpeed() {
    const base = baseSpeed + level * 15;
    return slowActive ? base * 0.4 : base;
  }

  function spawnColis() {
    const x = 20 + Math.random() * (W - 60);
    let type = COLIS_NORMAL;
    const r = Math.random();
    if (r < 0.05) type = COLIS_GOLD;
    else if (r < 0.10) type = COLIS_RED;
    else if (r < 0.13) type = COLIS_BLUE;
    else if (r < 0.16) type = COLIS_PURPLE;

    colis.push({
      x, y: -40,
      w: 36, h: 36,
      type,
      speed: getColisSpeed() * (0.8 + Math.random() * 0.4),
      caught: false,
      missed: false,
      flashTimer: 0
    });
  }

  // Particles
  let particles = [];
  function addParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: -Math.random() * 150 - 50,
        life: 0.5 + Math.random() * 0.3,
        color,
        size: 3 + Math.random() * 4
      });
    }
  }

  // Flash effects
  let screenFlash = 0;
  let screenFlashColor = '';
  let alertText = '';
  let alertTimer = 0;

  // Touch controls
  let touchLeft = false, touchRight = false;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const t of e.touches) {
      if (t.clientX < W / 2) touchLeft = true;
      else touchRight = true;
    }
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchLeft = false; touchRight = false;
    for (const t of e.touches) {
      if (t.clientX < W / 2) touchLeft = true;
      else touchRight = true;
    }
  });
  canvas.addEventListener('touchmove', (e) => e.preventDefault());

  // Keyboard
  function keyDown(e) {
    if (e.key === 'ArrowLeft') moveLeft = true;
    if (e.key === 'ArrowRight') moveRight = true;
  }
  function keyUp(e) {
    if (e.key === 'ArrowLeft') moveLeft = false;
    if (e.key === 'ArrowRight') moveRight = false;
  }
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);

  // Main loop
  function update(timestamp) {
    if (gameOver) return;
    if (!window._gameActive) { if (animFrame) cancelAnimationFrame(animFrame); return; }
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    // Timers
    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) comboMultiplier = 1; }
    if (slowTimer > 0) { slowTimer -= dt; if (slowTimer <= 0) slowActive = false; }
    if (screenFlash > 0) screenFlash -= dt;
    if (alertTimer > 0) alertTimer -= dt;

    // Move player
    const moving = moveLeft || touchLeft ? -1 : (moveRight || touchRight ? 1 : 0);
    playerX += moving * playerSpeed * dt;
    playerX = Math.max(0, Math.min(W - PLAYER_W, playerX));

    // Spawn colis
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnColis();
      spawnTimer = getSpawnInterval();
    }

    // Update colis
    for (let i = colis.length - 1; i >= 0; i--) {
      const c = colis[i];
      if (c.caught || c.missed) {
        c.flashTimer -= dt;
        if (c.flashTimer <= 0) colis.splice(i, 1);
        continue;
      }

      c.speed = slowActive ? (baseSpeed + level * 15) * 0.4 * (0.8 + Math.random() * 0.01) : c.speed;
      c.y += c.speed * dt;

      // Check catch
      const playerTop = H - PLAYER_H - 10;
      if (c.y + c.h >= playerTop && c.y + c.h <= playerTop + PLAYER_H &&
          c.x + c.w > playerX && c.x < playerX + PLAYER_W) {
        c.caught = true;
        c.flashTimer = 0.3;
        colisAttrapés++;
        combo++;

        // Combo check
        if (combo >= 10 && comboMultiplier === 1) {
          comboMultiplier = 2;
          comboTimer = 10;
          combo = 0;
        }

        // Points by type
        let pts = 0;
        switch (c.type) {
          case COLIS_NORMAL: pts = 10; break;
          case COLIS_GOLD: pts = 50; alertText = '⭐ DORÉ +50!'; alertTimer = 1; break;
          case COLIS_RED: pts = 10; break;
          case COLIS_BLUE:
            pts = 10;
            if (lives < 3) { lives++; screenFlash = 0.3; screenFlashColor = 'rgba(0,150,255,0.3)'; alertText = '💙 +1 VIE!'; alertTimer = 1.2; }
            break;
          case COLIS_PURPLE:
            pts = 10;
            slowActive = true;
            slowTimer = 3;
            screenFlash = 0.3; screenFlashColor = 'rgba(150,0,255,0.3)';
            alertText = '💜 RALENTI 3s!'; alertTimer = 1.2;
            break;
        }
        score += pts * comboMultiplier;
        addParticles(c.x + c.w / 2, playerTop, '#4ade80', 6);

        // Level up
        if (colisAttrapés > 0 && colisAttrapés % 50 === 0) {
          level++;
        }
        continue;
      }

      // Check missed (hit ground)
      if (c.y > H) {
        c.missed = true;
        c.flashTimer = 0.4;
        combo = 0;

        if (c.type === COLIS_RED) {
          lives--;
          screenFlash = 0.5; screenFlashColor = 'rgba(255,0,0,0.4)';
          addParticles(c.x + c.w / 2, H - 20, '#ef4444', 8);
          alertText = '❌ FRAGILE! -1 vie'; alertTimer = 1.5;
        } else {
          lives--;
          screenFlash = 0.4; screenFlashColor = 'rgba(255,0,0,0.3)';
          addParticles(c.x + c.w / 2, H - 20, '#92400e', 5);
          alertText = '💔 -1 vie!'; alertTimer = 1.2;
        }

        if (lives <= 0) {
          endGame();
          return;
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update clouds
    clouds.forEach(cl => {
      cl.x += cl.speed * dt;
      if (cl.x > W + cl.w) cl.x = -cl.w;
    });

    draw();
    animFrame = requestAnimationFrame(update);
  }

  function draw() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.7, '#b3e0ff');
    grad.addColorStop(1, '#6b7280');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    clouds.forEach(cl => {
      ctx.beginPath();
      ctx.ellipse(cl.x, cl.y, cl.w / 2, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cl.x - cl.w * 0.25, cl.y + 5, cl.w * 0.3, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cl.x + cl.w * 0.25, cl.y + 3, cl.w * 0.25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, H - 10, W, 10);

    // Draw colis
    colis.forEach(c => {
      if (c.caught) {
        ctx.globalAlpha = c.flashTimer / 0.3;
        drawColis(c);
        ctx.globalAlpha = 1;
        return;
      }
      if (c.missed) return;
      drawColis(c);
    });

    // Draw player
    drawPlayer(playerX, H - PLAYER_H - 10);

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life / 0.8;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    // Screen flash
    if (screenFlash > 0) {
      ctx.fillStyle = screenFlashColor;
      ctx.fillRect(0, 0, W, H);
    }

    // HUD
    drawHUD();
  }

  function drawColis(c) {
    const colors = {
      normal: '#92400e',
      gold: '#f59e0b',
      red: '#ef4444',
      blue: '#3b82f6',
      purple: '#8b5cf6'
    };
    ctx.fillStyle = colors[c.type] || '#92400e';
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Tape
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(c.x + c.w / 2 - 3, c.y, 6, c.h);

    // Icon
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    const icons = { normal: '📦', gold: '⭐', red: '❌', blue: '💙', purple: '💜' };
    ctx.fillText(icons[c.type] || '📦', c.x + c.w / 2, c.y + c.h / 2 + 5);
  }

  function drawPlayer(x, y) {
    // Body
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(x + 15, y + 20, 20, 30);

    // Head
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x + PLAYER_W / 2, y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(x + PLAYER_W / 2, y + 8, 12, Math.PI, 0);
    ctx.fill();

    // Backpack
    ctx.fillStyle = '#374151';
    ctx.fillRect(x + 35, y + 22, 10, 20);

    // Legs
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(x + 17, y + 50, 8, 10);
    ctx.fillRect(x + 27, y + 50, 8, 10);

    // Arms
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(x + 8, y + 22, 7, 20);
    ctx.fillRect(x + 35, y + 22, 7, 20);
  }

  function drawHUD() {
    // Lives (top left)
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    let livesStr = '';
    for (let i = 0; i < 3; i++) {
      livesStr += i < lives ? '📦' : '💔';
    }
    ctx.fillText(livesStr, 10, 30);

    // Combo (top center)
    ctx.textAlign = 'center';
    if (comboMultiplier > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('x2 COMBO! ' + Math.ceil(comboTimer) + 's', W / 2, 30);
    } else if (combo >= 5) {
      ctx.fillStyle = '#a3e635';
      ctx.font = '14px sans-serif';
      ctx.fillText('Combo: ' + combo + '/10', W / 2, 30);
    }

    // Slow indicator
    if (slowActive) {
      ctx.fillStyle = '#8b5cf6';
      ctx.font = '12px sans-serif';
      ctx.fillText('⏳ Ralenti ' + Math.ceil(slowTimer) + 's', W / 2, 50);
    }

    // Score (top right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(score + ' pts', W - 10, 30);

    // Level
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#a3e635';
    ctx.fillText('Niv. ' + level, W - 10, 48);

    ctx.shadowBlur = 0;

    // Alert text (vie perdue ou bonus)
    if (alertTimer > 0 && alertText) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px sans-serif';
      ctx.globalAlpha = Math.min(1, alertTimer);
      ctx.fillStyle = alertText.includes('vie') || alertText.includes('FRAGILE') ? '#ef4444' : '#4ade80';
      ctx.fillText(alertText, W / 2, H / 2);
      ctx.globalAlpha = 1;
    }
  }

  function endGame() {
    gameOver = true;
    if (animFrame) cancelAnimationFrame(animFrame);
    document.removeEventListener('keydown', keyDown);
    document.removeEventListener('keyup', keyUp);

    // Save score
    if (typeof saveScore === 'function') {
      saveScore('colis', score);
    }

    // Show game over screen
    showGameOver();
  }

  async function showGameOver() {
    const scores = await loadStationScores('colis');
    const top5 = scores.slice(0, 5);

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;">
        <div style="font-size:48px;margin-bottom:10px;">🏃💥</div>
        <h2 style="font-size:24px;margin:0 0 8px;">Game Over!</h2>
        <p style="font-size:32px;font-weight:bold;color:#fbbf24;margin:0 0 4px;">${score} pts</p>
        <p style="font-size:14px;color:#9ca3af;margin:0 0 20px;">Niveau ${level} • ${colisAttrapés} colis attrapés</p>
        
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;width:100%;max-width:300px;margin-bottom:20px;">
          <h3 style="font-size:14px;margin:0 0 10px;color:#a3e635;">🏆 Top 5 Station</h3>
          ${top5.length > 0 ? top5.map((s, i) => `
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);">
              <span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.'} ${s.chauffeur_nom || 'Joueur'}</span>
              <span style="color:#fbbf24;">${s.score} pts</span>
            </div>
          `).join('') : '<p style="font-size:12px;color:#6b7280;">Aucun score enregistré</p>'}
        </div>

        <div style="display:flex;gap:12px;">
          <button onclick="startGameDernier()" style="padding:12px 24px;background:#4ade80;color:#000;border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">🔄 Rejouer</button>
          <button onclick="initGamesPage()" style="padding:12px 24px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:14px;cursor:pointer;">← Retour aux jeux</button>
        </div>
      </div>
    `;
  }

  // Start
  animFrame = requestAnimationFrame(update);
}

window.startGameDernier = startGameDernier;
