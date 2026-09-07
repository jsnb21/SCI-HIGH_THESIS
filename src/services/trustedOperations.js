import { ensureFirebaseApp } from './firebaseInit.js';

let preparing;
async function prepare() {
  await ensureFirebaseApp();
  const firebase = window.firebase;
  if (!firebase.auth().currentUser || firebase.auth().currentUser.isAnonymous) throw new Error('Sign in to continue.');
  for (const [feature, file] of [['functions','functions'],['appCheck','app-check']]) {
    if (firebase[feature]) continue;
    await new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-' + file + '-compat.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load the account service.'));
      document.head.appendChild(script);
    });
  }
  let siteKey = window.SCI_HIGH?.APP_CHECK_SITE_KEY;
  if (!siteKey) {
    const response = await fetch((window.__APP_BASE__ || './') + 'config/env-config.json', {cache:'no-store'});
    if (response.ok) siteKey = (await response.json()).appCheckSiteKey;
  }
  if (!siteKey) throw new Error('Account services are not configured yet. Contact your administrator.');
  firebase.appCheck().activate(siteKey, true);
}
export async function callTrustedOperation(name, data = {}) {
  preparing ||= prepare().catch(error => { preparing = null; throw error; });
  await preparing;
  const result = await window.firebase.app().functions('asia-southeast1').httpsCallable(name)(data);
  return result.data;
}
