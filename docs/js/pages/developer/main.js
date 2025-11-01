// Notification fallbacks (lightweight) in case notifications.js isn't ready
(function ensureNotifications(){
  const init = () => {
    if(typeof window.showSuccess === 'undefined'){
      window.modernConfirm = (m)=>Promise.resolve(confirm(m));
      window.modernAlert = (m)=>{ alert(m); return Promise.resolve(true);} ;
      window.showSuccess = (m)=>{ alert('✅ '+m); return Promise.resolve(true);} ;
      window.showError = (m)=>{ alert('❌ '+m); return Promise.resolve(true);} ;
      window.showWarning = (m)=>{ alert('⚠️ '+m); return Promise.resolve(true);} ;
      window.showInfo = (m)=>{ alert('ℹ️ '+m); return Promise.resolve(true);} ;
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else { init(); }
})();

// Developer Console logic extracted from developer.html
(function(){
  // Runtime Firebase initialization using env-config.json (no inline secrets)
  async function initFirebase(){
    try {
      const res = await fetch('./config/env-config.json');
      const cfg = await res.json();
      const conf = {
        apiKey: cfg.FIREBASE_API_KEY,
        authDomain: cfg.FIREBASE_AUTH_DOMAIN,
        databaseURL: cfg.FIREBASE_DATABASE_URL,
        projectId: cfg.FIREBASE_PROJECT_ID,
        storageBucket: cfg.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: cfg.FIREBASE_MESSAGING_SENDER_ID,
        appId: cfg.FIREBASE_APP_ID
      };
      if(!firebase.apps.length) {
        firebase.initializeApp(conf);
        console.log('[DEV-CONSOLE] Firebase initialized', {
          projectId: conf.projectId,
          authDomain: conf.authDomain,
          storageBucket: conf.storageBucket,
          apiKeyMasked: conf.apiKey?.slice(0,8)+'***'
        });
      } else {
        console.log('[DEV-CONSOLE] Firebase app already initialized');
      }
    } catch(e){ console.error('Firebase init failed', e); }
  }

  const DEV_KEY_PLACEHOLDER = 'sci-high-dev-2025'; // Replace with deployment secret
  const devSession = { authed:false };

  function authenticateDev(){
    const keyEl = document.getElementById('dev-key');
    const key = keyEl ? keyEl.value.trim() : '';
    if(key && key === DEV_KEY_PLACEHOLDER){
      devSession.authed = true;
      const status = document.getElementById('access-status');
      if (status) { status.textContent = '✅ Developer authenticated'; status.className = 'text-green-400 text-sm'; }
      document.getElementById('auth-section')?.classList.add('hidden');
      document.getElementById('professor-create-card')?.classList.remove('hidden');
      document.getElementById('admin-create-card')?.classList.remove('hidden');
      document.getElementById('quick-info')?.classList.remove('hidden');
      refreshInfo();
    } else {
      window.showError('Invalid developer key');
    }
  }

  function refreshInfo(){
    const el = document.getElementById('info-block');
    if(!el) return;
    const u = firebase.auth().currentUser;
    const app = firebase.app();
    const cfg = app.options || {};
    const base = u ? `UID: ${u.uid}\nEmail: ${u.email}\nAnonymous: ${u.isAnonymous}` : 'No auth user';
    const proj = `Project: ${cfg.projectId || 'n/a'}\nAuthDomain: ${cfg.authDomain || 'n/a'}\nDB URL: ${cfg.databaseURL || 'n/a'}`;
    el.textContent = base + '\n---\n' + proj;
  }

  async function handleCreateProfessor(){
    if(!devSession.authed) return;
    const email = document.getElementById('prof-email')?.value.trim();
    const pass = document.getElementById('prof-password')?.value.trim();
    const name = document.getElementById('prof-name')?.value.trim();
    const inst = document.getElementById('prof-institution')?.value.trim() || 'SCI-HIGH University';
    const statusEl = document.getElementById('prof-create-status');
    if(!email || !pass || !name){ if(statusEl) statusEl.textContent='Fill all required fields.'; return; }
    if(statusEl) statusEl.textContent='Creating...';
    try {
      console.log('[DEV-CONSOLE] Starting professor user creation');
      let uid; let cred;
      try {
        cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        uid = cred.user.uid;
        console.log('[DEV-CONSOLE] Auth user created', { uid, email: cred.user.email });
      } catch(eCreate){
        if(eCreate.code === 'auth/email-already-in-use'){
          if(statusEl) statusEl.textContent = 'Email already exists. Attempting sign-in and profile update...';
          cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
          uid = cred.user.uid;
          console.log('[DEV-CONSOLE] Signed into existing user', { uid, email: cred.user.email });
        } else { throw eCreate; }
      }
      const dbPath = 'professors/' + uid;
      const payload = {
        fullName: name,
        email,
        institution: inst,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        type: 'professor'
      };
      console.log('[DEV-CONSOLE] Writing Realtime DB node', { path: dbPath, payload });
      await firebase.database().ref(dbPath).set(payload);
      console.log('[DEV-CONSOLE] Realtime DB write success');
      if(statusEl) statusEl.textContent = `✅ Professor profile saved (UID: ${uid}).`;
      ['prof-email','prof-password','prof-name','prof-institution'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    } catch(e){
      console.error('[DEV-CONSOLE] Professor creation failed', { code: e.code, name: e.name, message: e.message, stack: e.stack });
      if(statusEl) statusEl.textContent='❌ '+ (e.code? e.code+': ':'') + e.message;
    }
  }

  async function handleCreateAdmin(){
    if(!devSession.authed) return;
    const email = document.getElementById('admin-email')?.value.trim();
    const pass = document.getElementById('admin-password')?.value.trim();
    const statusEl = document.getElementById('admin-create-status');
    if(!email || !pass){ if(statusEl) statusEl.textContent='Fill all required fields.'; return; }
    if(statusEl) statusEl.textContent='Creating admin...';
    try {
      console.log('[DEV-CONSOLE] Starting admin user creation');
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
      const uid = cred.user.uid;
      console.log('[DEV-CONSOLE] Auth admin created', { uid, email: cred.user.email });
      const dbPath = 'professors/' + uid;
      const payload = {
        fullName: 'Admin Account',
        email,
        institution: 'SCI-HIGH',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        type: 'admin'
      };
      console.log('[DEV-CONSOLE] Writing Realtime DB admin node', { path: dbPath, payload });
      await firebase.database().ref(dbPath).set(payload);
      console.log('[DEV-CONSOLE] Admin Realtime DB write success');
      if(statusEl) statusEl.textContent = `✅ Admin created (UID: ${uid}). Assign admin claim.`;
      ['admin-email','admin-password'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    } catch(e){
      console.error('[DEV-CONSOLE] Admin creation failed', { code: e.code, name: e.name, message: e.message, stack: e.stack });
      if(statusEl) statusEl.textContent='❌ '+ (e.code? e.code+': ':'') + e.message;
    }
  }

  function logoutUser(){
    try { if(firebase.auth().currentUser){ firebase.auth().signOut(); } } catch {}
    window.showInfo('Signed out (if any session existed).');
    refreshInfo();
  }

  async function realtimeDbConnectivityTest(){
    const out = document.getElementById('db-test-status');
    if (out) out.textContent = 'Running database test...';
    try {
      const start = performance.now();
      const testRef = firebase.database().ref('__diagnostic/ping');
      const payload = { ts: Date.now(), rnd: Math.random(), origin: location.origin };
      await testRef.set(payload);
      const snap = await testRef.once('value');
      const elapsed = Math.round(performance.now() - start);
      if (out) out.textContent = `✅ Realtime DB write/read OK in ${elapsed}ms (data: ${JSON.stringify(snap.val())})`;
    } catch(e){
      console.error('[DEV-CONSOLE] Realtime DB diagnostic failure', { code: e.code, name: e.name, message: e.message, stack: e.stack });
      if (out) out.textContent = `❌ Database test failed: ${(e.code? e.code+': ':'') + e.message}`;
    }
  }

  // Expose minimal globals for onclick handlers
  window.authenticateDev = authenticateDev;
  window.handleCreateProfessor = handleCreateProfessor;
  window.handleCreateAdmin = handleCreateAdmin;
  window.refreshInfo = refreshInfo;
  window.logoutUser = logoutUser;
  window.realtimeDbConnectivityTest = realtimeDbConnectivityTest;

  // Bootstrap
  document.addEventListener('DOMContentLoaded', initFirebase);
})();
