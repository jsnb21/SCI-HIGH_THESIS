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
      try {
        // Try to load from env-config.json
        const response = await fetch('./config/env-config.json');
        if (response.ok) {
          const envConfig = await response.json();
          if (envConfig.apiKey) {
            this.config = {
              apiKey: envConfig.apiKey,
              authDomain: "sci-high-website.firebaseapp.com",
              databaseURL: "https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app",
              projectId: "sci-high-website",
              storageBucket: "sci-high-website.appspot.com",
              messagingSenderId: "949069635878",
              appId: "1:949069635878:web:dcf4d6e8c4f1b8f8b8e7c2"
            };
            console.log('✅ Firebase configuration loaded from env-config.json');
            return this.config;
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not load API key config file. Manual entry will be required.');
      }

      // If no config found, config will remain null
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
        console.error('Please add your Firebase API key to docs/config/env-config.json');
        console.error('Expected format: { "apiKey": "your-firebase-api-key-here" }');
        throw new Error('Firebase API key not configured. Please add your API key to env-config.json');
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