(function(){
  // Helper selectors
  function qs(id){ return document.getElementById(id); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  // Display elements
  const display = {
    fullName: qs('display-fullName'),
    department: qs('display-department'),
    strand: qs('display-strand'),
    year: qs('display-year')
  };

  // Modal elements
  const modal = {
    root: qs('edit-modal'),
    title: qs('modal-title'),
    container: qs('modal-input-container'),
    save: qs('modal-save'),
    cancel: qs('modal-cancel'),
    close: qs('modal-close')
  };

  // Data helpers
  function getCurrentUser(){
    try { return window.authManager && window.authManager.currentUser ? window.authManager.currentUser : JSON.parse(localStorage.getItem('sci_high_user')||'null'); }
    catch(_) { return null; }
  }
  function setCurrentUser(user){
    try { if (!user) return; localStorage.setItem('sci_high_user', JSON.stringify(user)); if (window.authManager) { window.authManager.currentUser = user; window.authManager.userType = user.type || window.authManager.userType; window.authManager.updateUserInterface && window.authManager.updateUserInterface(); } }
    catch(_) {}
  }

  function getProfileSnapshot(){
    const user = getCurrentUser() || { profile: {} };
    const p = user.profile || {};
    return {
      user,
      fullName: p.fullName || user.name || '',
      department: p.department || p.academicInfo?.department || '',
      strand: p.academicInfo?.strand || p.academicInfo?.course || p.strand || '',
      year: p.academicInfo?.yearLevel || p.year || ''
    };
  }

  function getSignedStudentId(){
    try {
      const u = getCurrentUser();
      return (u?.studentId) || (u?.profile?.studentId) || null;
    } catch { return null; }
  }

  function getSignedIdentifier(){
    const sid = getSignedStudentId();
    if (sid) return sid;
    try {
      const u = getCurrentUser();
      return (u?.email) || (u?.profile?.email) || (u?.uid) || '';
    } catch { return ''; }
  }

  function getUserType(){
    try {
      if (window.authManager && window.authManager.userType) return window.authManager.userType;
      const u = getCurrentUser();
      return (u?.type) || 'general';
    } catch { return 'general'; }
  }

  function updateDisplay(){
    const snap = getProfileSnapshot();
    if (display.fullName) display.fullName.textContent = snap.fullName || '—';
    if (display.department) display.department.textContent = snap.department || '—';
    if (display.strand) display.strand.textContent = snap.strand || '—';
    if (display.year) display.year.textContent = snap.year || '—';
  }

  function saveLocal(partial){
    const { user } = getProfileSnapshot();
    const u = user || { type: 'general', profile: {} };
    u.profile = u.profile || {};
    u.profile.academicInfo = u.profile.academicInfo || {};
    if ('fullName' in partial) u.profile.fullName = partial.fullName;
    if ('department' in partial) u.profile.department = partial.department;
    if ('strand' in partial) { u.profile.academicInfo.strand = partial.strand; u.profile.academicInfo.course = partial.strand; }
    if ('year' in partial) u.profile.academicInfo.yearLevel = partial.year;
    setCurrentUser(u);

    // Maintain studentInfo cache used by game scenes
    try {
      const fullName = u.profile.fullName || '';
      const strand = u.profile.academicInfo.strand || '';
      const year = u.profile.academicInfo.yearLevel || '';
      const department = u.profile.department || '';
      const parts = (fullName).trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ');
      const strandYear = [strand, year].filter(Boolean).join(' - ');
      const info = { firstName, lastName, fullName, department, strandYear, timestamp: Date.now() };
      localStorage.setItem('studentInfo', JSON.stringify(info));
      localStorage.setItem('recentStudentData', JSON.stringify(info));
    } catch(_) {}
  }

  // Modal utilities
  function openModal(field){
    const snap = getProfileSnapshot();
    const titles = {
      fullName: 'Edit Full Name',
      department: 'Edit Department',
      strand: 'Edit Strand/Course',
      year: 'Edit Year Level'
    };

    modal.title.textContent = titles[field] || 'Edit';
    modal.container.innerHTML = '';

    let inputEl;
    if (field === 'fullName') {
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.value = snap.fullName || '';
      inputEl.placeholder = 'e.g., Juan Dela Cruz';
      inputEl.className = 'w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none';
    } else if (field === 'department') {
      inputEl = buildSelect(['', 'Senior High School Department', 'College Department', 'General'], snap.department);
    } else if (field === 'strand') {
      inputEl = buildSelect(['', 'ICT', 'BSCS', 'BSIT'], snap.strand);
    } else if (field === 'year') {
      inputEl = buildSelect(['', '1st', '2nd', '3rd', '4th', '5th'], snap.year);
    }

    if (!inputEl) return;
    inputEl.id = 'modal-input';
    modal.container.appendChild(inputEl);

    modal.root.classList.remove('hidden');
    modal.root.setAttribute('aria-hidden', 'false');

    // Focus input after open
    setTimeout(() => inputEl.focus(), 10);

    // Save handler
    const onSave = () => {
      const val = (inputEl.value || '').trim();
      const patch = {}; patch[field] = val;
      saveLocal(patch);
      updateDisplay();
      closeModal();
      if (typeof window.showSuccess === 'function') window.showSuccess('Saved', { title: 'Profile updated' });
    };

    // Attach temp listeners
    modal.save.onclick = onSave;
  }

  function buildSelect(options, selected){
    const sel = document.createElement('select');
    sel.className = 'w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt || 'Select';
      if (opt === selected) o.selected = true;
      sel.appendChild(o);
    });
    return sel;
  }

  function closeModal(){
    modal.root.classList.add('hidden');
    modal.root.setAttribute('aria-hidden', 'true');
    modal.container.innerHTML = '';
    modal.save.onclick = null;
  }

  // Delete confirmation modal helpers
  function openDeleteConfirm(onProceed){
    const root = document.getElementById('confirm-delete-modal');
    const btnCancel = document.getElementById('confirm-del-cancel');
    const btnClose = document.getElementById('confirm-del-close');
    const btnProceed = document.getElementById('confirm-del-proceed');
    if (!root || !btnProceed) return onProceed && onProceed();
    const close = () => { root.classList.add('hidden'); root.setAttribute('aria-hidden','true'); cleanup(); };
    const proceed = () => { try { onProceed && onProceed(); } finally { close(); } };
    function cleanup(){ btnCancel && (btnCancel.onclick = null); btnClose && (btnClose.onclick = null); btnProceed.onclick = null; root.removeEventListener('click', backdropHandler); document.removeEventListener('keydown', escHandler); }
    function backdropHandler(e){ if (e.target === root) close(); }
    function escHandler(e){ if (e.key === 'Escape') close(); }
    btnCancel && (btnCancel.onclick = close);
    btnClose && (btnClose.onclick = close);
    btnProceed.onclick = proceed;
    root.classList.remove('hidden'); root.setAttribute('aria-hidden','false');
    root.addEventListener('click', backdropHandler);
    document.addEventListener('keydown', escHandler);
  }

  async function deleteAccountData(identifier){
    // identifier may be studentId or email
    try {
      if (typeof firebase !== 'undefined' && firebase.database) {
        await (window.authManager?.ensureAuthenticated?.() || Promise.resolve());
        const db = firebase.database();
        const isEmail = /@/.test(identifier);
        let studentId = identifier;
        if (isEmail) {
          // try to map email -> studentId if exists in students by email field
          try {
            const snap = await db.ref('students').orderByChild('email').equalTo(identifier).once('value');
            if (snap.exists()) {
              const val = snap.val();
              const firstKey = Object.keys(val)[0];
              studentId = val[firstKey]?.studentId || identifier;
            }
          } catch(_) {}
        }

        // Remove from students
        try {
          const studentsSnapshot = await db.ref('students').orderByChild('studentId').equalTo(studentId).once('value');
          if (studentsSnapshot.exists()) {
            const updates = {};
            Object.keys(studentsSnapshot.val()).forEach(k => { updates[`students/${k}`] = null; });
            await db.ref().update(updates);
          }
        } catch(_) {}

        // Remove career stats
        try { await db.ref(`student_career_stats/${studentId}`).remove(); } catch(_) {}

        // Remove gameplay data entries tied to studentId
        try {
          const gpSnap = await db.ref('gameplay_data').orderByChild('studentId').equalTo(studentId).once('value');
          if (gpSnap.exists()) {
            const updates = {};
            Object.keys(gpSnap.val()).forEach(k => { updates[`gameplay_data/${k}`] = null; });
            await db.ref().update(updates);
          }
        } catch(_) {}

        // Remove password reset artifacts
        try { await db.ref(`password_resets/approved/${studentId}`).remove(); } catch(_) {}
        try { await db.ref(`password_resets/codes/${studentId}`).remove(); } catch(_) {}
        try {
          const reqSnap = await db.ref('password_resets/requests').once('value');
          if (reqSnap.exists()) {
            const updates = {};
            Object.entries(reqSnap.val()).forEach(([k, v]) => { if (v && v.studentId === studentId) updates[`password_resets/requests/${k}`] = null; });
            if (Object.keys(updates).length) await db.ref().update(updates);
          }
        } catch(_) {}

        // If it's a general account by email, remove general_users by current uid if available
        try {
          const uid = window.authManager?.currentUser?.uid;
          if (uid && window.authManager?.userType === 'general') { await db.ref(`general_users/${uid}`).remove(); }
        } catch(_) {}

        // Attempt auth user deletion (may require re-auth; ignore failure)
        try { await firebase.auth().currentUser?.delete(); } catch(_) {}

        return { success: true };
      } else {
        // Offline/local deletion
        try {
          const localStudents = JSON.parse(localStorage.getItem('sci_high_local_students') || '{}');
          if (localStudents[identifier]) { delete localStudents[identifier]; localStorage.setItem('sci_high_local_students', JSON.stringify(localStudents)); }
        } catch(_) {}
        try {
          const localCodes = JSON.parse(localStorage.getItem('sci_high_local_reset_codes') || '{}');
          if (localCodes[identifier]) { delete localCodes[identifier]; localStorage.setItem('sci_high_local_reset_codes', JSON.stringify(localCodes)); }
        } catch(_) {}
        // Clear session caches
        try { localStorage.removeItem('studentInfo'); localStorage.removeItem('recentStudentData'); } catch(_) {}
        return { success: true };
      }
    } catch(e){ return { success: false, error: e?.message || 'Deletion failed' }; }
  }

  function init(){
    updateDisplay();
    // Edit buttons
    qsa('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.getAttribute('data-edit')));
    });
    modal.cancel && modal.cancel.addEventListener('click', closeModal);
    modal.close && modal.close.addEventListener('click', closeModal);
    // Close on backdrop click
    modal.root && modal.root.addEventListener('click', (e) => { if (e.target === modal.root) closeModal(); });
    // ESC to close
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.root.classList.contains('hidden')) closeModal(); });

  // Tabs
    const tabDetails = qs('tab-details');
    const tabSecurity = qs('tab-security');
    const panelDetails = qs('panel-details');
    const panelSecurity = qs('panel-security');
    function activate(tab){
      if (tab === 'security') {
        panelDetails.classList.add('hidden');
        panelSecurity.classList.remove('hidden');
        tabDetails.classList.remove('bg-primary/30');
        tabDetails.classList.add('bg-white/10','text-gray-200');
        tabSecurity.classList.remove('bg-white/10','text-gray-200');
        tabSecurity.classList.add('bg-primary/20');
      } else {
        panelDetails.classList.remove('hidden');
        panelSecurity.classList.add('hidden');
        tabSecurity.classList.remove('bg-primary/30');
        tabSecurity.classList.add('bg-white/10','text-gray-200');
        tabDetails.classList.remove('bg-white/10','text-gray-200');
        tabDetails.classList.add('bg-primary/20');
      }
    }
    tabDetails && tabDetails.addEventListener('click', () => activate('details'));
    tabSecurity && tabSecurity.addEventListener('click', () => activate('security'));

    // Prefill studentId/email in security inputs when possible
  const sidVal = getSignedStudentId();
  const identVal = getSignedIdentifier();
  const idInputs = ['sec-studentId','sec-reset-studentId'].map(qs).filter(Boolean);
  idInputs.forEach(inp => { inp.readOnly = true; inp.value = sidVal || ''; inp.classList.add('cursor-not-allowed'); });
  const delIdent = qs('sec-delete-identifier');
  if (delIdent) { delIdent.readOnly = true; delIdent.value = identVal || ''; delIdent.classList.add('cursor-not-allowed'); }

    // Toggle sections by user type
    const ut = getUserType();
    const studentGroup = qs('sec-student-group');
    const generalGroup = qs('sec-general-group');
    if (ut === 'student') { studentGroup?.classList.remove('hidden'); generalGroup?.classList.add('hidden'); }
    else if (ut === 'general') {
      generalGroup?.classList.remove('hidden'); studentGroup?.classList.add('hidden');
      const genEmail = qs('sec-general-email'); if (genEmail) { genEmail.value = (getCurrentUser()?.email || getCurrentUser()?.profile?.email || ''); genEmail.readOnly = true; genEmail.classList.add('cursor-not-allowed'); }
    } else {
      // For professor/admin/guest: hide both
      studentGroup?.classList.add('hidden'); generalGroup?.classList.add('hidden');
    }

    // Security actions
    const requestBtn = qs('btn-request-reset');
    requestBtn && requestBtn.addEventListener('click', async () => {
      const studentId = (getSignedStudentId() || '').trim();
      if (!studentId) return alert('Please enter your student number.');
      try {
        if (window.authManager && typeof window.authManager.requestPasswordReset === 'function') {
          const res = await window.authManager.requestPasswordReset(studentId);
          if (res.success) { (window.showSuccess||alert)('Reset code requested. Ask your professor for the code.'); }
          else { (window.showError||alert)(res.error || 'Failed to request reset'); }
        } else { alert('Password reset service not available.'); }
      } catch(e){ (window.showError||alert)(e.message||'Failed to request reset'); }
    });

    const resetBtn = qs('btn-reset-password');
    resetBtn && resetBtn.addEventListener('click', async () => {
      const studentId = (getSignedStudentId() || '').trim();
      const code = (qs('sec-reset-code')?.value || '').trim();
      const pwd1 = (qs('sec-new-password')?.value || '').trim();
      const pwd2 = (qs('sec-new-password2')?.value || '').trim();
      if (!studentId || !code || !pwd1) return alert('Complete all fields.');
      if (pwd1 !== pwd2) return alert('Passwords do not match.');
      try {
        if (window.authManager && typeof window.authManager.resetPasswordWithCode === 'function') {
          const res = await window.authManager.resetPasswordWithCode(studentId, code, pwd1);
          if (res.success) { (window.showSuccess||alert)('Password updated successfully.'); }
          else { (window.showError||alert)(res.error || 'Failed to reset password'); }
        } else { alert('Password reset service not available.'); }
      } catch(e){ (window.showError||alert)(e.message||'Failed to reset password'); }
    });

    // General: send reset email
    const genSendBtn = qs('btn-general-send-reset');
    genSendBtn && genSendBtn.addEventListener('click', async () => {
      try {
        const email = (qs('sec-general-email')?.value || '').trim();
        if (!email) return alert('No email found on your account.');
        if (typeof firebase === 'undefined' || !firebase.auth) { if (window.authManager?.loadFirebase) await window.authManager.loadFirebase(); }
        if (typeof firebase === 'undefined' || !firebase.auth) return alert('Password reset service not available.');
        await firebase.auth().sendPasswordResetEmail(email);
        (window.showSuccess||alert)('Reset email sent. Check your inbox.');
      } catch(e) { (window.showError||alert)(e.message || 'Failed to send reset email'); }
    });

    // General: change password directly (requires recent login)
    const genChangeBtn = qs('btn-general-change-password');
    genChangeBtn && genChangeBtn.addEventListener('click', async () => {
      const current = (qs('gen-current-password')?.value || '').trim();
      const p1 = (qs('gen-new-password')?.value || '').trim();
      const p2 = (qs('gen-new-password2')?.value || '').trim();
      if (!current || !p1 || !p2) return alert('Complete all fields.');
      if (p1 !== p2) return alert('Passwords do not match.');
      try {
        if (typeof firebase === 'undefined' || !firebase.auth) { if (window.authManager?.loadFirebase) await window.authManager.loadFirebase(); }
        if (typeof firebase === 'undefined' || !firebase.auth) return alert('Password change service not available.');
        const user = firebase.auth().currentUser;
        const email = (qs('sec-general-email')?.value || '').trim();
        if (!user || !email || (user.email && user.email.toLowerCase() !== email.toLowerCase())) {
          return alert('Please use the reset email option. You are not currently signed in as this email.');
        }
        const cred = firebase.auth.EmailAuthProvider.credential(email, current);
        await user.reauthenticateWithCredential(cred);
        await user.updatePassword(p1);
        (window.showSuccess||alert)('Password updated successfully.');
      } catch(e) { (window.showError||alert)(e.message || 'Failed to update password'); }
    });

    const delBtn = qs('btn-delete-account');
    delBtn && delBtn.addEventListener('click', async () => {
      const ident = (getSignedIdentifier() || '').trim();
      const confirmText = (qs('sec-delete-confirm')?.value || '').trim();
      if (!ident) return alert('Enter your student number or email.');
      if (confirmText !== 'DELETE') return alert('Type DELETE to confirm.');
      // Second confirmation modal
      openDeleteConfirm(async () => {
        try {
          const res = await deleteAccountData(ident);
          if (res.success) {
            (window.showSuccess||alert)('Account deleted.');
            try {
              localStorage.removeItem('sci_high_user');
              if (window.authManager) {
                window.authManager.currentUser = null;
                window.authManager.userType = null;
                window.authManager.updateUserInterface && window.authManager.updateUserInterface();
              }
            } catch(_) {}
            setTimeout(() => { window.location.href = 'index.html'; }, 600);
          } else {
            (window.showError||alert)(res.error || 'Failed to delete account');
          }
        } catch(e) {
          (window.showError||alert)(e.message || 'Deletion failed');
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
