// Centralized Firebase initialization service
// Resolves config from (priority): injected window.__FIREBASE_CONFIG__ > window.firebaseConfig.config > env-config.local.json > env-config.json
// Avoids scattering API keys or repeated path logic across scenes.
export const firebaseService = {
  _initPromise: null,
  _config: null,

  async ensureFirebase() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      await this._loadScriptsIfNeeded();
      if (!window.firebase) throw new Error('Firebase global not available after script load');
      if (!window.firebase.apps.length) {
        const cfg = await this._resolveConfig();
        if (!cfg || !cfg.apiKey) throw new Error('Firebase config resolution failed');
        window.firebase.initializeApp(cfg);
      }
      return window.firebase;
    })();
    return this._initPromise;
  },

  async getDatabase() {
    await this.ensureFirebase();
    if (!window.firebase.database) throw new Error('Firebase Realtime Database not available');
    return window.firebase.database();
  },

  async _loadScriptsIfNeeded() {
    if (typeof window.firebase !== 'undefined') return;
    const scripts = [
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'
    ];
    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load Firebase script: ${src}`));
        document.head.appendChild(s);
      });
    }
  },

  async _resolveConfig() {
    if (this._config) return this._config;
    // 1. Injected global (CI/CD)
    if (window.__FIREBASE_CONFIG__) {
      this._config = window.__FIREBASE_CONFIG__;
      return this._config;
    }
    // 1b. Deployment script using window.SCI_HIGH.FIREBASE (alternate injection pattern)
    if (window.SCI_HIGH && window.SCI_HIGH.FIREBASE) {
      this._config = window.SCI_HIGH.FIREBASE;
      return this._config;
    }
    // 2. Existing firebaseConfig object pattern
    if (window.firebaseConfig && window.firebaseConfig.config) {
      this._config = window.firebaseConfig.config;
      return this._config;
    }
    // 3. Fetch env-config files (local override first)
    const base = (window.__APP_BASE__ || '/');
    const cacheBuster = `?_v=${Date.now()}`;
    const paths = [base + 'config/env-config.local.json', base + 'config/env-config.json'];
    for (const p of paths) {
      try {
        const res = await fetch(p + cacheBuster, { cache: 'no-store' });
        if (!res.ok) continue;
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
        if (cfg.apiKey && (cfg.databaseURL || cfg.projectId)) {
          this._config = cfg;
          console.info(`[firebaseService] Loaded Firebase config from ${p}`);
          return this._config;
        }
      } catch (_) { /* try next */ }
    }
    throw new Error('No Firebase configuration found (inject window.__FIREBASE_CONFIG__ or provide env-config.json)');
  }
};

// Convenience named exports
export async function ensureFirebaseApp() { return firebaseService.ensureFirebase(); }
export async function getFirebaseDatabase() { return firebaseService.getDatabase(); }