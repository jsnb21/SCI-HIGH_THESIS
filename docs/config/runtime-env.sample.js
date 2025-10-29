// Runtime environment injected at deploy-time (e.g., GitHub Actions)
// Copy this to `runtime-env.js` during deployment and fill values from secrets.
// This file is intentionally a sample and should not contain real keys in the repo.

window.SCI_HIGH = window.SCI_HIGH || {};
window.SCI_HIGH.FIREBASE = {
  // Examples (replace in CI):
  // apiKey: process.env.FIREBASE_API_KEY,
  // authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  // databaseURL: process.env.FIREBASE_DATABASE_URL,
  // projectId: process.env.FIREBASE_PROJECT_ID,
  // storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  // messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  // appId: process.env.FIREBASE_APP_ID
};
