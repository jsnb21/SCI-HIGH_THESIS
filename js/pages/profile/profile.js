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
    try {
      if (!window.authManager?.sessionVerified) return null;
      const firebaseUser = window.firebase?.auth?.().currentUser;
      const appUser = window.authManager.currentUser;
      return firebaseUser && appUser?.uid === firebaseUser.uid ? appUser : null;
    }
    catch(_) { return null; }
  }
  function setCurrentUser(user){
    try {
      const current = getCurrentUser();
      if (!user || !current || user.uid !== current.uid || user.type !== current.type) return;
      localStorage.setItem('sci_high_user', JSON.stringify(user));
      window.authManager.currentUser = user;
      window.authManager.updateUserInterface?.();
    }
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
      return window.authManager?.sessionVerified ? window.authManager.userType : null;
    } catch { return null; }
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
    try {
      const authUser = await window.authManager?.ensureAuthenticated?.();
      const appUser = getCurrentUser();
      if (!authUser || !appUser || authUser.uid !== appUser.uid) throw new Error('Verified account required');

      const expectedIdentifier = appUser.type === 'student' ? appUser.studentId : authUser.email;
      if (!expectedIdentifier || identifier.toLowerCase() !== String(expectedIdentifier).toLowerCase()) {
        throw new Error('Account identifier does not match the signed-in account');
      }
      if (appUser.type !== 'student' && appUser.type !== 'general') {
        throw new Error('Privileged accounts must be deleted by another administrator');
      }

      const password = prompt('To permanently delete your account, enter your current password:');
      if (!password) throw new Error('Password confirmation is required');
      const credential = firebase.auth.EmailAuthProvider.credential(authUser.email, password);
      await authUser.reauthenticateWithCredential(credential);

      const updates = {};
      if (appUser.type === 'student') {
        updates[`students/${authUser.uid}`] = null;
        updates[`student_career_stats/${authUser.uid}`] = null;
        updates[`leaderboards/${authUser.uid}`] = null;
        updates[`gameplay_data/${authUser.uid}`] = null;
      } else {
        updates[`general_users/${authUser.uid}`] = null;
      }
      await firebase.database().ref().update(updates);
      await authUser.delete();
      return { success: true };
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
        tabDetails.classList.add('muted');
        tabSecurity.classList.remove('muted');
      } else {
        panelDetails.classList.remove('hidden');
        panelSecurity.classList.add('hidden');
        tabSecurity.classList.add('muted');
        tabDetails.classList.remove('muted');
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

  async function initAfterAuth(){
    try {
      const result = await (window.authReadyPromise || Promise.resolve({ success: false }));
      if (!result?.success || !window.authManager?.sessionVerified) {
        window.location.replace('index.html');
        return;
      }
      init();
    } catch (_) {
      window.location.replace('index.html');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAfterAuth); else initAfterAuth();
})();
