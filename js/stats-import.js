/* js/stats-import.js — Logique d'import CSV/PDF pour l'onglet Statistiques */

/**
 * Parse un fichier CSV et retourne un tableau d'objets DS/DPMO.
 * Colonnes : A=Semaine, B=ID transporteur, C=Colis livrés, D=DCR, E=DNR DPMO
 */
function parseCSVDSDPMO(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const splitCSVLine = line => {
    const result = []; let cur = ''; let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; }
      else if (c === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    result.push(cur.trim());
    return result;
  };
  return lines.slice(1).map(line => {
    const clean = splitCSVLine(line);
    const semaine   = clean[0] || '';
    const idAmazon  = String(clean[1] || '').replace(/\s/g, '').toUpperCase();
    const colis     = parseFloat(String(clean[2] || '').replace(',', '.')) || 0;
    const dcr       = parseFloat(String(clean[3] || '').replace(',', '.')) || 0;
    const dnrDpmo   = parseFloat(String(clean[4] || '').replace(',', '.')) || 0;
    const dcrPct    = Math.round(dcr * 10000) / 100;
    const colisRam  = Math.round(colis * (1 - dcr));
    const nombreDnr = Math.round((dnrDpmo * colis) / 1000000 * 100) / 100;
    return { semaine, idAmazon, colis, colisRam, dcrPct, dnrDpmo, nombreDnr };
  }).filter(r => r.idAmazon);
}

/**
 * Lit un fichier texte et retourne son contenu via Promise.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Lit un fichier PDF avec PDF.js et retourne le texte brut page par page.
 */
async function readPDFAsText(file) {
  if (!window.pdfjsLib) throw new Error('PDF.js non chargé');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Regroupe les items par ligne (même Y arrondi)
    const byY = {};
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push(item.str);
    });
    // Trie par Y décroissant (haut → bas) et concatène
    Object.keys(byY).sort((a, b) => b - a).forEach(y => {
      fullText += byY[y].join(' ') + '\n';
    });
  }
  return fullText;
}

/**
 * Extrait les données POD depuis le texte brut d'un PDF.
 * Cherche les lignes contenant un ID Amazon (A + 9-19 alphanum).
 */
function parsePDFTextPOD(text, semaine) {
  const rows = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const idRegex = /\b(A[A-Z0-9]{9,19})\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idMatch = line.match(idRegex);
    if (!idMatch) continue;
    const idAmazon = idMatch[1].replace(/\s/g, '').toUpperCase();

    // Cherche tous les nombres sur cette ligne et les suivantes (max 2 lignes)
    const searchText = [line, lines[i+1] || '', lines[i+2] || ''].join(' ');
    const nums = searchText.match(/\b\d+\b/g) || [];
    // Filtre les nombres > 0 (ignore les 0 isolés et les années)
    const candidates = nums.map(Number).filter(n => n > 0 && n < 100000);
    if (candidates.length < 2) continue;
    const opportunities = candidates[0];
    const success       = candidates[1];
    const rejects       = opportunities - success;
    const podPct = Math.round((100 - (rejects / opportunities * 100)) * 100) / 100;
    rows.push({ semaine, idAmazon, opportunities, success, rejects, podPct });
  }
  return rows;
}

/**
 * Résout un ID Amazon vers Prénom + Nom depuis le répertoire.
 * Cherche dans tous les champs possibles pour l'ID Amazon.
 * Retourne { nom, telephone } ou null.
 */
function resolveIdAmazon(idAmazon, stationId) {
  const cleanId = id => String(id || '').replace(/\s/g, '').toUpperCase();
  const needle = cleanId(idAmazon);
  if (!needle) return null;
  try {
    const raw = localStorage.getItem(stationId + '-repertoire');
    if (!raw) return null;
    const list = JSON.parse(raw);
    // Cherche dans tous les champs qui pourraient contenir l'ID Amazon
    const found = list.find(c => {
      return cleanId(c.id_amazon)  === needle ||
             cleanId(c.idAmazon)   === needle ||
             cleanId(c.amazon_id)  === needle ||
             cleanId(c.amazonId)   === needle ||
             cleanId(c.transporterId) === needle;
    });
    if (!found) return null;
    const prenom = found.prenom || found.firstName || '';
    const nom    = found.nom    || found.lastName  || found.name || '';
    return {
      nom: (prenom + ' ' + nom).trim(),
      telephone: found.telephone || found.phone || ''
    };
  } catch (_) { return null; }
}
