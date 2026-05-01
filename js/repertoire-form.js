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
  container.querySelector('#rf-save').addEventListener('click', () => {
    const prenom  = container.querySelector('#rf-prenom').value.trim();
    const nom     = container.querySelector('#rf-nom').value.trim();
    const tel     = container.querySelector('#rf-tel').value.trim();
    const amazon  = container.querySelector('#rf-amazon').value.trim();
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

    onSave({
      id: chauffeur?.id || ('c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      prenom, nom, telephone: tel, id_amazon: amazon.toUpperCase(), matricule_tsm: matricule
    });
  });
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
