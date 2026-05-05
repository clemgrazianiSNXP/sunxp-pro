/* js/repertoire-form.js — Formulaire ajout/modification chauffeur */

/**
 * Affiche le formulaire dans le container donné.
 * @param {HTMLElement} container
 * @param {object|null} chauffeur  - null = ajout, objet = modification
 * @param {function} onSave        - callback(chauffeur)
 * @param {function} onCancel      - callback()
 */
function showRepertoireForm(container, chauffeur, onSave, onCancel) {
  const isEdit = !!chauffeur;
  container.innerHTML = `
    <div class="rep-form-overlay">
      <div class="rep-form-box">
        <h2 class="rep-form-title">${isEdit ? 'Modifier' : 'Ajouter'} un chauffeur</h2>

        <div class="rep-field">
          <label>Prénom *</label>
          <input id="rf-prenom" class="rep-input" value="${esc(chauffeur?.prenom || '')}" placeholder="Prénom">
          <span class="rep-error" id="rf-err-prenom"></span>
        </div>
        <div class="rep-field">
          <label>Nom *</label>
          <input id="rf-nom" class="rep-input" value="${esc(chauffeur?.nom || '')}" placeholder="Nom">
          <span class="rep-error" id="rf-err-nom"></span>
        </div>
        <div class="rep-field">
          <label>Téléphone * <small>(ex: +33612345678)</small></label>
          <input id="rf-tel" class="rep-input" value="${esc(chauffeur?.telephone || '')}" placeholder="+33612345678">
          <span class="rep-error" id="rf-err-tel"></span>
        </div>
        <div class="rep-field">
          <label>ID Amazon * <small>(commence par A)</small></label>
          <input id="rf-amazon" class="rep-input" value="${esc(chauffeur?.id_amazon || '')}" placeholder="AZR123456789">
          <span class="rep-error" id="rf-err-amazon"></span>
        </div>
        <div class="rep-field">
          <label>Email <small>(pour accès espace chauffeur)</small></label>
          <input id="rf-email" type="email" class="rep-input" value="${esc(chauffeur?.email || '')}" placeholder="chauffeur@email.com">
          <span class="rep-error" id="rf-err-email"></span>
        </div>
        <div class="rep-field">
          <label>Matricule TSM</label>
          <input id="rf-matricule" class="rep-input" value="${esc(chauffeur?.matricule_tsm || '')}" placeholder="Matricule TSM">
        </div>

        <div class="rep-form-actions">
          <button class="rep-btn rep-btn-primary" id="rf-save">Enregistrer</button>
          <button class="rep-btn rep-btn-secondary" id="rf-cancel">Annuler</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#rf-cancel').addEventListener('click', onCancel);
  container.querySelector('#rf-save').addEventListener('click', async () => {
    const prenom  = container.querySelector('#rf-prenom').value.trim();
    const nom     = container.querySelector('#rf-nom').value.trim();
    const tel     = container.querySelector('#rf-tel').value.trim();
    const amazon  = container.querySelector('#rf-amazon').value.trim();
    const email   = container.querySelector('#rf-email').value.trim();
    const matricule = container.querySelector('#rf-matricule').value.trim();
    let valid = true;

    const setErr = (id, msg) => {
      const el = container.querySelector(id);
      el.textContent = msg;
      if (msg) valid = false;
    };

    setErr('#rf-err-prenom', prenom  ? '' : 'Le prénom est obligatoire.');
    setErr('#rf-err-nom',    nom     ? '' : 'Le nom est obligatoire.');
    setErr('#rf-err-tel',    tel     ? '' : 'Le téléphone est obligatoire.');
    setErr('#rf-err-amazon', !amazon ? 'L\'ID Amazon est obligatoire.'
                           : !amazon.toUpperCase().startsWith('A') ? 'L\'ID Amazon doit commencer par A.'
                           : '');

    if (!valid) return;

    const chauffeurData = {
      id: chauffeur?.id || ('c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      prenom, nom, telephone: tel, id_amazon: amazon.toUpperCase(), matricule_tsm: matricule, email: email || ''
    };

    // Créer le compte auth si email renseigné et pas encore de compte
    if (email && typeof sb === 'function' && sb()) {
      // Vérifier si un compte existe déjà pour cet email (ne pas recréer)
      const existingEmail = chauffeur?.email || '';
      if (email !== existingEmail) {
        const saveBtn = container.querySelector('#rf-save');
        saveBtn.disabled = true; saveBtn.textContent = 'Création du compte...';
        try {
          const stationId = window.getActiveStationId ? window.getActiveStationId() : 'default';
          const password = amazon.toUpperCase().slice(0, 4) + tel.slice(-4);
          const res = await fetch(sb().supabaseUrl + '/functions/v1/create-chauffeur-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sb().supabaseKey },
            body: JSON.stringify({ email, password, nom, prenom, station_id: stationId, chauffeur_id: amazon.toUpperCase() })
          });
          const result = await res.json();
          if (result.error && !result.error.includes('already been registered')) {
            setErr('#rf-err-email', result.error);
            saveBtn.disabled = false; saveBtn.textContent = 'Enregistrer';
            return;
          }
          console.log('✅ Compte chauffeur créé');
        } catch (e) {
          console.warn('Erreur création compte:', e.message);
        }
        saveBtn.disabled = false; saveBtn.textContent = 'Enregistrer';
      }
    }

    onSave(chauffeurData);
  });
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
