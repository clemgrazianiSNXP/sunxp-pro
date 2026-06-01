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
      else if (c === ',' && !inQuote) { result.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
      else { cur += c; }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  };

  // Lire les en-têtes et les normaliser (minuscules, sans accents, sans espaces)
  const rawHeaders = splitCSVLine(lines[0]);
  const normalize = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const headers = rawHeaders.map(normalize);

  // Mapping flexible des colonnes par nom
  const findCol = (...candidates) => {
    for (const c of candidates) {
      const idx = headers.indexOf(normalize(c));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxSemaine    = findCol('Semaine', 'semaine', 'week');
  const idxId         = findCol('ID du transporteur', 'transporterid', 'id transporteur');
  const idxColis      = findCol('Colis livrés', 'colis livres', 'packages delivered');
  const idxDCR        = findCol('DCR', 'dcr');
  const idxDNRDPMO    = findCol('DNR DPMO', 'dnr dpmo', 'dnrdpmo');
  const idxDNR        = findCol('DNR', 'dnr');

  if (idxId < 0) { alert('Colonne "ID du transporteur" introuvable dans le CSV.'); return []; }

  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const cols = splitCSVLine(line);

    const semaine   = idxSemaine >= 0 ? (cols[idxSemaine] || '') : '';
    const idAmazon  = String(cols[idxId] || '').replace(/\s/g, '').toUpperCase();
    const colis     = idxColis >= 0 ? (parseFloat(String(cols[idxColis] || '').replace(',', '.')) || 0) : 0;
    const dcrRaw    = idxDCR >= 0 ? String(cols[idxDCR] || '').replace('%', '').replace(',', '.') : '0';
    const dcr       = parseFloat(dcrRaw) || 0;
    // DCR peut être en % (96.4%) ou en décimal (0.9732)
    const dcrNorm   = dcr > 1 ? dcr / 100 : dcr;
    const dcrPct    = Math.round(dcrNorm * 10000) / 100;
    const dnrDpmo   = idxDNRDPMO >= 0 ? (parseFloat(String(cols[idxDNRDPMO] || '').replace(',', '.')) || 0) : 0;
    const nombreDnr = idxDNR >= 0 ? (parseFloat(String(cols[idxDNR] || '').replace(',', '.')) || 0) : Math.round((dnrDpmo * colis) / 1000000 * 100) / 100;
    const colisRam  = Math.round(colis * (1 - dcrNorm));

    if (!idAmazon) return null;

    return { semaine, idAmazon, colis, colisRam, dcrPct, dnrDpmo, nombreDnr };
  }).filter(Boolean);
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
 * Extrait aussi le détail des rejets par catégorie.
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
    const candidates = nums.map(Number);
    // On a besoin d'au moins 9 nombres : Opportunities, Success, Bypass, Rejects, BlurryPhoto, NoPackage, PackageInCar, PackageTooClose, PhotoTooDark
    if (candidates.length < 4) continue;

    const opportunities = candidates[0];
    const success       = candidates[1];
    const bypass        = candidates[2];
    const rejectsRaw    = candidates[3];
    // Détail des rejets (colonnes 5-9 dans le PDF)
    const blurryPhoto     = candidates[4] || 0;
    const noPackage       = candidates[5] || 0;
    const packageInCar    = candidates[6] || 0;
    const packageTooClose = candidates[7] || 0;
    const photoTooDark    = candidates[8] || 0;

    if (opportunities <= 0) continue;
    // rejects = rejects PDF + bypass
    const rejects = rejectsRaw + bypass;
    const podPct = Math.round((success / opportunities * 100) * 100) / 100;
    rows.push({ semaine, idAmazon, opportunities, success, bypass, rejects, podPct, blurryPhoto, noPackage, packageInCar, packageTooClose, photoTooDark });
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
