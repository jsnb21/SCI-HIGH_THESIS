// Firebase-backed authentication manager. Browser storage is a cache, never an authority.
(function () {
  const STUDENT_ID_PATTERN = /^[0-9]{2}-[0-9]{4}-[0-9]{3}$/;
  const STUDENT_AUTH_DOMAIN = 'students.sci-high.invalid';
  const PRIVILEGED_ROLES = new Set(['admin', 'professor']);

  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.userType = null;
      this.firebaseInitialized = false;
      this.sessionVerified = false;
      this._readyResolve = null;
      this.ready = new Promise(resolve => { this._readyResolve = resolve; });
      window.authReadyPromise = this.ready;
      window.awaitAuthReady = () => this.ready;
      this.firebaseInitPromise = this.initializeAuth();
    }

    async initializeAuth() {
      try {
        await this.loadFirebase();
        this.firebaseInitialized = true;
        const firebaseUser = await this.waitForInitialAuthState();

        if (firebaseUser && !firebaseUser.isAnonymous) {
          try {
            await this.establishVerifiedSession(firebaseUser, true);
          } catch (error) {
            console.warn('[AuthManager] Existing Firebase session rejected:', error.message);
            await firebase.auth().signOut().catch(() => {});
            this.clearSession();
          }
        } else {
          if (firebaseUser?.isAnonymous) await firebase.auth().signOut().catch(() => {});
          this.clearSession();
        }

        this.finishInitialization({ success: true, user: this.currentUser, userType: this.userType });
      } catch (error) {
        console.error('[AuthManager] Initialization failed:', error);
        this.firebaseInitialized = false;
        this.clearSession();
        this.finishInitialization({ success: false, error: error?.message || 'Authentication initialization failed' });
      }
    }

    finishInitialization(detail) {
      this.updateProfessorTabVisibility();
      this.updateUserInterface();
      try {
        this._readyResolve?.(detail);
        window.dispatchEvent(new CustomEvent('sci-high-auth-ready', { detail }));
      } catch (_) {}
    }

    async loadFirebase() {
      if (typeof firebase === 'undefined' || !firebase?.apps?.length) {
        const { ensureFirebaseApp } = await import('../../../src/services/firebaseInit.js');
        await ensureFirebaseApp();
      }
      await this.ensureFirebaseReady();
      return true;
    }

    async initializeFirebaseWithConfig() {
      return this.loadFirebase();
    }

    async ensureFirebaseReady() {
      let attempts = 0;
      while ((typeof firebase === 'undefined' || !firebase.auth || !firebase.database) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts += 1;
      }
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.database) {
        throw new Error('Firebase Authentication or Realtime Database is unavailable');
      }
    }

    waitForInitialAuthState(timeoutMs = 8000) {
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          unsubscribe();
          reject(new Error('Timed out while restoring Firebase authentication'));
        }, timeoutMs);
        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          unsubscribe();
          resolve(user || null);
        }, error => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          unsubscribe();
          reject(error);
        });
      });
    }

    async ensureAuthenticated() {
      await this.firebaseInitPromise;
      const user = firebase.auth().currentUser;
      if (!user || user.isAnonymous) throw new Error('A verified Firebase account is required');
      if (!this.sessionVerified || !this.currentUser || this.currentUser.uid !== user.uid) {
        await this.establishVerifiedSession(user, true);
      }
      return user;
    }

    getClaimedRole(claims) {
      const role = typeof claims?.role === 'string' ? claims.role.toLowerCase() : '';
      if (PRIVILEGED_ROLES.has(role)) return role;
      if (claims?.admin === true) return 'admin';
      if (claims?.professor === true) return 'professor';
      return null;
    }

    async establishVerifiedSession(firebaseUser, forceRefresh = false) {
      if (!firebaseUser || firebaseUser.isAnonymous) throw new Error('Anonymous accounts cannot establish a saved session');

      const tokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
      const claimedRole = this.getClaimedRole(tokenResult.claims);
      let type = claimedRole;
      let profile = null;

      if (claimedRole) {
        const snapshot = await firebase.database().ref(`professors/${firebaseUser.uid}`).once('value');
        profile = snapshot.exists() ? snapshot.val() : {};
      } else {
        const studentSnapshot = await firebase.database().ref(`students/${firebaseUser.uid}`).once('value');
        if (studentSnapshot.exists()) {
          type = 'student';
          profile = studentSnapshot.val();
        } else {
          const generalSnapshot = await firebase.database().ref(`general_users/${firebaseUser.uid}`).once('value');
          if (generalSnapshot.exists()) {
            type = 'general';
            profile = generalSnapshot.val();
          }
        }
      }

      if (!type || !profile) throw new Error('Authenticated account has no authorized application profile');

      this.currentUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        studentId: type === 'student' ? profile.studentId : undefined,
        type,
        profile
      };
      this.userType = type;
      this.sessionVerified = true;
      this.cacheVerifiedSession();
      this.updateProfessorTabVisibility();
      this.updateUserInterface();
      return this.currentUser;
    }

    cacheVerifiedSession() {
      localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
      localStorage.setItem('sci_high_user_type', this.userType);
      sessionStorage.setItem('sci_high_session_uid', this.currentUser.uid);
      sessionStorage.removeItem('sci_high_guest');
      sessionStorage.removeItem('sci_high_authenticated');
      sessionStorage.removeItem('sci_high_user_type');
    }

    clearSession() {
      this.currentUser = null;
      this.userType = null;
      this.sessionVerified = false;
      localStorage.removeItem('sci_high_user');
      localStorage.removeItem('sci_high_user_type');
      sessionStorage.removeItem('sci_high_session_uid');
      sessionStorage.removeItem('sci_high_authenticated');
      sessionStorage.removeItem('sci_high_user_type');
    }

    studentIdToAuthEmail(studentId) {
      const normalized = String(studentId || '').trim();
      if (!STUDENT_ID_PATTERN.test(normalized)) throw new Error('Invalid student ID format');
      return `${normalized.replace(/-/g, '.')}@${STUDENT_AUTH_DOMAIN}`.toLowerCase();
    }

    async signOutBeforeLogin() {
      await this.firebaseInitPromise;
      if (firebase.auth().currentUser) await firebase.auth().signOut();
      this.clearSession();
    }

    async loginProfessor(email, password) {
      try {
        await this.signOutBeforeLogin();
        const credential = await firebase.auth().signInWithEmailAndPassword(String(email || '').trim(), password || '');
        const tokenResult = await credential.user.getIdTokenResult(true);
        const role = this.getClaimedRole(tokenResult.claims);
        if (!PRIVILEGED_ROLES.has(role)) throw new Error('This account has no server-issued professor or administrator role');
        const user = await this.establishVerifiedSession(credential.user, false);
        return { success: true, user };
      } catch (error) {
        await firebase.auth().signOut().catch(() => {});
        this.clearSession();
        return { success: false, error: error?.message || 'Professor login failed' };
      }
    }

    async loginStudent(studentId, password) {
      try {
        await this.signOutBeforeLogin();
        const email = this.studentIdToAuthEmail(studentId);
        const credential = await firebase.auth().signInWithEmailAndPassword(email, password || '');
        const snapshot = await firebase.database().ref(`students/${credential.user.uid}`).once('value');
        if (!snapshot.exists() || snapshot.val()?.studentId !== String(studentId).trim()) {
          throw new Error('Student profile does not match the authenticated account');
        }
        const user = await this.establishVerifiedSession(credential.user, false);
        if (user.type !== 'student') throw new Error('Authenticated account is not a student');
        await firebase.database().ref(`students/${credential.user.uid}`).update({
          lastLogin: firebase.database.ServerValue.TIMESTAMP,
          'progress/lastActivity': firebase.database.ServerValue.TIMESTAMP
        });
        return { success: true, user };
      } catch (error) {
        await firebase.auth().signOut().catch(() => {});
        this.clearSession();
        return { success: false, error: error?.message || 'Student login failed' };
      }
    }

    async loginStudentWithProfile() {
      // Public self-registration would let a visitor claim another student's identifier.
      return { success: false, error: 'Student self-registration is disabled. Ask an administrator to provision your account.' };
    }

    async getStudentProfile(studentId) {
      // Do not expose account existence or student details before authentication.
      this.studentIdToAuthEmail(studentId);
      return null;
    }

    async setStudentPassword(studentId, newPassword) {
      try {
        const user = await this.ensureAuthenticated();
        if (this.userType !== 'student' || this.currentUser?.studentId !== String(studentId || '').trim()) {
          throw new Error('Students may change only their own password');
        }
        if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
        await user.updatePassword(newPassword);
        return { success: true };
      } catch (error) {
        return { success: false, error: error?.message || 'Password update failed' };
      }
    }

    async requestPasswordReset() {
      return { success: false, error: 'Student-ID password recovery is temporarily disabled until the trusted reset service is deployed. Contact your administrator.' };
    }

    async resetPasswordWithCode() {
      return { success: false, error: 'Legacy reset codes are disabled. Contact your administrator for account recovery.' };
    }

    async loginGeneral(email, password) {
      try {
        await this.signOutBeforeLogin();
        const credential = await firebase.auth().signInWithEmailAndPassword(String(email || '').trim(), password || '');
        const tokenResult = await credential.user.getIdTokenResult(true);
        if (this.getClaimedRole(tokenResult.claims)) throw new Error('Privileged accounts must use the professor portal');
        const user = await this.establishVerifiedSession(credential.user, false);
        if (user.type !== 'general') throw new Error('Authenticated account is not a personal account');
        await firebase.database().ref(`general_users/${credential.user.uid}`).update({ lastLogin: firebase.database.ServerValue.TIMESTAMP });
        return { success: true, user };
      } catch (error) {
        await firebase.auth().signOut().catch(() => {});
        this.clearSession();
        return { success: false, error: error?.message || 'Login failed' };
      }
    }

    async registerGeneral(formData) {
      let createdUser = null;
      try {
        if (!formData?.password || formData.password.length < 8) throw new Error('Password must be at least 8 characters');
        await this.signOutBeforeLogin();
        const email = String(formData.email || '').trim().toLowerCase();
        const credential = await firebase.auth().createUserWithEmailAndPassword(email, formData.password);
        createdUser = credential.user;
        const now = firebase.database.ServerValue.TIMESTAMP;
        const profile = {
          fullName: String(formData.fullName || '').trim(),
          email,
          department: String(formData.department || 'General').trim(),
          year: String(formData.year || 'None').trim(),
          accountType: 'general',
          ownerUid: createdUser.uid,
          createdAt: now,
          lastLogin: now,
          gameData: { totalPoints: 0, achievements: [], currentLevel: 1, courseProgress: {} }
        };
        await firebase.database().ref(`general_users/${createdUser.uid}`).set(profile);
        const user = await this.establishVerifiedSession(createdUser, true);
        return { success: true, user };
      } catch (error) {
        if (createdUser) await createdUser.delete().catch(() => {});
        await firebase.auth().signOut().catch(() => {});
        this.clearSession();
        return { success: false, error: error?.message || 'Registration failed' };
      }
    }

    createGuestSession() {
      this.clearSession();
      this.currentUser = { uid: `guest_${Date.now()}`, type: 'guest', profile: { fullName: 'Guest Player', isGuest: true } };
      this.userType = 'guest';
      sessionStorage.setItem('sci_high_guest', 'true');
      localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
      localStorage.setItem('sci_high_user_type', 'guest');
      this.updateProfessorTabVisibility();
      this.updateUserInterface();
      return this.currentUser;
    }

    // Compatibility methods now fail closed instead of creating authenticated offline identities.
    async loginStudentOffline() { return { success: false, error: 'Offline student authentication is disabled. Use Guest mode when offline.' }; }
    async loginStudentOfflineWithProfile() { return { success: false, error: 'Offline student registration is disabled. Use Guest mode when offline.' }; }
    async loginGeneralOffline() { return { success: false, error: 'Offline personal-account authentication is disabled. Use Guest mode when offline.' }; }

    isAuthenticated() {
      const firebaseUser = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth().currentUser : null;
      return Boolean(this.sessionVerified && firebaseUser && !firebaseUser.isAnonymous && this.currentUser?.uid === firebaseUser.uid);
    }

    async redirectToGame() {
      if (this.userType === 'guest' && sessionStorage.getItem('sci_high_guest') === 'true') {
        window.location.href = 'game.html';
        return;
      }
      try {
        await this.ensureAuthenticated();
        window.location.href = 'game.html';
      } catch (error) {
        this.clearSession();
        window.showError?.(error.message || 'Please sign in again.');
      }
    }

    async logout() {
      try {
        if (typeof firebase !== 'undefined' && firebase.auth?.().currentUser) await firebase.auth().signOut();
      } catch (error) {
        console.warn('Firebase sign-out failed:', error.message);
      } finally {
        this.clearSession();
        sessionStorage.removeItem('sci_high_guest');
        this.updateProfessorTabVisibility();
        this.updateUserInterface();
      }
    }

    updateProfessorTabVisibility() {
      const allowed = this.sessionVerified && PRIVILEGED_ROLES.has(this.userType);
      document.getElementById('professor-nav-link')?.classList.toggle('hidden', !allowed);
      document.getElementById('mobile-professor-nav-link')?.classList.toggle('hidden', !allowed);
    }

    updateUserInterface() {
      const greeting = document.getElementById('user-greeting');
      const greetingText = document.getElementById('greeting-text');
      const logoutBtn = document.getElementById('logout-btn');
      const loginBtn = document.getElementById('login-btn');
      const settingsBtn = document.getElementById('settings-btn');
      const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
      const hasSession = this.sessionVerified || this.userType === 'guest';

      greeting?.classList.toggle('hidden', !hasSession);
      logoutBtn?.classList.toggle('hidden', !hasSession);
      loginBtn?.classList.toggle('hidden', hasSession);
      settingsBtn?.classList.toggle('hidden', !this.sessionVerified);
      mobileSettingsBtn?.classList.toggle('hidden', !this.sessionVerified);

      if (greetingText && hasSession) {
        const name = this.currentUser?.profile?.fullName || this.currentUser?.studentId || 'Player';
        const prefix = this.userType === 'professor' ? 'Prof. ' : this.userType === 'admin' ? 'Admin ' : '';
        greetingText.textContent = `Hello, ${prefix}${name}!`;
      }
    }
  }

  window.authManager = new AuthManager();
})();
