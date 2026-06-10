/* js/portal-signature.js — Signature de documents pour le portail chauffeur */
console.log('portal-signature.js chargé');

async function portalDocumentsASigner() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;padding:16px;';

  const sid = portalStationId;
  const chauffeurId = portalChauffeur.id_amazon;

  wrap.innerHTML = '<div style="font-size:15px;font-weight:700;text-align:center;">📝 Documents à signer</div><p style="color:var(--text-muted);font-size:12px;text-align:center;">Chargement...</p>';

  if (!sb || !sb()) {
    wrap.innerHTML += '<p style="color:#f87171;">Connexion indisponible.</p>';
    return wrap;
  }

  try {
    const { data: docs, error } = await sb()
      .from('documents_signature')
      .select('*')
      .eq('station_id', sid)
      .eq('chauffeur_id', chauffeurId)
      .order('envoye_at', { ascending: false });

    if (error) throw error;

    wrap.innerHTML = '<div style="font-size:15px;font-weight:700;text-align:center;margin-bottom:8px;">📝 Documents à signer</div>';

    const enAttente = (docs || []).filter(d => d.statut === 'en_attente');
    const signes = (docs || []).filter(d => d.statut === 'signe');

    if (!docs || !docs.length) {
      wrap.innerHTML += '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);"><div style="font-size:40px;margin-bottom:12px;">✅</div>Aucun document à signer.</div>';
      return wrap;
    }

    // Documents en attente
    if (enAttente.length) {
      const title = document.createElement('div');
      title.style.cssText = 'font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:8px;';
      title.textContent = '⏳ En attente de signature (' + enAttente.length + ')';
      wrap.appendChild(title);

      enAttente.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'portal-card';
        card.style.cssText += 'text-align:left;align-items:stretch;gap:10px;border-left:3px solid #fbbf24;';

        card.innerHTML = `
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">📄 ${doc.document_nom}</div>
          <div style="font-size:11px;color:var(--text-muted);">Envoyé le ${new Date(doc.envoye_at).toLocaleDateString('fr-FR')} par ${doc.envoye_par}</div>
        `;

        // Bouton voir le document
        const viewBtn = document.createElement('button');
        viewBtn.className = 'h-btn';
        viewBtn.style.cssText = 'font-size:11px;padding:6px 12px;';
        viewBtn.textContent = '👁 Voir le document';
        viewBtn.onclick = () => window.open(doc.fichier_url, '_blank');
        card.appendChild(viewBtn);

        // Bouton signer
        const signBtn = document.createElement('button');
        signBtn.className = 'rep-btn rep-btn-primary';
        signBtn.style.cssText = 'font-size:12px;padding:8px 16px;margin-top:6px;';
        signBtn.textContent = '✍️ Signer ce document';
        signBtn.onclick = () => showSignatureModal(doc, wrap, sid, chauffeurId);
        card.appendChild(signBtn);

        wrap.appendChild(card);
      });
    }

    // Documents déjà signés
    if (signes.length) {
      const title = document.createElement('div');
      title.style.cssText = 'font-size:12px;font-weight:700;color:#4ade80;margin:12px 0 8px;';
      title.textContent = '✅ Déjà signés (' + signes.length + ')';
      wrap.appendChild(title);

      signes.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'portal-card';
        card.style.cssText += 'text-align:left;border-left:3px solid #4ade80;opacity:0.8;';
        card.innerHTML = `
          <div style="font-size:13px;font-weight:700;">📄 ${doc.document_nom}</div>
          <div style="font-size:11px;color:#4ade80;">✅ Signé le ${new Date(doc.signature_date).toLocaleDateString('fr-FR')} à ${new Date(doc.signature_date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</div>
        `;
        wrap.appendChild(card);
      });
    }

  } catch(e) {
    wrap.innerHTML += `<p style="color:#f87171;">Erreur : ${e.message}</p>`;
  }

  return wrap;
}

