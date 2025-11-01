// Modal helpers and global functions used by onclick
(function(){
  // Globals used elsewhere
  window.globalLoginModal = null;
  window.globalScreenshotsModal = null;

  // Copy email helper (Contact section)
  window.copyEmail = function(email) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(() => {
          if (window.showSuccess) {
            window.showSuccess('Email copied to clipboard');
          }
        }).catch(() => fallbackCopy(email));
      } else {
        fallbackCopy(email);
      }
    } catch {
      fallbackCopy(email);
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      if (window.showSuccess) {
        window.showSuccess('Email copied to clipboard');
      }
    }
  };

  function resetStudentFormSteps() {
    const studentIdStep = document.getElementById('student-id-step');
    const studentProfileStep = document.getElementById('student-profile-step');
    const studentFoundStep = document.getElementById('student-found-step');
    if (studentIdStep) studentIdStep.classList.remove('hidden');
    if (studentProfileStep) studentProfileStep.classList.add('hidden');
    if (studentFoundStep) studentFoundStep.classList.add('hidden');
    const studentIdInput = document.getElementById('student-id-input');
    const completeForm = document.getElementById('student-complete-form');
    if (studentIdInput) studentIdInput.value = '';
    if (completeForm) completeForm.reset();
    window.currentStudentId = null;
    window.currentStudentData = null;
  }

  function showUserTypeSelection() {
    const userTypeSelection = document.getElementById('user-type-selection');
    const professorForm = document.getElementById('professor-form');
    const studentForm = document.getElementById('student-form');
    const generalForm = document.getElementById('general-form');
    if (userTypeSelection) userTypeSelection.classList.remove('hidden');
    if (professorForm) professorForm.classList.add('hidden');
    if (studentForm) studentForm.classList.add('hidden');
    if (generalForm) generalForm.classList.add('hidden');
    resetStudentFormSteps();
  }

  function showLoginModal() {
    const loginModal = window.globalLoginModal || document.getElementById('login-modal');
    if (loginModal) {
      loginModal.classList.remove('hidden');
      showUserTypeSelection();
    } else {
      console.error('Login modal not found');
      setTimeout(() => {
        const retryModal = document.getElementById('login-modal');
        if (retryModal) {
          retryModal.classList.remove('hidden');
          showUserTypeSelection();
        }
      }, 100);
    }
  }

  window.showLoginModal = showLoginModal;
  window.showUserTypeSelection = showUserTypeSelection;
  window.resetStudentFormSteps = resetStudentFormSteps;

  window.ensureModalAccess = function() {
    if (!window.globalLoginModal) {
      window.globalLoginModal = document.getElementById('login-modal');
    }
    if (!window.globalScreenshotsModal) {
      window.globalScreenshotsModal = document.getElementById('screenshots-modal');
    }
    return { loginModal: window.globalLoginModal, screenshotsModal: window.globalScreenshotsModal };
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
      window.ensureModalAccess();
    });
  }
})();
