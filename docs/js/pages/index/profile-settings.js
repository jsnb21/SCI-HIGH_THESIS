// Profile Settings modal controller for index.html
(function(){
  function qs(id){ return document.getElementById(id); }
  const openBtn = qs('settings-btn');
  const mobileOpenBtn = qs('mobile-settings-btn');
  const modal = qs('profile-settings-modal');
  const closeBtn = qs('close-profile-settings');
  const form = qs('profile-settings-form');

  function openModal(){ if(modal) modal.classList.remove('hidden'); }
  function closeModal(){ if(modal) modal.classList.add('hidden'); }

  function getCurrentUser(){
    try { return window.authManager && window.authManager.currentUser ? window.authManager.currentUser : JSON.parse(localStorage.getItem('sci_high_user')||'null'); }
    catch(_) { return null; }
  }

  function setCurrentUser(user){
    try {
      if (!user) return;
      localStorage.setItem('sci_high_user', JSON.stringify(user));
      if (window.authManager) { window.authManager.currentUser = user; window.authManager.userType = user.type || window.authManager.userType; }
    } catch(_){ /* ignore */ }
  }

  function populateForm(){
    const user = getCurrentUser();
    const profile = user && user.profile ? user.profile : {};
    const fullName = profile.fullName || user?.name || '';
    const department = profile.department || profile.academicInfo?.department || '';
    const strand = profile.strand || profile.academicInfo?.strand || profile.academicInfo?.course || '';
    const year = profile.year || profile.academicInfo?.yearLevel || '';
    if (qs('ps-fullName')) qs('ps-fullName').value = fullName;
    if (qs('ps-department')) qs('ps-department').value = department || '';
    if (qs('ps-strand')) qs('ps-strand').value = strand || '';
    if (qs('ps-year')) qs('ps-year').value = year || '';
  }

  function updateStudentInfoLocal(fullName, department, strand, year){
    try {
      const parts = (fullName||'').trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ');
      const strandYear = [strand, year].filter(Boolean).join(' - ');
      const info = { firstName, lastName, fullName: fullName||'', department: department||'', strandYear, timestamp: Date.now() };
      localStorage.setItem('studentInfo', JSON.stringify(info));
      localStorage.setItem('recentStudentData', JSON.stringify(info));
    } catch(_){ /* ignore */ }
  }

  function saveToLocal(fullName, department, strand, year){
    const user = getCurrentUser() || { type:'general', profile:{} };
    user.profile = user.profile || {};
    user.profile.fullName = fullName || user.profile.fullName || '';
    if (department) user.profile.department = department;
    user.profile.academicInfo = user.profile.academicInfo || {};
    if (strand) { user.profile.academicInfo.strand = strand; user.profile.academicInfo.course = strand; }
    if (year) user.profile.academicInfo.yearLevel = year;
    setCurrentUser(user);
    updateStudentInfoLocal(fullName, department, strand, year);
    // Update UI greeting
    if (window.authManager && typeof window.authManager.updateUserInterface === 'function') {
      try { window.authManager.updateUserInterface(); } catch(_) {}
    }
  }

  function wire(){
    if (openBtn) openBtn.addEventListener('click', () => { populateForm(); openModal(); });
    if (mobileOpenBtn) mobileOpenBtn.addEventListener('click', () => { populateForm(); openModal(); });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });
    if (form) form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const fullName = (qs('ps-fullName')?.value || '').trim();
      const department = qs('ps-department')?.value || '';
      const strand = (qs('ps-strand')?.value || '').trim();
      const year = qs('ps-year')?.value || '';
      saveToLocal(fullName, department, strand, year);
      // Feedback
      if (typeof window.showSuccess === 'function') window.showSuccess('Profile updated.', { title: 'Saved' });
      closeModal();
    });
  }

  // Defer to DOM ready if needed
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
