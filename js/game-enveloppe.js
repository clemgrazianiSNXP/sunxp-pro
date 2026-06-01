/* js/game-enveloppe.js — Mini-jeu L'Enveloppe 📬 (SunXP Pro) */

function startGameEnveloppe() {
  // Create fullscreen game container
  let screen = document.getElementById('game-enveloppe-screen');
  if (!screen) {
    screen = document.createElement('div');
    screen.id = 'game-enveloppe-screen';
    screen.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;';
    document.body.appendChild(screen);
  }
  screen.style.display = 'flex';
  screen.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'flex:1;display:block;touch-action:none;';
  screen.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = screen.clientWidth; canvas.height = screen.clientHeight; }
  resize();
  window.addEventListener('resize', resize);

  // Game state
  let distance = 5; // meters
  let gameOver = false;
  let launched = false;
  let charging = false;
  let power = 0;
  let angle = -Math.PI / 4; // 45 degrees up
  let bestScore = typeof getPlayerScore === 'function' ? getPlayerScore('enveloppe') : 0;

  // Envelope physics
  let envX, envY, envVx, envVy;
  const gravity = 0.4;
  let envRotation = 0;
  let showResult = '';
  let resultTimer = 0;

  // Positions
  function getCharX() { return 80; }
  function getCharY() { return canvas.height - 120; }
  function getBoxX() { return Math.min(canvas.width - 60, 150 + distance * 12); }
  function getBoxY() { return canvas.height - 120; }
  function getSlotWidth() { return Math.max(20, 50 - distance * 1.5); }
  function getSlotHeight() { return 8; }
  function getBoxWidth() { return Math.max(30, 60 - distance); }
  function getBoxHeight() { return Math.max(40, 70 - distance * 0.5); }

  // Input handling
  let pointerY = canvas.height / 2;

  function onPointerDown(e) {
    if (gameOver || launched) return;
    charging = true;
    power = 0;
    const rect = canvas.getBoundingClientRect();
    pointerY = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
  }

  function onPointerMove(e) {
    if (!charging) return;
    const rect = canvas.getBoundingClientRect();
    pointerY = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    // Angle based on pointer Y position relative to character
    const charY = getCharY();
    const dy = pointerY - charY;
    angle = Math.max(-Math.PI / 2.5, Math.min(-Math.PI / 8, Math.atan2(dy, 100)));
  }

  function onPointerUp() {
    if (!charging || gameOver || launched) return;
    charging = false;
    launched = true;
    // Launch envelope
    const speed = 5 + power * 15;
    envX = getCharX() + 30;
    envY = getCharY() - 20;
    envVx = speed * Math.cos(angle);
    envVy = speed * Math.sin(angle);
    envRotation = 0;
  }

  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e.touches[0]); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); onPointerMove(e.touches[0]); }, { passive: false });
  canvas.addEventListener('touchend', e => { e.preventDefault(); onPointerUp(); }, { passive: false });

  // Draw functions
  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.7, '#B0E0E6');
    grad.addColorStop(1, '#8B8B8B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Road
    ctx.fillStyle = '#555';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    ctx.fillStyle = '#FFD700';
    for (let x = 0; x < canvas.width; x += 60) {
      ctx.fillRect(x, canvas.height - 42, 30, 4);
    }
  }

  function drawCharacter() {
    const cx = getCharX();
    const cy = getCharY();
    // Body
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(cx - 8, cy - 30, 16, 30);
    // Head
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(cx, cy - 40, 12, 0, Math.PI * 2);
    ctx.fill();
    // Cap
    ctx.fillStyle = '#1E40AF';
    ctx.fillRect(cx - 14, cy - 52, 28, 6);
  }

  function drawMailbox() {
    const bx = getBoxX();
    const by = getBoxY();
    const bw = getBoxWidth();
    const bh = getBoxHeight();
    // Post
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(bx - 3, by - bh, 6, bh);
    // Box
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(bx - bw / 2, by - bh, bw, bh * 0.7);
    // Slot
    ctx.fillStyle = '#000';
    const sw = getSlotWidth();
    ctx.fillRect(bx - sw / 2, by - bh + bh * 0.3, sw, getSlotHeight());
    // Top
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2 - 4, by - bh);
    ctx.lineTo(bx + bw / 2 + 4, by - bh);
    ctx.lineTo(bx + bw / 2 + 4, by - bh - 8);
    ctx.lineTo(bx - bw / 2 - 4, by - bh - 8);
    ctx.fill();
  }

  function drawEnvelope(x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // Body
    ctx.fillStyle = '#FFF';
    ctx.fillRect(-15, -10, 30, 20);
    ctx.strokeStyle = '#999';
    ctx.strokeRect(-15, -10, 30, 20);
    // Flap
    ctx.fillStyle = '#E5E7EB';
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(0, 2);
    ctx.lineTo(15, -10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPowerGauge() {
    if (!charging) return;
    const x = 20;
    const y = canvas.height - 200;
    const h = 150;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, 20, h);
    const filled = power * h;
    const color = power < 0.5 ? '#4ADE80' : power < 0.8 ? '#FBBF24' : '#F87171';
    ctx.fillStyle = color;
    ctx.fillRect(x, y + h - filled, 20, filled);
    ctx.strokeStyle = '#FFF';
    ctx.strokeRect(x, y, 20, h);
    // Angle indicator
    ctx.save();
    ctx.translate(getCharX() + 30, getCharY() - 20);
    ctx.rotate(angle);
    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(60, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(distance + 'm', canvas.width / 2, 30);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Meilleur: ' + bestScore + 'm', canvas.width / 2, 50);
  }

  function drawResult() {
    if (!showResult) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    if (showResult === 'success') {
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = '#4ADE80';
      ctx.fillText('🎉 DANS LA BOÎTE !', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#FFF';
      ctx.fillText('Distance: ' + distance + 'm', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  // Collision detection
  function checkCollision() {
    const bx = getBoxX();
    const by = getBoxY();
    const bh = getBoxHeight();
    const sw = getSlotWidth();
    const sh = getSlotHeight();
    const slotX = bx - sw / 2;
    const slotY = by - bh + bh * 0.3;
    // Check if envelope center is within slot area
    return envX >= slotX && envX <= slotX + sw && envY >= slotY && envY <= slotY + sh + 10;
  }

  // Game loop
  let animId;

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSky();
    drawCharacter();
    drawMailbox();
    drawHUD();

    if (charging) {
      power = Math.min(1, power + 0.015);
      drawPowerGauge();
      drawEnvelope(getCharX() + 30, getCharY() - 20, 0);
    } else if (launched && !gameOver) {
      // Physics
      envVy += gravity;
      envX += envVx;
      envY += envVy;
      envRotation += 0.05;
      drawEnvelope(envX, envY, envRotation);

      // Check collision with mailbox slot
      if (checkCollision()) {
        showResult = 'success';
        resultTimer = 60;
        launched = false;
      }
      // Check if out of bounds
      if (envY > canvas.height || envX > canvas.width + 50) {
        gameOver = true;
        const finalScore = distance - 5;
        if (finalScore > 0 && typeof saveScore === 'function') saveScore('enveloppe', finalScore);
        bestScore = Math.max(bestScore, finalScore);
      }
    } else if (!launched && !gameOver && !showResult) {
      drawEnvelope(getCharX() + 30, getCharY() - 20, 0);
    }

    if (showResult === 'success') {
      drawResult();
      resultTimer--;
      if (resultTimer <= 0) {
        showResult = '';
        distance += 5;
        launched = false;
      }
    }

    if (gameOver) {
      // Stop the game loop and show HTML game over
      cancelAnimationFrame(animId);
      showGameOverHTML();
      return;
    }

    animId = requestAnimationFrame(gameLoop);
  }

  async function showGameOverHTML() {
    const finalScore = distance - 5;
    const scores = await loadStationScores('enveloppe');
    const top5 = scores.slice(0, 5);
    screen.innerHTML = '';
    screen.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0a0a1a;display:flex;flex-direction:column;overflow:auto;';
    screen.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;">'
      + '<div style="font-size:48px;margin-bottom:10px;">📬💥</div>'
      + '<h2 style="font-size:22px;margin:0 0 8px;">Game Over!</h2>'
      + '<p style="font-size:28px;font-weight:bold;color:#fbbf24;margin:0 0 4px;">' + finalScore + ' m</p>'
      + '<p style="font-size:13px;color:#9ca3af;margin:0 0 20px;">Meilleur: ' + bestScore + 'm</p>'
      + '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;width:100%;max-width:300px;margin-bottom:20px;">'
      + '<h3 style="font-size:14px;margin:0 0 10px;color:#f97316;">🏆 Top 5 Station</h3>'
      + (top5.length > 0 ? top5.map(function(s, i) { return '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);"><span>' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.') + ' ' + (s.chauffeur_nom||'Joueur') + '</span><span style="color:#fbbf24;">' + s.score + 'm</span></div>'; }).join('') : '<p style="font-size:12px;color:#6b7280;">Aucun score</p>')
      + '</div>'
      + '<div style="display:flex;gap:12px;">'
      + '<button onclick="document.getElementById(\'game-enveloppe-screen\').remove();startGameEnveloppe();" style="padding:12px 24px;background:#4ade80;color:#000;border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">🔄 Rejouer</button>'
      + '<button onclick="document.getElementById(\'game-enveloppe-screen\').remove();initGamesPage();" style="padding:12px 24px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:14px;cursor:pointer;">← Retour aux jeux</button>'
      + '</div></div>';
  }

  gameLoop();
}

window.startGameEnveloppe = startGameEnveloppe;
