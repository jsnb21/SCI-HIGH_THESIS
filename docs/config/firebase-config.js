// Firebase Configuration Manager
(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.firebaseConfig) {
    console.log('Firebase config already loaded');
    return;
  }

  class FirebaseConfig {
    constructor() {
      this.config = null;
      this.initialized = false;
    }

    async loadConfig() {
      // Candidate paths (attempt both relative & base-prefixed for GitHub Pages deployments)
      const candidates = [
        './config/env-config.json',
        'config/env-config.json',
        `${window.__APP_BASE__ || '/SCI-HIGH_THESIS/' }config/env-config.json`,
        '/SCI-HIGH_THESIS/config/env-config.json'
      ];

      let lastError = null;
      for (const url of candidates) {
        try {
          const cacheBuster = `?_v=${Date.now()}`; // mitigate aggressive static caching/CDN
          const response = await fetch(url + cacheBuster, { cache: 'no-store' });
          if (!response.ok) {
            continue; // try next path silently
          }
          const raw = await response.json();

          // Accept multiple naming conventions: new (apiKey) or legacy (FIREBASE_API_KEY)
            // Map keys in a case-insensitive manner
          const normalized = Object.create(null);
          Object.keys(raw).forEach(k => {
            normalized[k.toLowerCase()] = raw[k];
          });

          const apiKey = raw.apiKey || raw.FIREBASE_API_KEY || normalized['apikey'] || normalized['firebase_api_key'];

          if (!apiKey) {
            // Continue trying other paths – maybe another file has correct shape
            continue;
          }

          // Build final config pulling either camelCase or FIREBASE_* vars, falling back to known project defaults
          const cfg = {
            apiKey,
            authDomain: raw.authDomain || raw.FIREBASE_AUTH_DOMAIN || normalized['firebase_auth_domain'] || 'sci-high-website.firebaseapp.com',
            databaseURL: raw.databaseURL || raw.FIREBASE_DATABASE_URL || normalized['firebase_database_url'] || 'https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app',
            projectId: raw.projectId || raw.FIREBASE_PROJECT_ID || normalized['firebase_project_id'] || 'sci-high-website',
            storageBucket: raw.storageBucket || raw.FIREBASE_STORAGE_BUCKET || normalized['firebase_storage_bucket'] || 'sci-high-website.appspot.com',
            messagingSenderId: raw.messagingSenderId || raw.FIREBASE_MESSAGING_SENDER_ID || normalized['firebase_messaging_sender_id'] || '949069635878',
            appId: raw.appId || raw.FIREBASE_APP_ID || normalized['firebase_app_id'] || '1:949069635878:web:dcf4d6e8c4f1b8f8b8e7c2'
          };

          this.config = cfg;
          const masked = apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
          console.log(`✅ Firebase configuration loaded from ${url} (apiKey: ${masked})`);
          // Detect obviously placeholder / example keys so we fail fast with guidance
          if (/EXAMPLE|YOUR-|REPLACE|sample/i.test(apiKey)) {
            console.error('❌ Detected a placeholder Firebase API key in env-config.json.');
            console.error('Update env-config.json with the real Web API Key from: Firebase Console > Project Settings > General > Your apps (Web) > SDK setup and configuration.');
            this.config = null; // invalidate
            return null;
          }
          return this.config;
        } catch (err) {
          lastError = err;
          // try next candidate
        }
      }

      if (lastError) {
        console.warn('⚠️ Could not load env-config.json via any candidate path.', lastError);
      } else {
        console.warn('⚠️ env-config.json not found in any candidate path.');
      }

      this.config = null;
      return null;
    }

    async initializeFirebase() {
      if (this.initialized) {
        console.log('Firebase already initialized');
        return;
      }

      const config = await this.loadConfig();
      
      if (!config) {
        console.error('❌ Firebase API key is required but not configured.');
        console.error('Accepted formats in env-config.json:');
        console.error('  { "apiKey": "YOUR_KEY" }  // preferred');
        console.error('  { "FIREBASE_API_KEY": "YOUR_KEY", "FIREBASE_AUTH_DOMAIN": "...", etc } // legacy supported');
        console.error('Looked in paths: ./config/, config/, /SCI-HIGH_THESIS/config/');
        throw new Error('Firebase API key not configured. Add apiKey or FIREBASE_API_KEY to env-config.json');
      }

      try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
          throw new Error('Firebase SDK not loaded');
        }

        // Initialize Firebase app if not already initialized
        if (firebase.apps.length === 0) {
          firebase.initializeApp(config);
          console.log('✅ Firebase initialized successfully');
        } else {
          console.log('✅ Firebase app already exists');
        }

        this.initialized = true;
      } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        throw error;
      }
    }

    getConfig() {
      return this.config;
    }

    isInitialized() {
      return this.initialized;
    }
  }

  // Create global instance
  window.firebaseConfig = new FirebaseConfig();

})();