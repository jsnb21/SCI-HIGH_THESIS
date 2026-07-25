// Firebase client for Leaderboards
// Provides initFirebase, ensureFirebaseReady, and getDb utilities.

let _db = null;
let _initialized = false;
let _initPromise = null;

async function tryLoadSiteFirebaseConfig() {
  if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') {
    return true;
  }
  // Try to load config script dynamically (works on both dev and prod)
  const base = (window.__APP_BASE__ || '/');
  const candidates = [
    './config/firebase-config.js',
    'config/firebase-config.js',
    base + 'config/firebase-config.js'
  ];
  for (const src of candidates) {
    try {
      // Skip if already injected
      if (document.querySelector(`script[src*="config/firebase-config.js"]`)) {
        await new Promise(r=>setTimeout(r, 200));
        if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') return true;
        continue;
      }
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') return true;
    } catch(_) { /* try next */ }
  }
  return false;
}

async function _doInitialize() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK not loaded');
  }

  // Try site-wide config helper first, or dynamically load it
  if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') {
    await window.firebaseConfig.initializeFirebase();
  } else if (await tryLoadSiteFirebaseConfig()) {
    try {
      await window.firebaseConfig.initializeFirebase();
    } catch (err) {
      console.warn('[firebaseClient] Site firebaseConfig present but initialization failed:', err?.message || err);
    }
  }

  // If still no app, attempt to load developer/local env config instead of embedding keys.
  // Provide configuration via one of:
  //  1) runtime script exposing window.SCI_HIGH.FIREBASE (CI/CD injection)
  //  2) ./config/env-config.local.json (gitignored; developer machine only)
  //  3) ./config/env-config.json (committed without secrets or with limited public keys)
  if (firebase.apps.length === 0) {
    const cacheBuster = `?_v=${Date.now()}`;
    const tryInitFrom = async (path) => {
      try {
        const res = await fetch(path + cacheBuster, { cache: 'no-store' });
        if (!res.ok) return false;
        const raw = await res.json();
        const cfg = {
          apiKey: raw.apiKey || raw.FIREBASE_API_KEY,
          authDomain: raw.authDomain || raw.FIREBASE_AUTH_DOMAIN,
          databaseURL: raw.databaseURL || raw.FIREBASE_DATABASE_URL,
          projectId: raw.projectId || raw.FIREBASE_PROJECT_ID,
          storageBucket: raw.storageBucket || raw.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: raw.messagingSenderId || raw.FIREBASE_MESSAGING_SENDER_ID,
          appId: raw.appId || raw.FIREBASE_APP_ID
        };
        if (!cfg.apiKey || !(cfg.databaseURL || cfg.projectId)) return false;
        firebase.initializeApp(cfg);
        console.info(`[firebaseClient] Initialized Firebase using ${path}`);
        return true;
      } catch (_) { return false; }
    };

    const base = (window.__APP_BASE__ || '/');
    const candidates = [
      './config/env-config.local.json',
      'config/env-config.local.json',
      base + 'config/env-config.local.json',
      './config/env-config.json',
      'config/env-config.json',
      base + 'config/env-config.json'
    ];
    let initialized = false;
    for (const p of candidates) {
      // Skip duplicate attempts if already initialized by earlier candidate
      if (firebase.apps.length) { initialized = true; break; }
      if (await tryInitFrom(p)) { initialized = true; break; }
    }
    if (!initialized && firebase.apps.length === 0) {
      console.warn('[firebaseClient] No Firebase app initialized. Supply runtime config or env-config(.local).json.');
    }
  }

  _db = firebase.database();

  // Ensure anonymous auth for rules that require an authenticated context
  try {
    if (!firebase.auth) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-fbauth]');
        if (existing) {
          existing.addEventListener('load', resolve);
          existing.addEventListener('error', reject);
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js';
        s.async = true;
        s.setAttribute('data-fbauth','true');
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    if (firebase.auth) {
      try {
        if (!firebase.auth().currentUser) {
          await firebase.auth().signInAnonymously();
        }
      } catch (e) {
        console.warn('[firebaseClient] Anonymous auth failed or disabled:', e?.message || e);
      }
    }
  } catch (e) {
    console.warn('[firebaseClient] Failed to prepare Firebase Auth:', e?.message || e);
  }
  // Wait for connection info to be available (best-effort)
  try {
    const connSnap = await _db.ref('.info/connected').once('value');
    const connected = !!connSnap.val();
    if (!connected) {
      // Retry small backoff to allow initial negotiation
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 300 * (i + 1)));
        const s = await _db.ref('.info/connected').once('value');
        if (s.val()) break;
      }
    }
  } catch(_) { /* ignore */ }
  _initialized = true;
  // Maintain legacy global for any older scripts relying on it
  try { window.db = _db; } catch(_) {}
  return _db;
}

export async function initFirebase() {
  if (_initialized && _db) return _db;
  if (_initPromise) return _initPromise;
  _initPromise = _doInitialize().finally(() => { _initPromise = null; });
  return _initPromise;
}

export async function ensureFirebaseReady() {
  if (_initialized && _db) return _db;
  return initFirebase();
}

export function getDb() {
  return _db;
}