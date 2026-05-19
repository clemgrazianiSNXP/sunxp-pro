/* js/games.js — Système de mini-jeux chauffeur (SunXP Pro) */
console.log('games.js chargé');

const GAMES_LIST = [
  { id: 'enveloppe', icon: '📬', name: "L'Enveloppe" },
  { id: 'tetris', icon: '📦', name: 'Tetris Colis' },
  { id: 'slalom', icon: '🚛', name: 'Slalom Camion' },
  { id: 'scan', icon: '⚡', name: 'Scan Express' },
  { id: 'tournee', icon: '🗺️', name: 'Tournée Parfaite' },
  { id: 'dernier', icon: '🏃', name: 'Dernier Colis' }
];

/* ── Scores ───────────────────────────────────────────────── */
function getGameScoresKey(stationId, gameId) { return stationId + '-game-scores-' + gameId; }

function loadLocalScores(stationId, gameId) {
  try { return JSON.parse(localStorage.getItem(getGameScoresKey(stationId, gameId))) || []; } catch (_) { return []; }
}

async function loadStationScores(gameId) {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid) return [];
  // Try Supabase
  if (typeof sb === 'function' && sb()) {
    try {
      const { data } = await sb().from('game_scores').select('*').eq('station_id', sid).eq('game_id', gameId).order('score', { ascending: false });
      if (data) { localStorage.setItem(getGameScoresKey(sid, gameId), JSON.stringify(data)); return data; }
    } catch (_) {}
  }
  return loadLocalScores(sid, gameId);
}

async function saveScore(gameId, score) {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid || !portalChauffeur) return;
  const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();
  const chauffeurId = portalChauffeur.id_amazon || portalChauffeur.id || '';

  // Check if better than existing
  const existing = loadLocalScores(sid, gameId);
  const prev = existing.find(s => s.chauffeur_id === chauffeurId);
  if (prev && prev.score >= score) return; // Not a new high score

  // Save to Supabase
  if (typeof sb === 'function' && sb()) {
    try {
      await sb().from('game_scores').upsert({
        chauffeur_nom: nom,
        chauffeur_id: chauffeurId,
        station_id: sid,
        game_id: gameId,
        score: score,
        created_at: new Date().toISOString()
      }, { onConflict: 'chauffeur_id,station_id,game_id' });
    } catch (_) {}
  }

  // Update local cache
  if (prev) { prev.score = score; prev.created_at = new Date().toISOString(); }
  else { existing.push({ chauffeur_nom: nom, chauffeur_id: chauffeurId, station_id: sid, game_id: gameId, score, created_at: new Date().toISOString() }); }
  existing.sort((a, b) => b.score - a.score);
  localStorage.setItem(getGameScoresKey(sid, gameId), JSON.stringify(existing));
}

function getPlayerRank(gameId) {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid || !portalChauffeur) return null;
  const chauffeurId = portalChauffeur.id_amazon || portalChauffeur.id || '';
  const scores = loadLocalScores(sid, gameId);
  const idx = scores.findIndex(s => s.chauffeur_id === chauffeurId);
  return idx >= 0 ? idx + 1 : null;
}

function getPlayerScore(gameId) {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid || !portalChauffeur) return 0;
  const chauffeurId = portalChauffeur.id_amazon || portalChauffeur.id || '';
  const scores = loadLocalScores(sid, gameId);
  const entry = scores.find(s => s.chauffeur_id === chauffeurId);
  return entry ? entry.score : 0;
}

function getGlobalRank() {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid || !portalChauffeur) return null;
  // Sum all game scores per player
  const totals = {};
  GAMES_LIST.forEach(g => {
    const scores = loadLocalScores(sid, g.id);
    scores.forEach(s => {
      if (!totals[s.chauffeur_id]) totals[s.chauffeur_id] = { nom: s.chauffeur_nom, total: 0 };
      totals[s.chauffeur_id].total += s.score;
    });
  });
  const sorted = Object.entries(totals).sort((a, b) => b[1].total - a[1].total);
  const chauffeurId = portalChauffeur.id_amazon || portalChauffeur.id || '';
  const idx = sorted.findIndex(([id]) => id === chauffeurId);
  return idx >= 0 ? { rank: idx + 1, total: sorted.length } : null;
}

