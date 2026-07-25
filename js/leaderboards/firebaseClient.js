// Firebase client for Leaderboards
// Provides initFirebase, ensureFirebaseReady, and getDb utilities.

let _db = null;
let _initialized = false;
let _initPromise = null;

async function tryLoadSiteFirebaseConfig() {
  if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') {
    return true;
  }
  const base = window.__APP_BASE__ || '/';
  const candidates = [
    './config/firebase-config.js',
    'config/firebase-config.js',
    base + 'config/firebase-config.js'
  ];
  for (const src of candidates) {
    try {
      if (document.querySelector(`script[src*="config/firebase-config.js"]`)) {
        await new Promise((r) => setTimeout(r, 200));
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
    } catch (_) { /* try next */ }
  }
  return false;
}

async function _doInitialize() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK not loaded on window');
  }

  // 1. Check if Firebase is already initialized
  if (firebase.apps.length === 0) {
    
    // Strategy A: Runtime window injection (GitHub Actions / deploy.yml)
    const windowConfig = window.SCI_HIGH?.FIREBASE || window.SCI_HIGH_FIREBASE_CONFIG;
    if (windowConfig && windowConfig.apiKey) {
      firebase.initializeApp(windowConfig);
      console.info('[firebaseClient] Initialized Firebase using window.SCI_HIGH.FIREBASE');
    } 
    
    // Strategy B: Site-wide helper
    else if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') {
      await window.firebaseConfig.initializeFirebase();
    } else if (await tryLoadSiteFirebaseConfig()) {
      try {
        await window.firebaseConfig.initializeFirebase();
      } catch (err) {
        console.warn('[firebaseClient] Site firebaseConfig initialization failed:', err?.message || err);
      }
    }

    // Strategy C: Fetch env-config.json files
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

      const base = window.__APP_BASE__ || '/';
      const candidates = [
        './config/env-config.local.json',
        'config/env-config.local.json',
        base + 'config/env-config.local.json',
        './config/env-config.json',
        'config/env-config.json',
        base + 'config/env-config.json'
      ];

      for (const p of candidates) {
        if (firebase.apps.length) break;
        if (await tryInitFrom(p)) break;
      }
    }
  }

  // CRITICAL FIX: Verify an app exists BEFORE attempting to attach the database reference!
  if (firebase.apps.length === 0) {
    throw new Error('[firebaseClient] Cannot initialize Realtime Database: No Firebase App has been created.');
  }

  _db = firebase.database();

  // 2. Ensure anonymous auth
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
        s.setAttribute('data-fbauth', 'true');
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    if (firebase.auth && !firebase.auth().currentUser) {
      await firebase.auth().signInAnonymously();
    }
  } catch (e) {
    console.warn('[firebaseClient] Failed to prepare Firebase Auth:', e?.message || e);
  }

  // 3. Connection check
  try {
    const connSnap = await _db.ref('.info/connected').once('value');
    if (!connSnap.val()) {
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
        const s = await _db.ref('.info/connected').once('value');
        if (s.val()) break;
      }
    }
  } catch (_) { /* ignore */ }

  _initialized = true;
  try { window.db = _db; } catch (_) {}
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