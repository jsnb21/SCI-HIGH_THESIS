// Firebase Configuration
// This file manages Firebase configuration and API keys

class FirebaseConfig {
    constructor() {
        this.config = null;
        this.loadConfig();
    }

    // Load configuration from environment or external file
    async loadConfig() {
        try {
            // Try to load from external config file first
            const response = await fetch('./config/env-config.json');
            if (response.ok) {
                const envConfig = await response.json();
                this.config = {
                    apiKey: envConfig.FIREBASE_API_KEY,
                    authDomain: envConfig.FIREBASE_AUTH_DOMAIN || "sci-high-website.firebaseapp.com",
                    databaseURL: envConfig.FIREBASE_DATABASE_URL || "https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app",
                    projectId: envConfig.FIREBASE_PROJECT_ID || "sci-high-website",
                    storageBucket: envConfig.FIREBASE_STORAGE_BUCKET || "sci-high-website.appspot.com",
                    messagingSenderId: envConfig.FIREBASE_MESSAGING_SENDER_ID || "123456789",
                    appId: envConfig.FIREBASE_APP_ID || "1:123456789:web:abcdef"
                };
                return;
            }
        } catch (error) {
            console.warn('Could not load external config file, falling back to defaults');
        }

        // Fallback configuration (you should replace these with your actual values)
        this.config = {
            apiKey: this.getApiKeyFromEnv() || "YOUR_API_KEY_HERE",
            authDomain: "sci-high-website.firebaseapp.com",
            databaseURL: "https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "sci-high-website",
            storageBucket: "sci-high-website.appspot.com",
            messagingSenderId: "123456789",
            appId: "1:123456789:web:abcdef"
        };
    }

    // Try to get API key from various sources
    getApiKeyFromEnv() {
        // In a browser environment, check for global variables
        if (typeof window !== 'undefined') {
            return window.FIREBASE_API_KEY || 
                   localStorage.getItem('firebase_api_key') ||
                   sessionStorage.getItem('firebase_api_key');
        }
        
        // For Node.js environments
        if (typeof process !== 'undefined' && process.env) {
            return process.env.FIREBASE_API_KEY;
        }
        
        return null;
    }

    // Get the Firebase configuration
    getConfig() {
        if (!this.config) {
            throw new Error('Firebase configuration not loaded. Please ensure API keys are properly configured.');
        }
        
        if (this.config.apiKey === "YOUR_API_KEY_HERE") {
            console.error('Firebase API key not configured. Please set up your API key in the configuration.');
        }
        
        return this.config;
    }

    // Initialize Firebase with the configuration
    async initializeFirebase() {
        await this.loadConfig();
        
        if (typeof firebase !== 'undefined') {
            // Check if Firebase is already initialized
            if (firebase.apps.length === 0) {
                firebase.initializeApp(this.getConfig());
            }
            return firebase;
        } else {
            throw new Error('Firebase SDK not loaded');
        }
    }

    // Set API key at runtime (for development/testing)
    setApiKey(apiKey) {
        if (this.config) {
            this.config.apiKey = apiKey;
            // Optionally store in localStorage for persistence
            if (typeof window !== 'undefined') {
                localStorage.setItem('firebase_api_key', apiKey);
            }
        }
    }
}

// Create a singleton instance
const firebaseConfig = new FirebaseConfig();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
} else if (typeof window !== 'undefined') {
    window.firebaseConfig = firebaseConfig;
}