/* ── Page principale des jeux ─────────────────────────────── */
function initGamesPage() {
  // Hide portal
  const portalScreen = document.getElementById('chauffeur-portal');
  if (portalScreen) portalScreen.style.display = 'none';

  let gamesScreen = document.getElementById('games-screen');
  if (!gamesScreen) {
    gamesScreen = document.createElement('div');
    gamesScreen.id = 'games-screen';
    gamesScreen.style.cssText = 'position:fixed;inset:0;z-index:9998;background:var(--bg-primary);display:flex;flex-direction:column;overflow:hidden;';
    document.body.appendChild(gamesScreen);
  }
  gamesScreen.style.display = 'flex';
  gamesScreen.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 20px;background:var(--bg-sidebar);border-bottom:1px solid var(--border);flex-shrink:0;';
  const backBtn = document.createElement('button');
  backBtn.className = 'h-btn'; backBtn.textContent = '← Retour';
  backBtn.onclick = () => { gamesScreen.style.display = 'none'; if (portalScreen) portalScreen.style.display = ''; };
  header.appendChild(backBtn);
  const title = document.createElement('span');
  title.style.cssText = 'font-size:16px;font-weight:700;color:var(--text-primary);';
  title.textContent = '🎮 Mes Jeux';
  header.appendChild(title);
  // Global rank
  const globalRank = getGlobalRank();
  if (globalRank) {
    const rankEl = document.createElement('span');
    rankEl.style.cssText = 'margin-left:auto;font-size:12px;color:var(--accent);font-weight:700;';
    rankEl.textContent = `🏆 Rang ${globalRank.rank}/${globalRank.total}`;
    header.appendChild(rankEl);
  }
  gamesScreen.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;padding:20px;';

  // Games grid
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:24px;';

  GAMES_LIST.forEach(g => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;transition:all 0.15s;';
    card.onmouseenter = () => { card.style.borderColor = 'var(--accent)'; card.style.transform = 'translateY(-2px)'; };
    card.onmouseleave = () => { card.style.borderColor = 'var(--border)'; card.style.transform = ''; };

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;';
    icon.textContent = g.icon;

    const name = document.createElement('div');
    name.style.cssText = 'font-size:12px;font-weight:700;color:var(--text-primary);text-align:center;';
    name.textContent = g.name;

    const score = document.createElement('div');
    score.style.cssText = 'font-size:11px;color:var(--accent);font-family:monospace;';
    score.textContent = getPlayerScore(g.id) ? getPlayerScore(g.id) + ' pts' : '—';

    const rank = getPlayerRank(g.id);
    const rankEl = document.createElement('div');
    rankEl.style.cssText = 'font-size:10px;color:var(--text-muted);';
    const stationScores = loadLocalScores(portalStationId || '', g.id);
    rankEl.textContent = rank ? (rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank + 'e') + ' / ' + stationScores.length : '';

    const playBtn = document.createElement('button');
    playBtn.className = 'rep-btn rep-btn-primary';
    playBtn.style.cssText = 'font-size:10px;padding:5px 12px;margin-top:4px;';
    playBtn.textContent = '▶ Jouer';
    playBtn.onclick = (e) => { e.stopPropagation(); openGame(g.id); };

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(score);
    card.appendChild(rankEl);
    card.appendChild(playBtn);
    card.onclick = () => openGame(g.id);
    grid.appendChild(card);
  });

  content.appendChild(grid);

  // Station leaderboard
  const lbTitle = document.createElement('div');
  lbTitle.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:10px;';
  lbTitle.textContent = '🏆 Classement station';
  content.appendChild(lbTitle);

  const totals = {};
  const sid = portalStationId || '';
  GAMES_LIST.forEach(g => {
    const scores = loadLocalScores(sid, g.id);
    scores.forEach(s => {
      if (!totals[s.chauffeur_id]) totals[s.chauffeur_id] = { nom: s.chauffeur_nom, total: 0 };
      totals[s.chauffeur_id].total += s.score;
    });
  });
  const sorted = Object.values(totals).sort((a, b) => b.total - a.total);

  if (sorted.length) {
    const table = document.createElement('div');
    table.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    sorted.slice(0, 10).forEach((p, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:8px;font-size:12px;';
      const medal = i < 3 ? ['🥇','🥈','🥉'][i] : (i + 1) + '.';
      row.innerHTML = `<span style="min-width:24px;font-weight:700;">${medal}</span><span style="flex:1;color:var(--text-primary);">${p.nom}</span><span style="font-family:monospace;color:var(--accent);font-weight:700;">${p.total} pts</span>`;
      table.appendChild(row);
    });
    content.appendChild(table);
  } else {
    content.innerHTML += '<p style="color:var(--text-muted);font-size:12px;text-align:center;">Aucun score enregistré. Jouez pour apparaître au classement !</p>';
  }

  gamesScreen.appendChild(content);
}

/* ── Ouvrir un jeu ────────────────────────────────────────── */
function openGame(gameId) {
  const fnMap = {
    enveloppe: 'startGameEnveloppe',
    tetris: 'startGameTetris',
    slalom: 'startGameSlalom',
    scan: 'startGameScan',
    tournee: 'startGameTournee',
    dernier: 'startGameDernier'
  };
  const fn = fnMap[gameId];
  if (fn && typeof window[fn] === 'function') {
    window[fn]();
  } else {
    alert('🎮 Ce jeu arrive bientôt !');
  }
}
