/* js/repertoire-form.js — Formulaire ajout/modification personne (chauffeur ou responsable) */

/**
 * Affiche le formulaire dans le container donné.
 * @param {HTMLElement} container
 * @param {object|null} person  - null = ajout, objet = modification
 * @param {string} type         - 'chauffeur' | 'responsable'
 * @param {function} onSave     - callback(person)
 * @param {function} onCancel   - callback()
 */
function showRepertoireForm(container, person, type, onSave, onCancel) {
  const isEdit = !!person;
  const roles = type === 'responsable' ? ROLES_RESPONSABLES : ROLES_CHAUFFEURS;
  const titleLabel = type === 'responsable' ? 'un responsable' : 'un chauffeur';

  const roleOptions = roles.map(r => `<option value="${r}" ${person?.role === r ? 'selected' : ''}>${r}</option>`).join('');

  container.innerHTML = `
    <div class="rep-form-overlay">
      <div class="rep-form-box">
        <h2 class="rep-form-title">${isEdit ? 'Modifier' : 'Ajouter'} ${titleLabel}</h2>

        <div class="rep-field">
          <label>Prénom *</label>
          <input id="rf-prenom" class="rep-input" value="${esc(person?.prenom || '')}" placeholder="Prénom">
          <span class="rep-error" id="rf-err-prenom"></span>
        </div>
        <div class="rep-field">
          <label>Nom *</label>
          <input id="rf-nom" class="rep-input" value="${esc(person?.nom || '')}" placeholder="Nom">
          <span class="rep-error" id="rf-err-nom"></span>
        </div>
        <div class="rep-field">
          <label>Rôle *</label>
          <select id="rf-role" class="rep-input">${roleOptions}</select>
        </div>
        <div class="rep-field">
          <label>Matricule</label>
          <input id="rf-matricule" class="rep-input" value="${esc(person?.matricule || '')}" placeholder="Matricule">
        </div>
        <div class="rep-field">
          <label>ID Amazon <small>(optionnel)</small></label>
          <input id="rf-amazon" class="rep-input" value="${esc(person?.id_amazon || '')}" placeholder="AZR123456789">
        </div>
        <div class="rep-field" ${type === 'responsable' ? 'style="display:none;"' : ''}>
          <label>Email <small>(pour accès espace chauffeur)</small></label>
          <input id="rf-email" type="email" class="rep-input" value="${esc(person?.email || '')}" placeholder="chauffeur@email.com">
        </div>
        <div class="rep-field">
          <label>Téléphone <small>(pour WhatsApp)</small></label>
          <input id="rf-telephone" type="tel" class="rep-input" value="${esc(person?.telephone || '')}" placeholder="06 12 34 56 78">
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
    const prenom = container.querySelector('#rf-prenom').value.trim();
    const nom = container.querySelector('#rf-nom').value.trim();
    const role = container.querySelector('#rf-role').value;
    const matricule = container.querySelector('#rf-matricule').value.trim();
    const id_amazon = container.querySelector('#rf-amazon').value.trim().toUpperCase();
    const email = container.querySelector('#rf-email') ? container.querySelector('#rf-email').value.trim() : '';
    const telephone = container.querySelector('#rf-telephone') ? container.querySelector('#rf-telephone').value.trim() : '';
    let valid = true;

    const setErr = (id, msg) => {
      const el = container.querySelector(id);
      if (el) { el.textContent = msg; if (msg) valid = false; }
    };

    setErr('#rf-err-prenom', prenom ? '' : 'Le prénom est obligatoire.');
    setErr('#rf-err-nom', nom ? '' : 'Le nom est obligatoire.');

    if (!valid) return;

    const personData = {
      id: person?.id || ('p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      prenom, nom, role, matricule, id_amazon, email, telephone
    };

    // Créer un compte Supabase Auth si email renseigné et nouveau (pas en édition avec même email)
    if (email && (!person || person.email !== email)) {
      var amazonPart = (id_amazon || '').slice(0, 4);
      var telDigits = telephone.replace(/\D/g, '');
      var telPart = telDigits.slice(-4);
      var mdp = amazonPart + telPart;
      if (mdp.length >= 6 && typeof sb === 'function' && sb()) {
        sb().auth.signUp({ email: email, password: mdp }).then(function(result) {
          if (result.error) console.warn('SignUp error:', result.error.message);
          else console.log('✅ Compte Supabase créé pour:', email);
        });
      }
    }

    onSave(personData);
  });
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
