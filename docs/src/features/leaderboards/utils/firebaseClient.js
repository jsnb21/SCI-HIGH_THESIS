// Firebase client for Leaderboards
// Provides initFirebase, ensureFirebaseReady, and getDb utilities.

let _db = null;
let _initialized = false;
let _initPromise = null;

async function _doInitialize() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK not loaded');
  }

  // Try site-wide config helper if present
  if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') {
    await window.firebaseConfig.initializeFirebase();
  } else if (firebase.apps.length === 0) {
    // Minimal public config fallback
    const publicConfig = {
      authDomain: 'sci-high-website.firebaseapp.com',
      databaseURL: 'https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app',
      projectId: 'sci-high-website',
      storageBucket: 'sci-high-website.appspot.com'
    };
    try {
      firebase.initializeApp(publicConfig);
      console.warn('[firebaseClient] Initialized with minimal config. Some features may be limited.');
    } catch (err) {
      console.error('[firebaseClient] Failed to initialize Firebase with minimal config:', err);
      throw err;
    }
  }

  _db = firebase.database();
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
