// AuthManager and related global helpers
(function(){
  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.userType = null;
      this.firebaseInitialized = false;
      this.firebaseInitPromise = this.initializeAuth();
      // Ready gate so pages can wait before enabling UI
      this._readyResolve = null;
      this.ready = new Promise((res)=>{ this._readyResolve = res; });
      window.authReadyPromise = this.ready;
      window.awaitAuthReady = () => (window.authReadyPromise || Promise.resolve());
      // Password hashing defaults
      this.pwdIterations = 100000;
      this.pwdSaltBytes = 16;
      this.resetCodeIterations = 100000;
      this.resetCodeSaltBytes = 16;
    }

    async initializeAuth() {
      try {
        if (typeof firebase === 'undefined') {
          await this.loadFirebase();
        }
        await this.ensureFirebaseReady();
        const savedUser = localStorage.getItem('sci_high_user');
        if (savedUser) {
          this.currentUser = JSON.parse(savedUser);
          this.userType = this.currentUser.type;
        } else {
          // Fallback: infer session from leaderboard info if available
          try {
            const lbInfoStr = localStorage.getItem('sci_high_player_info');
            if (lbInfoStr) {
              const lbInfo = JSON.parse(lbInfoStr);
              const name = lbInfo.name || lbInfo.playerName || 'Player';
              const studentId = lbInfo.studentId || '';
              const dept = lbInfo.department || 'General';
              const isStudentId = /^[0-9]{2}-[0-9]{4}-[0-9]{3}$/.test(studentId);
              // Create a lightweight, local-only session so Start Game can proceed without prompting
              this.currentUser = {
                uid: 'lb_' + (isStudentId ? studentId.replace(/[^A-Za-z0-9_\-]/g, '_') : (name || 'player').replace(/\s+/g, '_').toLowerCase()),
                type: isStudentId ? 'student' : 'general',
                studentId: isStudentId ? studentId : undefined,
                profile: {
                  fullName: name,
                  department: dept,
                  isLocalDerived: true
                }
              };
              this.userType = this.currentUser.type;
            }
          } catch (_) { /* ignore */ }
        }
        this.updateProfessorTabVisibility();
        this.updateUserInterface();
        this.maybeShowWelcomeBack();
        this.firebaseInitialized = true;
        try {
          this._readyResolve && this._readyResolve({ success: true, user: this.currentUser, userType: this.userType });
          window.dispatchEvent(new CustomEvent('sci-high-auth-ready', { detail: { user: this.currentUser, userType: this.userType } }));
        } catch(_) {}
      } catch (error) {
        console.error('❌ AuthManager initialization failed:', error);
        this.firebaseInitialized = false;
        try {
          this._readyResolve && this._readyResolve({ success: false, error: error?.message || 'init failed' });
          window.dispatchEvent(new CustomEvent('sci-high-auth-ready', { detail: { success: false, error: error?.message || 'init failed' } }));
        } catch(_) {}
      }
    }

    maybeShowWelcomeBack() {
      try {
        if (sessionStorage.getItem('wb_shown') === '1') return;
        if (!this.currentUser || this.userType === 'guest') return;
        let name = 'Player';
        if (this.userType === 'student') name = this.currentUser?.profile?.fullName || this.currentUser?.name || this.currentUser?.studentId || 'Student';
        else if (this.userType === 'professor') name = `Prof. ${this.currentUser?.profile?.fullName || this.currentUser?.name || 'Professor'}`;
        else if (this.userType === 'admin') name = `Admin ${this.currentUser?.profile?.fullName || this.currentUser?.name || 'Admin'}`;
        else if (this.userType === 'general') name = this.currentUser?.profile?.fullName || this.currentUser?.email || 'Player';
        const message = `Welcome back, ${name}!`;
        if (typeof window.showToast === 'function') window.showToast(message, { type: 'success', duration: 3500 });
        else if (typeof window.showSuccess === 'function') window.showSuccess(message, { title: '👋 Welcome Back' });
        else if (typeof window.alert === 'function') alert(message);
        sessionStorage.setItem('wb_shown', '1');
      } catch (e) { console.debug('[welcome-back] toast skipped:', e?.message); }
    }

    async ensureFirebaseReady() {
      let attempts = 0;
      while (typeof firebase === 'undefined' && attempts < 50) { await new Promise(r=>setTimeout(r,100)); attempts++; }
      if (typeof firebase === 'undefined') throw new Error('Firebase failed to load after 5 seconds');
      attempts = 0;
      while ((!firebase.auth || typeof firebase.auth !== 'function') && attempts < 50) { await new Promise(r=>setTimeout(r,100)); attempts++; }
      if (!firebase.auth || typeof firebase.auth !== 'function') throw new Error('Firebase Auth failed to load after 5 seconds');
    }

    async ensureAuthenticated() {
      try {
        if (!this.firebaseInitialized) await this.firebaseInitPromise;
        if (typeof firebase === 'undefined' || !firebase.auth) throw new Error('Firebase or Firebase Auth not available');
        if (!firebase.auth().currentUser) { await firebase.auth().signInAnonymously(); }
        return true;
      } catch (error) {
        console.error('❌ Authentication failed:', error);
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }

    async testFirebaseConnection() {
      try {
        if (typeof firebase === 'undefined') throw new Error('Firebase not loaded');
        if (!firebase.auth) throw new Error('Firebase Auth not available');
        await this.ensureAuthenticated();
        if (firebase.database) {
          try {
            await firebase.database().ref('test/connection').set({ timestamp: new Date().toISOString(), test: true });
            await firebase.database().ref('test/connection').once('value');
          } catch (dbError) { console.warn('❌ Realtime Database test failed:', dbError); }
        }
        if (firebase.firestore) {
          try {
            const testDoc = await firebase.firestore().collection('test').doc('connection').get();
            await firebase.firestore().collection('test').doc('connection').set({ timestamp: new Date().toISOString(), test: true });
          } catch (firestoreError) { console.warn('❌ Firestore test failed (likely security rules):', firestoreError); }
        }
        return { success: true };
      } catch (error) {
        console.error('Firebase connection test failed:', error);
        return { success: false, error: error.message };
      }
    }

    async loadFirebase() {
      return new Promise(async (resolve, reject) => {
        if (typeof firebase !== 'undefined') { resolve(); return; }
        const scripts = [
          'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
          'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js',
          'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'
        ];
        let loaded = 0;
        scripts.forEach(src => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = async () => {
            loaded++;
            if (loaded === scripts.length) {
              try { await this.initializeFirebaseWithConfig(); resolve(); } catch (error) { reject(error); }
            }
          };
          script.onerror = () => reject(new Error(`Failed to load Firebase script: ${src}`));
          document.head.appendChild(script);
        });
      });
    }

    async initializeFirebaseWithConfig() {
      try {
        if (window.firebaseConfig) {
          try { await window.firebaseConfig.initializeFirebase(); return true; } catch (error) { console.warn('Firebase config exists but initialization failed:', error.message); return false; }
        }
  const base = (window.__APP_BASE__ || '/');
  const configPaths = ['./config/firebase-config.js', base + 'config/firebase-config.js', 'config/firebase-config.js'];
        for (const configPath of configPaths) {
          try {
            const existingScript = document.querySelector(`script[src*="firebase-config.js"]`);
            if (existingScript) { await new Promise(r=>setTimeout(r,500)); if (window.firebaseConfig) { await window.firebaseConfig.initializeFirebase(); return true; } continue; }
            const script = document.createElement('script');
            script.src = configPath; script.id = 'firebase-config-script';
            await new Promise((resolve, reject) => {
              script.onload = () => { setTimeout(() => { if (window.firebaseConfig) resolve(); else reject(new Error('Config loaded but firebaseConfig not available')); }, 100); };
              script.onerror = reject; document.head.appendChild(script);
            });
            if (window.firebaseConfig) { await window.firebaseConfig.initializeFirebase(); return true; }
          } catch (error) { console.warn(`Failed to load config from ${configPath}:`, error.message); continue; }
        }
        // Fallback 1: try env-config.json
        try {
          const cacheBuster = `?_v=${Date.now()}`;
          const res = await fetch((base + 'config/env-config.json').replace(/\/+$/, '') + cacheBuster, { cache: 'no-store' });
          if (res.ok) {
            const envConfig = await res.json();
            const firebaseConfig = {
              apiKey: envConfig.apiKey || envConfig.FIREBASE_API_KEY,
              authDomain: envConfig.authDomain || envConfig.FIREBASE_AUTH_DOMAIN,
              databaseURL: envConfig.databaseURL || envConfig.FIREBASE_DATABASE_URL,
              projectId: envConfig.projectId || envConfig.FIREBASE_PROJECT_ID,
              storageBucket: envConfig.storageBucket || envConfig.FIREBASE_STORAGE_BUCKET,
              messagingSenderId: envConfig.messagingSenderId || envConfig.FIREBASE_MESSAGING_SENDER_ID,
              appId: envConfig.appId || envConfig.FIREBASE_APP_ID
            };
            if (firebaseConfig.apiKey && (firebaseConfig.databaseURL || firebaseConfig.projectId)) {
              firebase.initializeApp(firebaseConfig);
              return true;
            }
          }
        } catch (e) { console.warn('env-config.json load failed:', e?.message || e); }

        // Fallback 2: known default config (same as leaderboards/professor)
        try {
          const fallbackConfig = {
            apiKey: 'AIzaSyD-Q2woACHgMCTVwd6aX-IUzLovE0ux-28',
            authDomain: 'sci-high-website.firebaseapp.com',
            databaseURL: 'https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app',
            projectId: 'sci-high-website',
            storageBucket: 'sci-high-website.appspot.com',
            messagingSenderId: '451463202515',
            appId: '1:451463202515:web:e7f9c7bf69c04c685ef626'
          };
          firebase.initializeApp(fallbackConfig);
          console.info('[authManager] Initialized with fallback Firebase config.');
          return true;
        } catch (e) {
          console.error('[authManager] Fallback Firebase init failed:', e);
        }

        console.warn('Firebase configuration could not be loaded from any path or fallback');
        return false;
      } catch (error) { console.warn('Firebase initialization failed:', error.message); return false; }
    }

    async loginProfessor(email, password) {
      try {
        if (email === 'professor@sci-high.edu' && password === 'Prof123!') {
          this.currentUser = { uid: 'prof_sample_123', email, type: 'professor', profile: { fullName: 'Dr. Sample Professor', email, institution: 'SCI-HIGH University', isVerified: true } };
          localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
          this.userType = 'professor'; this.updateProfessorTabVisibility(); this.updateUserInterface();
          return { success: true, user: this.currentUser };
        }
        if (typeof firebase !== 'undefined' && firebase.auth) {
          const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
          const user = userCredential.user;
          const professorSnapshot = await firebase.database().ref('professors').child(user.uid).once('value');
          if (!professorSnapshot.exists()) { await firebase.auth().signOut(); throw new Error('Not registered as a professor'); }
          const professorData = professorSnapshot.val();
          await firebase.database().ref('professors').child(user.uid).update({ lastLogin: new Date().toISOString(), lastLoginIP: 'unknown' });
          this.currentUser = { uid: user.uid, email: user.email, type: 'professor', profile: professorData };
          localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
          this.userType = 'professor'; this.updateProfessorTabVisibility(); this.updateUserInterface();
          return { success: true, user: this.currentUser };
        } else { throw new Error('Invalid credentials or Firebase not available'); }
      } catch (error) { return { success: false, error: error.message }; }
    }

    async loginStudent(studentId, password = null) {
      try {
        const sampleStudents = {
          '24-2024-001': { profile: { studentId: '24-2024-001', fullName: 'Juan Dela Cruz', academicInfo: { level: 'college', course: 'BS Computer Science', yearLevel: '3rd Year' }, accountStatus: { isFirstLogin: false, createdBy: 'prof_sample', lastLogin: new Date().toISOString() }, gameData: { totalPoints: 850, courseProgress: { python: { progress: 75, completed: 8, total: 12 }, javascript: { progress: 60, completed: 6, total: 10 } } } } },
          '24-2024-002': { profile: { studentId: '24-2024-002', fullName: 'Maria Santos', academicInfo: { level: 'college', course: 'BS Information Technology', yearLevel: '2nd Year' }, accountStatus: { isFirstLogin: false, createdBy: 'prof_sample', lastLogin: new Date().toISOString() }, gameData: { totalPoints: 1200, courseProgress: { python: { progress: 90, completed: 11, total: 12 }, webdesign: { progress: 85, completed: 9, total: 10 } } } } },
          '24-2024-003': { profile: { studentId: '24-2024-003', fullName: 'Pedro Garcia', academicInfo: { level: 'shs', strand: 'STEM', yearLevel: 'Grade 12' }, accountStatus: { isFirstLogin: true, createdBy: 'prof_sample', lastLogin: null }, gameData: { totalPoints: 300, courseProgress: { python: { progress: 30, completed: 3, total: 12 } } } } }
        };
        if (sampleStudents[studentId]) {
          this.currentUser = { uid: 'stud_' + studentId.replace(/-/g, '_'), studentId, type: 'student', profile: sampleStudents[studentId].profile };
          localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
          this.userType = 'student'; this.updateProfessorTabVisibility(); this.updateUserInterface();
          return { success: true, user: this.currentUser };
        }
        if (typeof firebase !== 'undefined' && firebase.database) {
          await this.ensureAuthenticated();
          const studentsSnapshot = await firebase.database().ref('students').orderByChild('studentId').equalTo(studentId).once('value');
          if (!studentsSnapshot.exists()) {
            // Do not auto-create accounts here anymore; require profile completion flow
            return { success: false, error: `No account found for ${studentId}. Please complete your profile to register.`, needsRegistration: true };
          }
          const studentData = Object.values(studentsSnapshot.val())[0];
          const studentKey = Object.keys(studentsSnapshot.val())[0];

          // Password verification
          try {
            const authSnap = await firebase.database().ref(`students/${studentKey}/auth`).once('value');
            const auth = authSnap.exists() ? authSnap.val() : null;
            if (auth && auth.passwordHash) {
              if (!password) {
                return { success: false, error: 'Password required to login.', code: 'PASSWORD_REQUIRED' };
              }
              const verified = await this.verifyPassword(password, auth);
              if (!verified) {
                return { success: false, error: 'Invalid password. Please try again.' };
              }
            } else {
              // No password set yet for this account
              return { success: false, error: 'This account has no password yet. Please set one to secure your account.', needsPasswordSetup: true };
            }
          } catch (e) {
            console.warn('Password verification error:', e?.message || e);
          }

          let careerStatsData = null;
          try { const careerStatsSnapshot = await firebase.database().ref(`student_career_stats/${studentId}`).once('value'); if (careerStatsSnapshot.exists()) { careerStatsData = careerStatsSnapshot.val(); } } catch {}
          const mergedStudentData = { ...studentData };
          if (careerStatsData) {
            if (careerStatsData.firstName) mergedStudentData.firstName = careerStatsData.firstName;
            if (careerStatsData.lastName) mergedStudentData.lastName = careerStatsData.lastName;
            if (careerStatsData.department) mergedStudentData.department = careerStatsData.department;
            if (careerStatsData.strandYear) mergedStudentData.strandYear = careerStatsData.strandYear;
            if (careerStatsData.firstName && careerStatsData.lastName) mergedStudentData.fullName = `${careerStatsData.firstName} ${careerStatsData.lastName}`;
          }
          await firebase.database().ref('students').child(studentKey).update({ lastLogin: new Date().toISOString(), 'progress/lastActivity': new Date().toISOString() });
          this.currentUser = { uid: studentKey, studentId: studentData.studentId, type: 'student', profile: mergedStudentData };
          localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
          this.userType = 'student'; this.updateProfessorTabVisibility(); this.updateUserInterface();
          return { success: true, user: this.currentUser };
        } else {
          const localStudents = JSON.parse(localStorage.getItem('sci_high_local_students') || '{}');
          const local = localStudents[studentId];
          if (!local) {
            return { success: false, error: 'No local account found. Please register first.', needsRegistration: true };
          }
          // Check offline auth if present
          if (local.auth && local.auth.passwordHash) {
            if (!password) return { success: false, error: 'Password required to login.', code: 'PASSWORD_REQUIRED' };
            const ok = await this.verifyPassword(password, local.auth);
            if (!ok) return { success: false, error: 'Invalid password.' };
          } else {
            return { success: false, error: 'This offline account has no password yet. Please set one during profile completion.', needsPasswordSetup: true };
          }
          this.currentUser = { uid: 'local_' + studentId.replace(/-/g, '_'), studentId, type: 'student', profile: local };
          localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
          this.userType = 'student'; this.updateProfessorTabVisibility();
          return { success: true, user: this.currentUser };
        }
      } catch (error) {
        console.error('Student login error:', error);
        return { success: false, error: error.message };
      }
    }

    async createStudentAccount(studentId) {
      try {
        await this.ensureAuthenticated();
        const existingByIdSnapshot = await firebase.database().ref('students').orderByChild('studentId').equalTo(studentId).once('value');
        if (existingByIdSnapshot.exists()) { throw new Error(`Student account already exists for ID: ${studentId}. Please contact administrator if you cannot access your account.`); }
        const careerStatsSnapshot = await firebase.database().ref('student_career_stats').child(studentId).once('value');
        if (careerStatsSnapshot.exists()) {
          const careerData = careerStatsSnapshot.val();
          console.warn('Career stats exist but no main student record found. Creating main record...');
        }
        const recentStudentsSnapshot = await firebase.database().ref('students')
          .orderByChild('accountStatus/createdAt')
          .startAt(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .once('value');
        if (recentStudentsSnapshot.exists()) {
          const recentStudents = recentStudentsSnapshot.val();
          for (const [key, student] of Object.entries(recentStudents)) {
            if (student.studentId === studentId) {
              throw new Error(`Student account for ID ${studentId} was recently created. Please try logging in instead.`);
            }
          }
        }
        const studentData = {
          studentId,
          fullName: `Student ${studentId}`,
          academicInfo: { level: 'unknown', course: null, yearLevel: null, strand: null },
          accountStatus: { isActive: true, isFirstLogin: true, createdBy: 'auto-created', createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() },
          progress: { completedQuizzes: [], completedStories: [], totalScore: 0, lastActivity: new Date().toISOString() },
          gameData: { totalPoints: 0, achievements: [], currentLevel: 1, courseProgress: { 'Web_Design': { unlocked: true, completed: false, progress: 0 }, 'Python': { unlocked: true, completed: false, progress: 0 }, 'Java': { unlocked: false, completed: false, progress: 0 }, 'C': { unlocked: false, completed: false, progress: 0 }, 'CPlusPlus': { unlocked: false, completed: false, progress: 0 }, 'CSharp': { unlocked: false, completed: false, progress: 0 } } },
          needsProfileCompletion: true,
          accountType: 'student'
        };
        const studentRef = firebase.database().ref('students').child(studentId);
        await studentRef.set(studentData);
        return { success: true, docId: studentId, studentData };
      } catch (error) {
        console.error('Error creating student account:', error);
        return { success: false, error: 'Failed to create student account: ' + error.message };
      }
    }

    createLocalStudentAccount(studentId) {
      return {
        studentId,
        fullName: `Student ${studentId}`,
        academicInfo: { level: 'unknown', course: null, yearLevel: null, strand: null },
        accountStatus: { isActive: true, isFirstLogin: true, createdBy: 'auto-created-local', createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() },
        gameData: { totalPoints: 0, achievements: [], courseProgress: { 'Web_Design': { unlocked: true, completed: false, progress: 0 }, 'Python': { unlocked: true, completed: false, progress: 0 }, 'Java': { unlocked: false, completed: false, progress: 0 }, 'C': { unlocked: false, completed: false, progress: 0 }, 'CPlusPlus': { unlocked: false, completed: false, progress: 0 }, 'CSharp': { unlocked: false, completed: false, progress: 0 } }
        }
      };
    }

    async loginGeneral(email, password) {
      try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const userSnapshot = await firebase.database().ref('general_users').child(user.uid).once('value');
        if (!userSnapshot.exists()) { throw new Error('User profile not found'); }
        const userData = userSnapshot.val();
        await firebase.database().ref('general_users').child(user.uid).update({ lastLogin: new Date().toISOString() });
        this.currentUser = { uid: user.uid, email: user.email, type: 'general', profile: userData };
        localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
        this.userType = 'general'; this.updateProfessorTabVisibility(); this.updateUserInterface();
        return { success: true, user: this.currentUser };
      } catch (error) { return { success: false, error: error.message }; }
    }

    // ===== Password hashing helpers =====
    async generateSalt(bytes = this.pwdSaltBytes) {
      const salt = new Uint8Array(bytes);
      (self.crypto || window.crypto).getRandomValues(salt);
      return salt;
    }

    bytesToBase64(bytes) {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }

    base64ToBytes(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }

    async derivePasswordHash(password, saltBase64 = null, iterations = this.pwdIterations) {
      const enc = new TextEncoder();
      const pwdKey = await (crypto.subtle).importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      const saltBytes = saltBase64 ? this.base64ToBytes(saltBase64) : await this.generateSalt();
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations }, pwdKey, 256);
      const hashBytes = new Uint8Array(bits);
      return {
        passwordHash: this.bytesToBase64(hashBytes),
        salt: this.bytesToBase64(saltBytes),
        iterations,
        algo: 'PBKDF2-SHA-256'
      };
    }

    async verifyPassword(password, stored) {
      try {
        const { passwordHash, salt, iterations } = stored || {};
        if (!passwordHash || !salt || !iterations) return false;
        const derived = await this.derivePasswordHash(password, salt, iterations);
        return derived.passwordHash === passwordHash;
      } catch { return false; }
    }

    async setStudentPassword(studentId, password) {
      try {
        if (!studentId || !password) return { success: false, error: 'Missing studentId or password' };
        if (typeof firebase !== 'undefined' && firebase.database) {
          await this.ensureAuthenticated();
          const studentsSnapshot = await firebase.database().ref('students').orderByChild('studentId').equalTo(studentId).once('value');
          if (!studentsSnapshot.exists()) return { success: false, error: 'Account not found' };
          const studentKey = Object.keys(studentsSnapshot.val())[0];
          const auth = await this.derivePasswordHash(password);
          await firebase.database().ref(`students/${studentKey}/auth`).set({ ...auth, updatedAt: new Date().toISOString() });
          return { success: true };
        } else {
          // Offline storage
          const localStudents = JSON.parse(localStorage.getItem('sci_high_local_students') || '{}');
          const local = localStudents[studentId];
          if (!local) return { success: false, error: 'Local account not found' };
          const auth = await this.derivePasswordHash(password);
          local.auth = { ...auth, updatedAt: new Date().toISOString() };
          localStudents[studentId] = local;
          localStorage.setItem('sci_high_local_students', JSON.stringify(localStudents));
          return { success: true };
        }
      } catch (e) { return { success: false, error: e?.message || 'Failed to set password' }; }
    }

    // ===== Password reset: student side =====
    async requestPasswordReset(studentId) {
      try {
        if (!studentId) return { success: false, error: 'Missing studentId' };
        // Client-side soft throttle (2 minutes)
        try {
          const key = `sci_high_reset_last_${studentId}`;
          const last = parseInt(localStorage.getItem(key) || '0', 10);
          if (Date.now() - last < 2*60*1000) {
            return { success: false, error: 'Please wait a couple of minutes before requesting again.' };
          }
          localStorage.setItem(key, String(Date.now()));
        } catch(_) {}
        if (typeof firebase !== 'undefined' && firebase.database) {
          await this.ensureAuthenticated();
          const reqRef = firebase.database().ref('password_resets/requests').push();
          await reqRef.set({
            studentId,
            createdAt: new Date().toISOString(),
            status: 'pending'
          });
          return { success: true, requestId: reqRef.key };
        } else {
          // Offline: store locally for demo
          const local = JSON.parse(localStorage.getItem('sci_high_local_reset_requests') || '[]');
          const req = { id: 'local_' + Date.now(), studentId, createdAt: new Date().toISOString(), status: 'pending' };
          local.push(req);
          localStorage.setItem('sci_high_local_reset_requests', JSON.stringify(local));
          return { success: true, requestId: req.id };
        }
      } catch (e) { return { success: false, error: e?.message || 'Failed to request reset' }; }
    }

    async resetPasswordWithCode(studentId, rawCode, newPassword) {
      try {
        if (!studentId || !rawCode || !newPassword) return { success: false, error: 'Missing inputs' };
        if (typeof firebase !== 'undefined' && firebase.database) {
          await this.ensureAuthenticated();
          const codeSnap = await firebase.database().ref(`password_resets/codes/${studentId}`).once('value');
          if (!codeSnap.exists()) return { success: false, error: 'No active reset code. Ask your professor for a code.' };
          const codeObj = codeSnap.val();
          if (codeObj.used) return { success: false, error: 'This reset code has already been used.' };
          if (codeObj.expiresAt && Date.now() > Date.parse(codeObj.expiresAt)) return { success: false, error: 'Reset code expired. Ask for a new one.' };
          // verify code
          const enc = new TextEncoder();
          const pwdKey = await crypto.subtle.importKey('raw', enc.encode(rawCode), 'PBKDF2', false, ['deriveBits']);
          const saltBytes = this.base64ToBytes(codeObj.salt);
          const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: codeObj.iterations || this.resetCodeIterations }, pwdKey, 256);
          const calcHash = this.bytesToBase64(new Uint8Array(bits));
          if (calcHash !== codeObj.codeHash) return { success: false, error: 'Invalid code.' };
          // set new password
          const setRes = await this.setStudentPassword(studentId, newPassword);
          if (!setRes.success) return setRes;
          // clear approved flag so codes are no longer readable by student
          try { await firebase.database().ref(`password_resets/approved/${studentId}`).remove(); } catch(_) {}
          return { success: true };
        } else {
          // Offline local
          const localCodes = JSON.parse(localStorage.getItem('sci_high_local_reset_codes') || '{}');
          const entry = localCodes[studentId];
          if (!entry) return { success: false, error: 'No local reset code found.' };
          if (entry.used) return { success: false, error: 'Reset code already used.' };
          if (entry.expiresAt && Date.now() > Date.parse(entry.expiresAt)) return { success: false, error: 'Reset code expired.' };
          const enc = new TextEncoder();
          const pwdKey = await crypto.subtle.importKey('raw', enc.encode(rawCode), 'PBKDF2', false, ['deriveBits']);
          const saltBytes = this.base64ToBytes(entry.salt);
          const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: entry.iterations || this.resetCodeIterations }, pwdKey, 256);
          const calcHash = this.bytesToBase64(new Uint8Array(bits));
          if (calcHash !== entry.codeHash) return { success: false, error: 'Invalid code.' };
          const setRes = await this.setStudentPassword(studentId, newPassword);
          if (!setRes.success) return setRes;
          entry.used = true; entry.usedAt = new Date().toISOString();
          localCodes[studentId] = entry;
          localStorage.setItem('sci_high_local_reset_codes', JSON.stringify(localCodes));
          return { success: true };
        }
      } catch (e) { return { success: false, error: e?.message || 'Failed to reset password' }; }
    }

    async registerGeneral(formData) {
      try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(formData.email, formData.password);
        const user = userCredential.user;
        await firebase.database().ref('general_users').child(user.uid).set({
          fullName: formData.fullName,
          email: formData.email,
          department: formData.department || 'General',
          strandYear: formData.year || 'None',
          createdAt: new Date().toISOString(),
          gameData: { totalPoints: 0, achievements: [], courseProgress: {} }
        });
        this.currentUser = { uid: user.uid, email: user.email, type: 'general', profile: { fullName: formData.fullName, email: formData.email, department: formData.department || 'General', strandYear: formData.year || 'None' } };
        localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
        this.userType = 'general'; this.updateProfessorTabVisibility(); this.updateUserInterface();
        return { success: true, message: 'Account created successfully!', user: this.currentUser };
      } catch (error) { return { success: false, error: error.message }; }
    }

    createGuestSession() {
      const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.currentUser = { uid: guestId, type: 'guest', profile: { displayName: 'Guest Player', isGuest: true } };
      localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
      this.userType = 'guest'; this.updateProfessorTabVisibility(); this.updateUserInterface();
      return this.currentUser;
    }

    logout() {
      modernConfirm('Are you sure you want to logout?', { title: 'Confirm Logout', type: 'warning', confirmText: 'Yes, Logout', cancelText: 'Cancel' }).then((confirmed) => {
        if (!confirmed) return;
        if (this.userType !== 'guest') { firebase.auth().signOut(); }
        this.currentUser = null; this.userType = null; localStorage.removeItem('sci_high_user');
        this.updateProfessorTabVisibility(); this.updateUserInterface();
        showSuccess('You have been logged out successfully!');
      });
    }

    isAuthenticated() { return this.currentUser !== null; }

    redirectToGame() {
      sessionStorage.setItem('sci_high_authenticated', 'true');
      sessionStorage.setItem('sci_high_user_type', this.userType);
      window.location.href = 'game.html';
    }

    updateProfessorTabVisibility() {
      const professorTab = document.getElementById('professor-nav-link');
      if (!professorTab) return;
      const canAccessProfessorDashboard = this.currentUser && (this.userType === 'professor' || this.userType === 'admin');
      if (canAccessProfessorDashboard) professorTab.classList.remove('hidden'); else professorTab.classList.add('hidden');
    }

    updateUserInterface() {
      const userGreeting = document.getElementById('user-greeting');
      const greetingText = document.getElementById('greeting-text');
      const logoutBtn = document.getElementById('logout-btn');
      const loginBtn = document.getElementById('login-btn');
      const settingsBtn = document.getElementById('settings-btn');
      const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
      if (!userGreeting || !greetingText || !logoutBtn || !loginBtn) return;
      if (this.currentUser && this.userType !== 'guest') {
        userGreeting.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        loginBtn.classList.add('hidden');
        if (settingsBtn) settingsBtn.classList.remove('hidden');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileSettingsBtn) mobileSettingsBtn.classList.remove('hidden');
        let greetingMessage = '';
        let fullName = this.currentUser.profile?.fullName || this.currentUser.name || '';
        let displayName = fullName;
        if (fullName && fullName.split(' ').length > 2) {
          const nameParts = fullName.split(' ');
          displayName = `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`;
        }
        if (this.userType === 'student') greetingMessage = `Hello, ${displayName || 'Student'}!`;
        else if (this.userType === 'professor') greetingMessage = `Hello, Prof. ${displayName || 'Professor'}!`;
        else if (this.userType === 'admin') greetingMessage = `Hello, Admin ${displayName || 'Admin'}!`;
        else greetingMessage = `Hello, ${displayName || 'User'}!`;
        const fullGreetingMessage = this.userType === 'student' ? `Hello, ${fullName || 'Student'}!` : this.userType === 'professor' ? `Hello, Prof. ${fullName || 'Professor'}!` : this.userType === 'admin' ? `Hello, Admin ${fullName || 'Admin'}!` : `Hello, ${fullName || 'User'}!`;
        greetingText.textContent = greetingMessage;
        greetingText.setAttribute('title', fullGreetingMessage);
      } else {
        userGreeting.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        loginBtn.classList.remove('hidden');
        if (settingsBtn) settingsBtn.classList.add('hidden');
        if (mobileSettingsBtn) mobileSettingsBtn.classList.add('hidden');
      }
    }

    async createAdminUser() {
      try {
        await this.ensureAuthenticated();
        const adminData = { fullName: 'System Administrator', email: 'admin@sci-high.edu', isAdmin: true, type: 'admin', createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(), permissions: ['read','write','delete','admin'] };
        if (typeof firebase !== 'undefined' && firebase.database) {
          const adminRef = firebase.database().ref('professors').child('admin_system');
          await adminRef.set(adminData);
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
          const adminRef = firebase.firestore().collection('professors').doc('admin_system');
          await adminRef.set(adminData);
        }
        this.currentUser = { uid: 'admin_system', type: 'admin', profile: adminData };
        localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
        this.userType = 'admin'; this.updateProfessorTabVisibility(); this.updateUserInterface();
        return this.currentUser;
      } catch (error) {
        console.error('Error creating admin user:', error);
        this.currentUser = { uid: 'admin_' + Date.now(), type: 'admin', profile: { fullName: 'System Administrator', email: 'admin@sci-high.edu', isAdmin: true } };
        localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
        this.userType = 'admin'; this.updateProfessorTabVisibility(); this.updateUserInterface();
        return this.currentUser;
      }
    }

    async createProfessorUser(email, password, fullName, institution = 'SCI-HIGH University') {
      try {
        if (typeof firebase === 'undefined') { await this.loadFirebase(); }
        if (!firebase.auth || !firebase.database) { throw new Error('Firebase services not available'); }
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const professorData = { fullName, email, institution, isVerified: true, type: 'professor', createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(), permissions: ['read','write'], classes: [], students: [] };
        let retries = 3;
        while (retries > 0) {
          try { await firebase.database().ref('professors').child(user.uid).set(professorData); break; }
          catch (databaseError) { console.error(`Database write attempt failed (${4-retries}/3):`, databaseError); retries--; if (retries === 0) { throw databaseError; } await new Promise(r=>setTimeout(r,1000)); }
        }
        return { success: true, uid: user.uid, email, profile: professorData };
      } catch (error) {
        console.error('Error creating professor user:', error);
        return { success: false, error: error.message, code: error.code || 'unknown' };
      }
    }
  }

  // Expose debug helpers and instantiate
  window.debugAuth = async () => {
    try {
      if (typeof firebase !== 'undefined') {
        if (firebase.auth) {
          if (!firebase.auth().currentUser) { await firebase.auth().signInAnonymously(); }
          if (firebase.database) {
            const testRef = firebase.database().ref('test/debug');
            await testRef.set({ timestamp: new Date().toISOString() });
            await testRef.once('value');
          }
        }
      }
    } catch (error) { console.error('❌ Debug failed:', error); }
  };

  window.debugStudentLogin = async (studentId = '20-0774-140') => {
    try { const result = await window.authManager.loginStudent(studentId); return result; }
    catch (error) { console.error('❌ Student login debug failed:', error); return { success: false, error: error.message }; }
  };

  window.authManager = new AuthManager();

  // Offline helpers injection
  window.authManager.createOfflineTestAccounts = function() {
    this.loginStudentOffline = async function(studentId, password) {
      const localStudents = JSON.parse(localStorage.getItem('sci_high_local_students') || '{}');
      const local = localStudents[studentId];
      if (!local) return { success: false, error: 'No local account found. Please register first.', needsRegistration: true };
      if (local.auth && local.auth.passwordHash) {
        if (!password) return { success: false, error: 'Password required.', code: 'PASSWORD_REQUIRED' };
        const ok = await this.verifyPassword(password, local.auth);
        if (!ok) return { success: false, error: 'Invalid password.' };
      } else {
        return { success: false, error: 'No password set for this offline account.', needsPasswordSetup: true };
      }
      this.currentUser = { uid: 'offline_' + studentId, studentId, type: 'student', profile: { ...local, isOffline: true } };
      this.userType = 'student'; localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    };
    this.loginGeneralOffline = function(email) {
      this.currentUser = { uid: 'offline_' + email.replace('@','_'), email, type: 'general', profile: { fullName: 'Offline User', email, isOffline: true } };
      this.userType = 'general'; localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    };
  this.getStudentProfile = async function(studentId) {
      try {
        if (typeof firebase !== 'undefined' && firebase.database) {
          await this.ensureAuthenticated();
          const snapshot = await firebase.database().ref('students').orderByChild('studentId').equalTo(studentId).once('value');
          const data = snapshot.val();
          if (data) {
            const studentKey = Object.keys(data)[0];
            const studentData = data[studentKey];
            let careerStatsData = null;
            try { const careerStatsSnapshot = await firebase.database().ref(`student_career_stats/${studentId}`).once('value'); if (careerStatsSnapshot.exists()) careerStatsData = careerStatsSnapshot.val(); } catch {}
            const mergedStudentData = { ...studentData };
            if (careerStatsData) {
              if (careerStatsData.firstName) mergedStudentData.firstName = careerStatsData.firstName;
              if (careerStatsData.lastName) mergedStudentData.lastName = careerStatsData.lastName;
              if (careerStatsData.department) mergedStudentData.department = careerStatsData.department;
              if (careerStatsData.strandYear) mergedStudentData.strandYear = careerStatsData.strandYear;
              if (careerStatsData.firstName && careerStatsData.lastName) mergedStudentData.fullName = `${careerStatsData.firstName} ${careerStatsData.lastName}`;
            }
            return mergedStudentData;
          }
          // Fallback: check leaderboard entries for this studentId to avoid forcing profile re-entry
          try {
            const lbSnap = await firebase.database().ref('leaderboards').orderByChild('studentId').equalTo(studentId).once('value');
            if (lbSnap.exists()) {
              const any = Object.values(lbSnap.val())[0] || null;
              if (any) {
                const name = any.name || any.playerName || 'Player';
                const parts = (name + '').trim().split(/\s+/);
                const firstName = parts[0] || 'Player';
                const lastName = parts.slice(1).join(' ');
                return {
                  studentId,
                  fullName: name,
                  firstName,
                  lastName,
                  department: any.department || 'General',
                  // Mark as derived from leaderboard so UI can still allow edits later
                  derivedFromLeaderboard: true
                };
              }
            }
          } catch (_) { /* ignore and fall through to offline */ }
        }
      } catch (error) {}
      // Offline fallbacks: first check saved offline students, then local leaderboard cache
      const offlineStudents = JSON.parse(localStorage.getItem('sci_high_offline_students') || '[]');
      const offlineResult = offlineStudents.find(s => s.studentId === studentId) || null;
      if (offlineResult) return offlineResult;
      try {
        const localLb = JSON.parse(localStorage.getItem('sci_high_local_leaderboard') || '[]');
        const match = localLb.find(e => (e.studentId || '') === studentId);
        if (match) {
          const name = match.playerName || match.name || 'Player';
          const parts = (name + '').trim().split(/\s+/);
          const firstName = parts[0] || 'Player';
          const lastName = parts.slice(1).join(' ');
          return {
            studentId,
            fullName: name,
            firstName,
            lastName,
            department: match.department || 'General',
            derivedFromLeaderboard: true
          };
        }
      } catch(_) { /* ignore */ }
      return null;
    };
    this.loginStudentWithProfile = async function(studentId, profileData, password) {
      try {
        if (typeof firebase !== 'undefined' && firebase.database) {
          await this.ensureAuthenticated();
          const studentsRef = firebase.database().ref('students');
          const snapshot = await studentsRef.orderByChild('studentId').equalTo(studentId).once('value');
          const existingData = snapshot.val();
          let studentKey;
          if (existingData) {
            studentKey = Object.keys(existingData)[0];
            await studentsRef.child(studentKey).update({
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              fullName: `${profileData.firstName} ${profileData.lastName}`,
              department: profileData.department,
              strandYear: profileData.strandYear,
              strand: profileData.strand,
              year: profileData.year,
              lastLogin: new Date().toISOString(),
              profileCompleted: true,
              needsProfileCompletion: false
            });
            if (password) {
              const auth = await this.derivePasswordHash(password);
              await studentsRef.child(studentKey).child('auth').set({ ...auth, updatedAt: new Date().toISOString() });
            }
          } else {
            const newStudentData = {
              studentId,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              fullName: `${profileData.firstName} ${profileData.lastName}`,
              department: profileData.department,
              strandYear: profileData.strandYear,
              strand: profileData.strand,
              year: profileData.year,
              isActive: true,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              profileCompleted: true,
              needsProfileCompletion: false,
              progress: { completedQuizzes: [], completedStories: [], totalScore: 0, lastActivity: new Date().toISOString(), gameData: { currentLevel: 1, totalPoints: 0, achievements: [], courseProgress: {} } }
            };
            const newRef = await studentsRef.push(newStudentData);
            studentKey = newRef.key;
            if (password) {
              const auth = await this.derivePasswordHash(password);
              await studentsRef.child(studentKey).child('auth').set({ ...auth, updatedAt: new Date().toISOString() });
            }
          }
          this.currentUser = { uid: studentKey, studentId, type: 'student', profile: { studentId, firstName: profileData.firstName, lastName: profileData.lastName, fullName: `${profileData.firstName} ${profileData.lastName}`, department: profileData.department, strandYear: profileData.strandYear, profileCompleted: true } };
          this.userType = 'student'; localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
          return { success: true, user: this.currentUser };
        }
      } catch (error) { console.warn('Firebase loginStudentWithProfile failed:', error); }
      return this.loginStudentOfflineWithProfile(studentId, profileData, password);
    };
    this.loginStudentOfflineWithProfile = async function(studentId, profileData, password) {
      const studentData = { studentId, firstName: profileData.firstName, lastName: profileData.lastName, fullName: `${profileData.firstName} ${profileData.lastName}` , department: profileData.department, strandYear: profileData.strandYear, isOffline: true, profileCompleted: true, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() };
      const offlineStudents = JSON.parse(localStorage.getItem('sci_high_offline_students') || '[]');
      const existingIndex = offlineStudents.findIndex(s => s.studentId === studentId);
      if (existingIndex >= 0) offlineStudents[existingIndex] = { ...offlineStudents[existingIndex], ...studentData }; else offlineStudents.push(studentData);
      localStorage.setItem('sci_high_offline_students', JSON.stringify(offlineStudents));
      // also store password in structured local store for login
      const localStudents = JSON.parse(localStorage.getItem('sci_high_local_students') || '{}');
      const auth = password ? await this.derivePasswordHash(password) : null;
      localStudents[studentId] = { ...(localStudents[studentId] || {}), ...studentData, ...(auth ? { auth: { ...auth, updatedAt: new Date().toISOString() } } : {}) };
      localStorage.setItem('sci_high_local_students', JSON.stringify(localStudents));
      this.currentUser = { uid: 'offline_' + studentId, studentId, type: 'student', profile: studentData };
      this.userType = 'student'; localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    };
  };

  window.authManager.createOfflineTestAccounts();
})();