/* ── Modal de signature avec visualisation PDF ────────────── */
async function showSignatureModal(doc, parentWrap, sid, chauffeurId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;overflow:hidden;';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-sidebar);border-bottom:1px solid var(--border);flex-shrink:0;';
  header.innerHTML = `
    <div style="font-size:13px;font-weight:700;">✍️ ${doc.document_nom}</div>
    <button id="sig-close-btn" class="h-btn" style="font-size:11px;padding:4px 10px;color:#f87171;border-color:#f87171;">✕ Fermer</button>
  `;
  overlay.appendChild(header);

  // Instructions
  const instructions = document.createElement('div');
  instructions.style.cssText = 'padding:10px 16px;background:rgba(59,130,246,0.1);border-bottom:1px solid rgba(59,130,246,0.2);font-size:12px;color:#93c5fd;text-align:center;flex-shrink:0;';
  instructions.textContent = '📌 Naviguez jusqu\'à l\'endroit à signer, puis cliquez/appuyez sur la page pour placer votre signature';
  overlay.appendChild(instructions);

  // Zone PDF
  const pdfZone = document.createElement('div');
  pdfZone.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;padding:16px;gap:12px;';
  overlay.appendChild(pdfZone);

  // Navigation pages
  const navBar = document.createElement('div');
  navBar.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--bg-sidebar);border-top:1px solid var(--border);flex-shrink:0;justify-content:center;flex-wrap:wrap;';
  overlay.appendChild(navBar);

  document.body.appendChild(overlay);

  // Fermer
  header.querySelector('#sig-close-btn').onclick = () => overlay.remove();

  // Variables état
  let pdfDocRef = null;
  let totalPages = 0;
  let currentPage = 1;
  let signaturePosition = null;
  let signatureData = null;

  // Charger le PDF
  try {
    const pdfBytes = await fetch(doc.fichier_url).then(r => r.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    pdfDocRef = await loadingTask.promise;
    totalPages = pdfDocRef.numPages;
  } catch(e) {
    pdfZone.innerHTML = `<p style="color:#f87171;">Erreur chargement PDF : ${e.message}</p>`;
    return;
  }

  // Rendre une page
  async function renderPage(pageNum) {
    pdfZone.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">⏳ Chargement...</p>';
    try {
      const page = await pdfDocRef.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(window.innerWidth - 32, 600) / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = 'width:100%;max-width:600px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);cursor:crosshair;touch-action:none;';

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Afficher signature si placée sur cette page
      if (signaturePosition && signaturePosition.page === pageNum && signatureData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, signaturePosition.x, signaturePosition.y, 200, 80);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(signaturePosition.x, signaturePosition.y, 200, 80);
        };
        img.src = signatureData;
      } else if (signaturePosition && signaturePosition.page === pageNum && !signatureData) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(signaturePosition.x, signaturePosition.y, 200, 80);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(59,130,246,0.1)';
        ctx.fillRect(signaturePosition.x, signaturePosition.y, 200, 80);
        ctx.fillStyle = '#3b82f6';
        ctx.font = '12px Arial';
        ctx.fillText('✍️ Zone de signature', signaturePosition.x + 10, signaturePosition.y + 45);
      }

      pdfZone.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;width:100%;max-width:600px;';
      wrapper.appendChild(canvas);

      const pageLabel = document.createElement('div');
      pageLabel.style.cssText = 'font-size:11px;color:var(--text-muted);text-align:center;margin-top:6px;';
      pageLabel.textContent = `Page ${pageNum} / ${totalPages}`;
      pdfZone.appendChild(wrapper);
      pdfZone.appendChild(pageLabel);

      // Clic pour placer la signature
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.max(0, Math.min((e.clientX - rect.left) * scaleX - 100, canvas.width - 200));
        const y = Math.max(0, Math.min((e.clientY - rect.top) * scaleY - 40, canvas.height - 80));
        signaturePosition = { page: pageNum, x, y };
        showDrawSignatureModal((sigData) => {
          signatureData = sigData;
          renderPage(pageNum);
          updateValidateBtn();
        });
      });

      // Touch pour mobile
      canvas.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 0) return;
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.max(0, Math.min((touch.clientX - rect.left) * scaleX - 100, canvas.width - 200));
        const y = Math.max(0, Math.min((touch.clientY - rect.top) * scaleY - 40, canvas.height - 80));
        signaturePosition = { page: pageNum, x, y };
        showDrawSignatureModal((sigData) => {
          signatureData = sigData;
          renderPage(pageNum);
          updateValidateBtn();
        });
      });

    } catch(e) {
      pdfZone.innerHTML = `<p style="color:#f87171;">Erreur page ${pageNum} : ${e.message}</p>`;
    }
  }

  // Barre de navigation
  function buildNavBar() {
    navBar.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'h-btn';
    prevBtn.style.cssText = 'font-size:12px;padding:6px 14px;';
    prevBtn.textContent = '◀ Préc.';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => { currentPage--; renderPage(currentPage); buildNavBar(); };

    const pageInfo = document.createElement('span');
    pageInfo.style.cssText = 'font-size:12px;color:var(--text-muted);min-width:60px;text-align:center;';
    pageInfo.textContent = `${currentPage}/${totalPages}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'h-btn';
    nextBtn.style.cssText = 'font-size:12px;padding:6px 14px;';
    nextBtn.textContent = 'Suiv. ▶';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => { currentPage++; renderPage(currentPage); buildNavBar(); };

    const validateBtn = document.createElement('button');
    validateBtn.id = 'sig-validate-btn';
    validateBtn.className = 'rep-btn rep-btn-primary';
    validateBtn.style.cssText = 'font-size:12px;padding:6px 16px;';
    validateBtn.textContent = '✅ Valider';
    validateBtn.disabled = !signatureData;
    validateBtn.onclick = () => finalizeSignature(doc, parentWrap, sid, chauffeurId, overlay, pdfDocRef, signaturePosition, signatureData);

    navBar.appendChild(prevBtn);
    navBar.appendChild(pageInfo);
    navBar.appendChild(nextBtn);
    navBar.appendChild(validateBtn);
  }

  function updateValidateBtn() {
    const btn = document.getElementById('sig-validate-btn');
    if (btn) btn.disabled = !signatureData;
  }

  await renderPage(1);
  buildNavBar();
}

/* ── Modale de dessin de signature ────────────────────────── */
function showDrawSignatureModal(onConfirm) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.85);display:flex;align-items:flex-end;justify-content:center;padding:16px;';

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border-radius:16px 16px 0 0;padding:20px;width:100%;max-width:500px;';
  box.innerHTML = `
    <div style="font-size:14px;font-weight:700;text-align:center;margin-bottom:6px;">✍️ Signez ici</div>
    <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-bottom:12px;">Signez avec votre doigt dans le cadre ci-dessous</div>
    <canvas id="sig-draw-canvas" width="460" height="160" style="border:2px solid var(--accent);border-radius:8px;background:#fff;touch-action:none;width:100%;cursor:crosshair;"></canvas>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="sig-draw-clear" class="h-btn" style="flex:1;font-size:12px;">🗑 Effacer</button>
      <button id="sig-draw-cancel" class="h-btn" style="flex:1;font-size:12px;">Annuler</button>
      <button id="sig-draw-ok" class="rep-btn rep-btn-primary" style="flex:2;font-size:12px;">✅ Confirmer</button>
    </div>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  const canvas = document.getElementById('sig-draw-canvas');
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  let drawing = false;
  let hasSigned = false;

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  canvas.addEventListener('mousedown', (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('mousemove', (e) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasSigned = true; });
  canvas.addEventListener('mouseup', () => { drawing = false; });
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasSigned = true; }, { passive: false });
  canvas.addEventListener('touchend', () => { drawing = false; });

  document.getElementById('sig-draw-clear').onclick = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); hasSigned = false; };
  document.getElementById('sig-draw-cancel').onclick = () => modal.remove();
  document.getElementById('sig-draw-ok').onclick = () => {
    if (!hasSigned) { alert('Veuillez signer avant de confirmer.'); return; }
    modal.remove();
    onConfirm(canvas.toDataURL('image/png'));
  };
}

