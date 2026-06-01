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

/* ── Modal de signature ───────────────────────────────────── */
function showSignatureModal(doc, parentWrap, sid, chauffeurId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-sidebar);border-radius:14px;padding:20px;width:100%;max-width:420px;display:flex;flex-direction:column;gap:12px;';

  modal.innerHTML = `
    <div style="font-size:15px;font-weight:700;text-align:center;">✍️ Signer le document</div>
    <div style="font-size:12px;color:var(--text-muted);text-align:center;">${doc.document_nom}</div>
    <div style="font-size:11px;color:var(--text-muted);text-align:center;">Signez dans le cadre ci-dessous avec votre doigt</div>
    <canvas id="signature-canvas" width="380" height="180" style="border:2px solid var(--accent);border-radius:8px;background:#fff;touch-action:none;cursor:crosshair;width:100%;"></canvas>
    <div style="display:flex;gap:8px;">
      <button id="sig-clear" class="h-btn" style="flex:1;font-size:12px;">🗑 Effacer</button>
      <button id="sig-cancel" class="h-btn" style="flex:1;font-size:12px;">Annuler</button>
      <button id="sig-confirm" class="rep-btn rep-btn-primary" style="flex:1;font-size:12px;">✅ Valider</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Canvas signature
  const canvas = document.getElementById('signature-canvas');
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

  // Effacer
  document.getElementById('sig-clear').onclick = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); hasSigned = false; };

  // Annuler
  document.getElementById('sig-cancel').onclick = () => overlay.remove();

  // Valider
  document.getElementById('sig-confirm').onclick = async () => {
    if (!hasSigned) { alert('Veuillez signer avant de valider.'); return; }

    const btn = document.getElementById('sig-confirm');
    btn.textContent = '⏳...'; btn.disabled = true;

    try {
      const signatureData = canvas.toDataURL('image/png');
      const signatureDate = new Date().toISOString();
      const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();

      // Uploader la signature dans Supabase Storage pour avoir une URL publique
      let signatureUrl = '';
      try {
        const blob = await (await fetch(signatureData)).blob();
        const fileName = `signatures/${doc.id}_${Date.now()}.png`;
        const { data: uploadData } = await sb().storage.from('documents-employes').upload(fileName, blob, { contentType: 'image/png', upsert: true });
        if (uploadData) {
          const { data: urlData } = sb().storage.from('documents-employes').getPublicUrl(fileName);
          if (urlData) signatureUrl = urlData.publicUrl;
        }
      } catch(uploadErr) { console.warn('Upload signature:', uploadErr.message); }

      // Sauvegarder dans Supabase
      await sb().from('documents_signature').update({
        statut: 'signe',
        signature_data: signatureUrl || signatureData,
        signature_date: signatureDate,
      }).eq('id', doc.id);

      // Envoyer email de confirmation via Edge Function
      try {
        await sb().functions.invoke('send-signature-confirmation', {
          body: {
            chauffeurNom: nom,
            documentNom: doc.document_nom,
            signatureDate: new Date(signatureDate).toLocaleString('fr-FR'),
            envoyePar: doc.envoye_par,
            signatureData: signatureUrl || signatureData
          }
        });
      } catch(emailErr) {
        console.warn('Email confirmation error:', emailErr.message);
      }

      overlay.remove();

      // Rafraîchir la liste
      const newContent = await portalDocumentsASigner();
      parentWrap.innerHTML = '';
      parentWrap.appendChild(newContent);

      alert('✅ Document signé avec succès !');

    } catch(e) {
      alert('Erreur : ' + e.message);
      btn.textContent = '✅ Valider'; btn.disabled = false;
    }
  };
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
