/* js/games.js — Système de mini-jeux chauffeur (SunXP Pro) */
console.log('games.js chargé');

const GAMES_LIST = [
  { id: 'enveloppe', icon: '📬', name: "L'Enveloppe" },
  { id: 'tetris', icon: '📦', name: 'Tetris Colis' },
  { id: 'slalom', icon: '🚛', name: 'Slalom Camion' },
  { id: 'scan', icon: '⚡', name: 'Scan Express' },
  { id: 'tournee', icon: '🗺️', name: 'Tournée Parfaite' },
  { id: 'dernier', icon: '🏃', name: 'Dernier Colis' },
  { id: 'boite', icon: '🚪', name: 'Bonne Boîte' },
  { id: 'chargement', icon: '🏗️', name: 'Chargement Parfait' }
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
  console.log('initGamesPage appelé');
  
  // Approche directe : injecter dans le portail chauffeur existant
  const portal = document.getElementById('chauffeur-portal');
  if (portal) {
    portal.innerHTML = '';
    portal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#12121a;display:flex;flex-direction:column;overflow-y:auto;';
    buildGamesContent(portal);
    return;
  }
  
  // Fallback : créer un nouveau div
  let gamesScreen = document.getElementById('games-screen');
  if (gamesScreen) gamesScreen.remove();
  gamesScreen = document.createElement('div');
  gamesScreen.id = 'games-screen';
  gamesScreen.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#12121a;display:flex;flex-direction:column;overflow-y:auto;';
  document.body.appendChild(gamesScreen);
  buildGamesContent(gamesScreen);
}

function buildGamesContent(container) {
  // Version simplifiée — HTML statique pour garantir l'affichage
  container.innerHTML = `
    <div style="padding:20px;color:var(--text-primary,#fff);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <button onclick="renderPortal()" style="padding:8px 14px;background:var(--bg-sidebar);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;cursor:pointer;">← Retour</button>
        <span style="font-size:18px;font-weight:700;">🎮 Mes Jeux</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">
        <div onclick="openGame('enveloppe')" style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;cursor:pointer;">
          <div style="font-size:32px;">📬</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">L'Enveloppe</div>
          <button style="margin-top:8px;padding:4px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer;">▶ Jouer</button>
        </div>
        <div onclick="openGame('tetris')" style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;cursor:pointer;">
          <div style="font-size:32px;">📦</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">Tetris Colis</div>
          <button style="margin-top:8px;padding:4px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer;">▶ Jouer</button>
        </div>
        <div onclick="openGame('slalom')" style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;cursor:pointer;">
          <div style="font-size:32px;">🚛</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">Slalom Camion</div>
          <button style="margin-top:8px;padding:4px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer;">▶ Jouer</button>
        </div>
        <div onclick="openGame('scan')" style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;cursor:pointer;">
          <div style="font-size:32px;">⚡</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">Scan Express</div>
          <button style="margin-top:8px;padding:4px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer;">▶ Jouer</button>
        </div>
        <div onclick="openGame('tournee')" style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;cursor:pointer;">
          <div style="font-size:32px;">🗺️</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">Tournée Parfaite</div>
          <button style="margin-top:8px;padding:4px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer;">▶ Jouer</button>
        </div>
        <div onclick="openGame('dernier')" style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;cursor:pointer;">
          <div style="font-size:32px;">🏃</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">Dernier Colis</div>
          <button style="margin-top:8px;padding:4px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer;">▶ Jouer</button>
        </div>
        <div onclick="openGame('boite')" style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;cursor:pointer;">
          <div style="font-size:32px;">🚪</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">Bonne Boîte</div>
          <button style="margin-top:8px;padding:4px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer;">▶ Jouer</button>
        </div>
        <div onclick="openGame('chargement')" style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;cursor:pointer;">
          <div style="font-size:32px;">🏗️</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">Chargement Parfait</div>
          <button style="margin-top:8px;padding:4px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer;">▶ Jouer</button>
        </div>
      </div>
      <p style="text-align:center;color:var(--text-muted);margin-top:20px;font-size:12px;">🏆 Classement à venir — jouez pour enregistrer vos scores !</p>
    </div>
  `;
}

/* ── Ouvrir un jeu ────────────────────────────────────────── */
function openGame(gameId) {
  const fnMap = {
    enveloppe: 'startGameEnveloppe',
    tetris: 'startGameTetris',
    slalom: 'startGameSlalom',
    scan: 'startGameScan',
    tournee: 'startGameTournee',
    dernier: 'startGameDernier',
    boite: 'startGameBoite',
    chargement: 'startGameChargement'
  };
  const fn = fnMap[gameId];
  if (fn && typeof window[fn] === 'function') {
    window[fn]();
  } else {
    alert('🎮 Ce jeu arrive bientôt !');
  }
}

// Exports globaux
window.initGamesPage = initGamesPage;
window.openGame = openGame;
window.saveScore = saveScore;
window.loadStationScores = loadStationScores;
window.getPlayerRank = getPlayerRank;
window.getPlayerScore = getPlayerScore;