/* ── Finaliser la signature — générer le PDF signé ────────── */
async function finalizeSignature(doc, parentWrap, sid, chauffeurId, overlay, pdfDocRef, signaturePosition, signatureData) {
  const btn = document.getElementById('sig-validate-btn');
  if (btn) { btn.textContent = '⏳...'; btn.disabled = true; }

  try {
    const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();
    const signatureDate = new Date();
    const signatureDateStr = signatureDate.toISOString();
    const signatureDateFr = signatureDate.toLocaleString('fr-FR');

    // Charger le PDF original avec pdf-lib
    const pdfBytes = await fetch(doc.fichier_url).then(r => r.arrayBuffer());
    const pdfLibDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const pages = pdfLibDoc.getPages();

    const targetPageIdx = signaturePosition.page - 1;
    const targetPage = pages[targetPageIdx];
    const { width, height } = targetPage.getSize();

    // Convertir coordonnées canvas → PDF
    const pdfPage = await pdfDocRef.getPage(signaturePosition.page);
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const canvasWidth = Math.min(window.innerWidth - 32, 600);
    const scale = canvasWidth / baseViewport.width;

    const pdfX = signaturePosition.x / scale;
    const pdfY = height - (signaturePosition.y / scale) - (80 / scale);

    // Intégrer l'image de signature
    const sigImgBytes = await fetch(signatureData).then(r => r.arrayBuffer());
    const sigImage = await pdfLibDoc.embedPng(sigImgBytes);

    targetPage.drawImage(sigImage, {
      x: pdfX,
      y: pdfY,
      width: 200 / scale,
      height: 80 / scale,
    });

    // Bloc de certification
    const font = await pdfLibDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const certLines = [
      `Signé électroniquement par : ${nom}`,
      `Date : ${signatureDateFr}`,
      `Via SunXP Pro (Art. 1366 Code civil)`,
    ];
    certLines.forEach((line, i) => {
      targetPage.drawText(line, {
        x: pdfX,
        y: pdfY - 12 - (i * 10),
        size: 7,
        font,
        color: PDFLib.rgb(0.4, 0.4, 0.4),
      });
    });

    // Sauvegarder le PDF signé
    const signedPdfBytes = await pdfLibDoc.save();
    const signedBlob = new Blob([signedPdfBytes], { type: 'application/pdf' });

    // Uploader dans Supabase Storage
    let signedUrl = null;
    if (typeof sb === 'function' && sb()) {
      const signedFileName = `signed/${sid}/${doc.id}_signed_${Date.now()}.pdf`;
      const { error: uploadErr } = await sb().storage
        .from('documents-employes')
        .upload(signedFileName, signedBlob, { upsert: true, contentType: 'application/pdf' });
      if (!uploadErr) {
        const { data: urlData } = sb().storage.from('documents-employes').getPublicUrl(signedFileName);
        signedUrl = urlData?.publicUrl || null;
      }
    }

    // Mettre à jour Supabase
    await sb().from('documents_signature').update({
      statut: 'signe',
      signature_data: signatureData,
      signature_date: signatureDateStr,
      signed_pdf_url: signedUrl,
    }).eq('id', doc.id);

    // Télécharger le PDF signé
    const downloadUrl = URL.createObjectURL(signedBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = doc.document_nom.replace('.pdf', '') + '_signe.pdf';
    a.click();
    URL.revokeObjectURL(downloadUrl);

    // Email de confirmation
    try {
      await sb().functions.invoke('send-signature-confirmation', {
        body: {
          chauffeurNom: nom,
          documentNom: doc.document_nom,
          signatureDate: signatureDateFr,
          envoyePar: doc.envoye_par,
          signatureData: signatureData,
          signedPdfUrl: signedUrl
        }
      });
    } catch(emailErr) { console.warn('Email error:', emailErr.message); }

    overlay.remove();

    // Rafraîchir
    const newContent = await portalDocumentsASigner();
    parentWrap.innerHTML = '';
    parentWrap.appendChild(newContent);

    alert('✅ Document signé ! Le PDF a été téléchargé.');

  } catch(e) {
    alert('Erreur : ' + e.message);
    if (btn) { btn.textContent = '✅ Valider'; btn.disabled = false; }
  }
}


/* ── Badge documents en attente ───────────────────────────── */
async function checkDocumentsASignerBadge() {
  if (!sb || !sb()) return;
  try {
    const { count } = await sb()
      .from('documents_signature')
      .select('*', { count: 'exact', head: true })
      .eq('station_id', portalStationId)
      .eq('chauffeur_id', portalChauffeur.id_amazon)
      .eq('statut', 'en_attente');

    if (count && count > 0) {
      const signerTab = document.querySelector('[data-tab="signer"]');
      if (signerTab) {
        const badge = document.createElement('span');
        badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#f87171;color:#fff;font-size:8px;font-weight:700;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;';
        badge.textContent = count;
        signerTab.style.position = 'relative';
        signerTab.appendChild(badge);
      }
    }
  } catch(e) {
    console.warn('checkDocumentsASignerBadge:', e.message);
  }
}
