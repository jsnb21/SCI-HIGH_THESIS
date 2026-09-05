// Shared Firebase session guard for game services.
import { ensureFirebaseApp } from './firebaseInit.js';

class AuthService {
  constructor() {
    this.auth = null;
    this.database = null;
    this.isFirebaseInitialized = false;
  }

  async ensureFirebaseInitialized() {
    try {
      await ensureFirebaseApp();
      if (!window.firebase?.auth || !window.firebase?.database) {
        throw new Error('Firebase Authentication or Realtime Database is unavailable');
      }
      this.auth = window.firebase.auth();
      this.database = window.firebase.database();
      this.isFirebaseInitialized = true;
      return true;
    } catch (error) {
      this.isFirebaseInitialized = false;
      console.error('Firebase initialization failed:', error);
      return false;
    }
  }

  async ensureAuthenticated() {
    if (!this.isFirebaseInitialized) {
      const ready = await this.ensureFirebaseInitialized();
      if (!ready) throw new Error('Firebase is unavailable');
    }
    const user = this.auth.currentUser;
    if (!user || user.isAnonymous) throw new Error('A verified Firebase account is required');
    await user.getIdToken(false);
    return user;
  }

  getCurrentUser() {
    const user = this.auth?.currentUser || null;
    return user && !user.isAnonymous ? user : null;
  }

  async logout() {
    if (this.auth?.currentUser) await this.auth.signOut();
  }
}

const authService = new AuthService();
export default authService;
