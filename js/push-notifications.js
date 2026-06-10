/* js/push-notifications.js — Web Push Notifications (SunXP Pro) */

const VAPID_PUBLIC_KEY = 'BJdo4JX1B7xZxW771ektPPRij38y5lwix6FtghbqvxakdvnrS3u5ici_vhmqwRYTqBMx5Zgh4vMKPJLnFBpaNzM';

/* ── Demander la permission et s'abonner ──────────────────── */
async function initPushNotifications() {
  // Vérifier le support
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications non supportées sur ce navigateur');
    return false;
  }

  // Vérifier la permission
  const permission = Notification.permission;
  if (permission === 'denied') {
    console.warn('Notifications refusées par l\'utilisateur');
    return false;
  }

  // Demander la permission si pas encore accordée
  if (permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      console.warn('Permission notifications refusée');
      return false;
    }
  }

  // S'abonner aux push
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Créer un nouvel abonnement
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log('✅ Abonnement push créé');
    } else {
      console.log('✅ Abonnement push existant');
    }

    // Sauvegarder dans Supabase
    await savePushSubscription(subscription);
    return true;
  } catch (e) {
    console.error('Erreur abonnement push:', e);
    return false;
  }
}

/* ── Sauvegarder le token dans Supabase ───────────────────── */
async function savePushSubscription(subscription) {
  if (!sb || !sb()) return;

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  const userId = window.currentUser ? window.currentUser.id : null;

  const subData = subscription.toJSON();

  try {
    const { error } = await sb().from('push_subscriptions').upsert({
      endpoint: subData.endpoint,
      keys_p256dh: subData.keys.p256dh,
      keys_auth: subData.keys.auth,
      station_id: stationId,
      user_id: userId,
      chauffeur_id: (typeof currentProfile !== 'undefined' && currentProfile) ? (currentProfile.chauffeur_id || '') : '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'endpoint' });

    if (error) console.warn('Erreur sauvegarde push subscription:', error.message);
    else console.log('✅ Push subscription sauvegardée dans Supabase');
  } catch (e) {
    console.warn('savePushSubscription error:', e.message);
  }
}

/* ── Utilitaire : convertir la clé VAPID ──────────────────── */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/* ── Init automatique pour les chauffeurs ─────────────────── */
// Appelé depuis chauffeur-accueil.js après connexion
window.initPushNotifications = initPushNotifications;
