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
      console.log('🔐 Tentative création compte — email:', email, '| mdp:', mdp, '| longueur:', mdp.length);
      if (mdp.length >= 6 && window.supabase && window.supabase.createClient) {
        var stationId = window.getActiveStationId ? window.getActiveStationId() : null;
        // Client séparé pour ne pas perturber la session responsable en cours
        var signUpClient = window.supabase.createClient(
          'https://uqgwmrvtjulpbblucrht.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3dtcnZ0anVscGJibHVjcmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODA0MDcsImV4cCI6MjA5MjM1NjQwN30.h1NkKsNuqFubREY0Zzt2VIJYqjJHKn14BUALocVwk5s',
          { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        );
        signUpClient.auth.signUp({
          email: email,
          password: mdp,
          options: { data: { nom: nom, prenom: prenom, role: 'chauffeur' } }
        }).then(function(result) {
          console.log('📧 SignUp result:', JSON.stringify(result));
          if (result.error) {
            console.error('❌ SignUp error:', result.error.message);
            showToast('Erreur création compte: ' + result.error.message, 'error');
          } else {
            var userId = result.data && result.data.user ? result.data.user.id : null;
            console.log('✅ Compte créé — userId:', userId, '| identities:', result.data.user ? result.data.user.identities : 'N/A');
            // Si identities est vide, le compte existait déjà
            if (result.data.user && result.data.user.identities && result.data.user.identities.length === 0) {
              showToast('Ce compte existe déjà: ' + email, 'warning');
              return;
            }
            showToast('Compte créé pour ' + email, 'success');
            // Insérer dans user_profiles
            if (userId && stationId && typeof sb === 'function' && sb()) {
              sb().from('user_profiles').upsert({
                id: userId,
                role: 'chauffeur',
                station_id: stationId,
                chauffeur_id: id_amazon || '',
                nom: nom,
                prenom: prenom
              }).then(function(res) {
                if (res.error) {
                  console.error('❌ user_profiles error:', res.error.message);
                  showToast('Profil non créé: ' + res.error.message, 'error');
                } else {
                  console.log('✅ Profil chauffeur inséré dans user_profiles');
                }
              });
            } else {
              console.warn('⚠️ user_profiles non inséré — userId:', userId, '| stationId:', stationId, '| sb:', !!sb());
            }
          }
        }).catch(function(err) {
          console.error('❌ SignUp catch:', err);
          showToast('Erreur réseau: ' + err.message, 'error');
        });
      } else {
        var reason = !window.supabase ? 'SDK non chargé' : (!window.supabase.createClient ? 'createClient absent' : 'mdp trop court (' + mdp.length + ' chars)');
        console.warn('⚠️ Compte non créé:', reason);
        showToast('Impossible de créer le compte: ' + reason, 'warning');
      }
    }

    onSave(personData);
  });
}

/* ── Toast notification stylée ─────────────────────────────── */
function showToast(msg, type) {
  // type: 'success' | 'error' | 'warning'
  var colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b' };
  var icons = { success: '✅', error: '❌', warning: '⚠️' };
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:var(--bg-sidebar,#1e1e2e);border:1px solid ' + (colors[type] || colors.success) + ';border-radius:10px;padding:14px 20px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,0.3);animation:toastIn 0.3s ease;max-width:340px;';
  toast.innerHTML = '<span style="font-size:18px;">' + (icons[type] || '✅') + '</span><span style="font-size:13px;color:var(--text-primary,#fff);line-height:1.4;">' + msg + '</span>';
  document.body.appendChild(toast);
  // Ajouter animation CSS si pas déjà présente
  if (!document.getElementById('toast-anim-style')) {
    var s = document.createElement('style');
    s.id = 'toast-anim-style';
    s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}@keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(40px)}}';
    document.head.appendChild(s);
  }
  setTimeout(function() {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3500);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
