/* js/primes-message.js — Génération des messages WhatsApp Primes */

function buildPrimeMessage(chauffeur, row, total, reportPrecedent) {
  const prenom = chauffeur.prenom || chauffeur.nom || chauffeur.id_amazon;
  const jours  = row.jours || 0;
  const base   = getPrimeBase(jours);
  const impacts = getImpactsList(row);

  // Calcul de la projection à 16 jours (prime max 140€)
  let deductions = 0;
  impacts.forEach(i => deductions += i.montant);
  const primeMax = 140; // getPrimeBase(16) = 140
  const projection = primeMax - deductions + (reportPrecedent || 0);

  let impactsText = '';
  if (impacts.length === 0) {
    impactsText = 'IMPACT : RAS';
  } else {
    impactsText = impacts.map(i => {
      // Ajouter le commentaire de "Autre" entre parenthèses si présent
      if (i.label === 'Autre' && row.comment_autre) {
        return `• ${i.label} : -${i.montant}€ (${row.comment_autre})`;
      }
      return `• ${i.label} : -${i.montant}€`;
    }).join('\n');
  }

  let msg = `Bonjour ${prenom} 👋\n\n`;
  msg += `Voici un récapitulatif de ta prime qualité 📊\n\n`;
  msg += `Jours travaillés : ${jours}\n`;
  msg += `Solde actuel (base ${base}€) : ${total}€\n\n`;
  msg += `Impacts :\n${impactsText}\n\n`;

  if (reportPrecedent < 0) {
    msg += `Report mois précédent : ${reportPrecedent}€\n\n`;
  }

  if (jours < 16) {
    msg += `📌 Si tu atteins 16 jours travaillés, ta prime sera de : ${projection}€\n\n`;
  }

  msg += `Donc ta prime pour le mois en cours est actuellement de : ${total}€\n\n`;
  msg += `💡 Ce montant est valable uniquement si tu effectues ton minimum de 16 jours travaillés dans le mois. En dessous de 16 jours, ta prime sera recalculée selon le barème.`;

  if (total < 0) {
    msg += `\n\n⚠️ Ton solde est négatif, ce montant sera déduit de ta prime du mois prochain.`;
  }

  msg += `\n\n📱 Retrouve toutes tes infos dans ton espace personnel SunXP Pro.`;

  return msg;
}

function sendPrimeWA(chauffeur, row, total, reportPrecedent) {
  const msg = buildPrimeMessage(chauffeur, row, total, reportPrecedent);
  navigator.clipboard.writeText(msg).catch(() => {});
  const tel = typeof formatWaTel === 'function' ? formatWaTel(chauffeur.telephone) : (chauffeur.telephone || '').replace(/\D/g, '');
  if (tel) {
    const a = document.createElement('a');
    a.href = 'whatsapp://send?phone=' + tel + '&text=' + encodeURIComponent(msg);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    alert('Numéro manquant pour ce chauffeur.\n\nMessage copié :\n' + msg);
  }
}
