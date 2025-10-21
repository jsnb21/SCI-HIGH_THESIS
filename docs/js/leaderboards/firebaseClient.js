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

  // If still no app, fallback to known public config used by leaderboard service
  if (firebase.apps.length === 0) {
    const fallbackConfig = {
      apiKey: 'AIzaSyD-Q2woACHgMCTVwd6aX-IUzLovE0ux-28',
      authDomain: 'sci-high-website.firebaseapp.com',
      databaseURL: 'https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app',
      projectId: 'sci-high-website',
      storageBucket: 'sci-high-website.appspot.com',
      messagingSenderId: '451463202515',
      appId: '1:451463202515:web:e7f9c7bf69c04c685ef626'
    };
    try {
      firebase.initializeApp(fallbackConfig);
      console.info('[firebaseClient] Initialized with leaderboard fallback config.');
    } catch (err) {
      console.error('[firebaseClient] Failed to initialize Firebase with fallback config:', err);
      throw err;
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
