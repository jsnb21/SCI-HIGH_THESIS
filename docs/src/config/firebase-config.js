// Firebase Configuration Manager (idempotent, can be loaded from src/config or config)
(function () {
  'use strict';

  if (typeof window !== 'undefined' && window.firebaseConfig) {
    return; // already defined
  }

  class FirebaseConfig {
    constructor() {
      this.config = null;
      this.initialized = false;
    }

    async loadConfig() {
      // 0) Prefer injected runtime globals if present (set by CI or inline script)
      try {
        const injected = (window && (window.SCI_HIGH && window.SCI_HIGH.FIREBASE)) || (window && window.env && window.env.FIREBASE);
        if (injected && typeof injected === 'object') {
          const raw = injected;
          const normalized = Object.create(null);
          Object.keys(raw).forEach((k) => {
            normalized[k.toLowerCase()] = raw[k];
          });
          const apiKey = raw.apiKey || raw.FIREBASE_API_KEY || normalized['apikey'] || normalized['firebase_api_key'];
          if (apiKey) {
            const cfg = {
              apiKey,
              authDomain: raw.authDomain || raw.FIREBASE_AUTH_DOMAIN || normalized['firebase_auth_domain'] || 'sci-high-website.firebaseapp.com',
              databaseURL: raw.databaseURL || raw.FIREBASE_DATABASE_URL || normalized['firebase_database_url'] || 'https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app',
              projectId: raw.projectId || raw.FIREBASE_PROJECT_ID || normalized['firebase_project_id'] || 'sci-high-website',
              storageBucket: raw.storageBucket || raw.FIREBASE_STORAGE_BUCKET || normalized['firebase_storage_bucket'] || 'sci-high-website.appspot.com',
              messagingSenderId: raw.messagingSenderId || raw.FIREBASE_MESSAGING_SENDER_ID || normalized['firebase_messaging_sender_id'] || '949069635878',
              appId: raw.appId || raw.FIREBASE_APP_ID || normalized['firebase_app_id'] || '1:949069635878:web:dcf4d6e8c4f1b8f8b8e7c2',
            };
            this.config = cfg;
            return this.config;
          }
        }
      } catch {}

      // Candidate paths (include local overrides and base-aware variants)
      const base = window.__APP_BASE__ || '/';
      const candidates = [
        './config/env-config.local.json',
        'config/env-config.local.json',
        base + 'config/env-config.local.json',
        './config/env-config.json',
        'config/env-config.json',
        base + 'config/env-config.json',
      ];

      let lastError = null;
      for (const url of candidates) {
        try {
          const cacheBuster = `?_v=${Date.now()}`; // mitigate aggressive caching/CDN
          const response = await fetch(url + cacheBuster, { cache: 'no-store' });
          if (!response.ok) continue;
          const raw = await response.json();

          const normalized = Object.create(null);
          Object.keys(raw).forEach((k) => {
            normalized[k.toLowerCase()] = raw[k];
          });
          const apiKey = raw.apiKey || raw.FIREBASE_API_KEY || normalized['apikey'] || normalized['firebase_api_key'];
          if (!apiKey) continue;

          const cfg = {
            apiKey,
            authDomain: raw.authDomain || raw.FIREBASE_AUTH_DOMAIN || normalized['firebase_auth_domain'] || 'sci-high-website.firebaseapp.com',
            databaseURL: raw.databaseURL || raw.FIREBASE_DATABASE_URL || normalized['firebase_database_url'] || 'https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app',
            projectId: raw.projectId || raw.FIREBASE_PROJECT_ID || normalized['firebase_project_id'] || 'sci-high-website',
            storageBucket: raw.storageBucket || raw.FIREBASE_STORAGE_BUCKET || normalized['firebase_storage_bucket'] || 'sci-high-website.appspot.com',
            messagingSenderId: raw.messagingSenderId || raw.FIREBASE_MESSAGING_SENDER_ID || normalized['firebase_messaging_sender_id'] || '949069635878',
            appId: raw.appId || raw.FIREBASE_APP_ID || normalized['firebase_app_id'] || '1:949069635878:web:dcf4d6e8c4f1b8f8b8e7c2',
          };

          this.config = cfg;
          if (/EXAMPLE|YOUR-|REPLACE|sample/i.test(apiKey)) {
            console.error('❌ Detected a placeholder Firebase API key in env-config.json.');
            console.error('Update env-config.json with the real Web API Key from Firebase Console.');
            this.config = null; // invalidate
            return null;
          }
          return this.config;
        } catch (err) {
          lastError = err;
        }
      }

      // Developer overrides via query string or localStorage for localhost
      try {
        const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
        const qs = new URLSearchParams(location.search);
        const ls = window.localStorage || { getItem() { return null; } };
        const apiKey = qs.get('FIREBASE_API_KEY') || ls.getItem('FIREBASE_API_KEY') || qs.get('apiKey') || ls.getItem('apiKey');
        const databaseURL = qs.get('FIREBASE_DATABASE_URL') || ls.getItem('FIREBASE_DATABASE_URL') || qs.get('databaseURL') || ls.getItem('databaseURL');
        const projectId = qs.get('FIREBASE_PROJECT_ID') || ls.getItem('FIREBASE_PROJECT_ID') || qs.get('projectId') || ls.getItem('projectId') || 'sci-high-website';
        if (isLocalhost && apiKey) {
          this.config = {
            apiKey,
            authDomain: qs.get('FIREBASE_AUTH_DOMAIN') || ls.getItem('FIREBASE_AUTH_DOMAIN') || 'sci-high-website.firebaseapp.com',
            databaseURL: databaseURL || 'https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app',
            projectId,
            storageBucket: qs.get('FIREBASE_STORAGE_BUCKET') || ls.getItem('FIREBASE_STORAGE_BUCKET') || 'sci-high-website.appspot.com',
            messagingSenderId: qs.get('FIREBASE_MESSAGING_SENDER_ID') || ls.getItem('FIREBASE_MESSAGING_SENDER_ID') || '949069635878',
            appId: qs.get('FIREBASE_APP_ID') || ls.getItem('FIREBASE_APP_ID') || '1:949069635878:web:dcf4d6e8c4f1b8f8b8e7c2',
          };
          console.info('Using localhost Firebase config from query/localStorage.');
          return this.config;
        }
      } catch {}

      if (lastError) {
        console.warn('⚠️ Could not load env-config.json via any candidate path.', lastError);
      } else {
        console.warn('⚠️ env-config.json not found in any candidate path.');
      }
      this.config = null;
      return null;
    }

    async initializeFirebase() {
      if (this.initialized) return;
      const config = await this.loadConfig();
      if (!config) {
        const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
        const baseNow = window.__APP_BASE__ || '/';
        console.error('❌ Firebase API key is required but not configured.');
        console.error('Accepted formats in env-config(.local).json:');
        console.error('  { "apiKey": "YOUR_KEY" }  // preferred');
        console.error('  { "FIREBASE_API_KEY": "YOUR_KEY", "FIREBASE_AUTH_DOMAIN": "...", etc } // legacy supported');
        console.error('Looked in paths: ./config/, config/, ' + baseNow + 'config/');
        if (isLocalhost) {
          console.warn('Running on localhost without Firebase credentials. Proceeding without initialization. Some features will be disabled.');
          return; // allow app to continue locally
        }
        throw new Error('Firebase API key not configured. Add apiKey or FIREBASE_API_KEY to env-config.json');
      }

      try {
        if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
        if (firebase.apps.length === 0) {
          firebase.initializeApp(config);
        }
        this.initialized = true;
      } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        throw error;
      }
    }

    getConfig() { return this.config; }
    isInitialized() { return this.initialized; }
  }

  try { window.firebaseConfig = new FirebaseConfig(); } catch {}
})();