// DOM-bound logic for index page (forms, modals, carousel, nav)
(function(){
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize globals for modals
    window.globalLoginModal = document.getElementById('login-modal');
    window.globalScreenshotsModal = document.getElementById('screenshots-modal');

    const loginModal = window.globalLoginModal;
    const screenshotsModal = window.globalScreenshotsModal;
    const startGameBtn = document.getElementById('start-game-btn');

    // User type selection
    const userTypeSelection = document.getElementById('user-type-selection');
    const professorForm = document.getElementById('professor-form');
    const studentForm = document.getElementById('student-form');
    const generalForm = document.getElementById('general-form');
    const backToSelection = document.getElementById('back-to-selection');

    function showForm(formType) {
      userTypeSelection.classList.add('hidden');
      professorForm.classList.add('hidden');
      studentForm.classList.add('hidden');
      generalForm.classList.add('hidden');
      backToSelection.classList.remove('hidden');
      switch(formType) {
        case 'professor': professorForm.classList.remove('hidden'); break;
        case 'student': studentForm.classList.remove('hidden'); break;
        case 'general': generalForm.classList.remove('hidden'); break;
      }
    }

    document.getElementById('professor-option').addEventListener('click', () => showForm('professor'));
    document.getElementById('student-option').addEventListener('click', () => showForm('student'));
    document.getElementById('general-option').addEventListener('click', () => showForm('general'));

    document.getElementById('guest-option').addEventListener('click', async () => {
      if (typeof window.ensureNotifications === 'function') { window.ensureNotifications(); }
      const message = "You're about to play as Guest. Your progress won't be saved online and may be lost if you clear your browser or switch devices. Continue?";
      let proceed = true;
      try {
        if (typeof window.modernConfirm === 'function') {
          proceed = await window.modernConfirm(message, { title: 'Guest Mode Warning', confirmText: 'Continue as Guest', cancelText: 'Go Back', type: 'warning' });
        } else { proceed = confirm(message); }
      } catch (e) { proceed = confirm(message); }
      if (!proceed) return;
      window.authManager.createGuestSession();
      loginModal.classList.add('hidden');
      window.authManager.redirectToGame();
      if (typeof window.showInfo === 'function') { window.showInfo('Guest mode enabled. Progress will only be saved locally.'); }
    });

    backToSelection.addEventListener('click', window.showUserTypeSelection);

    document.getElementById('professor-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const result = await window.authManager.loginProfessor(formData.get('email'), formData.get('password'));
      if (result.success) { loginModal.classList.add('hidden'); window.location.href = 'professor-dashboard.html'; }
      else { window.showError('Login failed: ' + result.error, { title: 'Professor Login Failed' }); }
    });

    let currentStudentId = null;
    window.currentStudentData = null;

    document.getElementById('verify-student-id').addEventListener('click', async () => {
      const studentIdInput = document.getElementById('student-id-input');
      const studentId = studentIdInput.value.trim();
      const studentIdPattern = /^[0-9]{2}-[0-9]{4}-[0-9]{3}$/;
      if (!studentIdPattern.test(studentId)) {
        window.showError('Invalid Student ID format!\n\nPlease use the format: XX-XXXX-XXX\nExample: 24-2024-001\n\n• XX = 2-digit year/batch\n• XXXX = 4-digit year\n• XXX = 3-digit sequence number', { title: 'Invalid Student ID Format' });
        return;
      }
      currentStudentId = studentId;
      try {
        const studentData = await window.authManager.getStudentProfile(studentId);
        if (studentData) { showStudentFoundStep(studentData); }
        else { showStudentProfileStep(null); }
      } catch (error) { console.warn('Error checking student profile:', error); showStudentProfileStep(null); }
    });

    document.getElementById('student-complete-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const strand = formData.get('strand');
      const year = formData.get('year');
      const strandYear = `${year} Year ${strand}`;
      const profileData = { studentId: currentStudentId, firstName: formData.get('firstName').trim(), lastName: formData.get('lastName').trim(), department: formData.get('department'), strandYear, strand, year };
      try {
        await window.authManager.firebaseInitPromise;
        const result = await window.authManager.loginStudentWithProfile(currentStudentId, profileData);
        if (result.success) {
          window.showSuccess('Welcome! Your profile has been set up successfully. Your progress will be saved automatically.', { title: '🎉 Profile Complete!' }).then(() => {
            loginModal.classList.add('hidden'); window.authManager.redirectToGame();
          });
        } else { window.showError('Profile setup failed: ' + result.error, { title: 'Setup Failed' }); }
      } catch (error) {
        console.warn('Firebase profile setup failed, trying offline mode:', error);
        const offlineResult = window.authManager.loginStudentOfflineWithProfile(currentStudentId, profileData);
        if (offlineResult.success) {
          window.showInfo('Welcome! Your profile has been set up in offline mode. Progress will be saved locally.', { title: '📱 Offline Mode' }).then(() => {
            loginModal.classList.add('hidden'); window.authManager.redirectToGame();
          });
        } else { window.showError('Profile setup failed: Unable to save profile', { title: 'Setup Error' }); }
      }
    });

    document.getElementById('login-existing-student').addEventListener('click', async () => {
      try {
        await window.authManager.firebaseInitPromise;
        const result = await window.authManager.loginStudent(currentStudentId);
        if (result.success) {
          window.showSuccess('Welcome back! Your progress has been loaded.', { title: '👋 Welcome Back!' }).then(() => {
            loginModal.classList.add('hidden'); window.authManager.redirectToGame();
          });
        } else { window.showError('Login failed: ' + result.error, { title: 'Student Login Failed' }); }
      } catch (error) {
        console.warn('Firebase login failed, trying offline mode:', error);
        const offlineResult = window.authManager.loginStudentOffline(currentStudentId);
        if (offlineResult.success) {
          window.showInfo('Welcome! You are playing in offline mode. Progress will be saved locally.', { title: '📱 Offline Mode' }).then(() => {
            loginModal.classList.add('hidden'); window.authManager.redirectToGame();
          });
        } else { window.showError('Login failed: Unable to authenticate', { title: 'Authentication Error' }); }
      }
    });

    function showStudentProfileStep(existingData) {
      document.getElementById('student-id-step').classList.add('hidden');
      document.getElementById('student-found-step').classList.add('hidden');
      document.getElementById('student-profile-step').classList.remove('hidden');
      if (existingData) {
        const form = document.getElementById('student-complete-form');
        if (existingData.firstName) form.querySelector('[name="firstName"]').value = existingData.firstName;
        if (existingData.lastName) form.querySelector('[name="lastName"]').value = existingData.lastName;
        if (existingData.department) form.querySelector('[name="department"]').value = existingData.department;
        if (existingData.strand) form.querySelector('[name="strand"]').value = existingData.strand;
        if (existingData.year) form.querySelector('[name="year"]').value = existingData.year;
        if (existingData.strandYear && !existingData.strand && !existingData.year) {
          const parseStrandYear = (strandYear) => {
            const yearMatch = strandYear.match(/(\d+)(st|nd|rd|th)/i);
            const year = yearMatch ? yearMatch[1] + (yearMatch[2] || '') : '';
            let strand = '';
            if (strandYear.includes('BSCS') || strandYear.includes('BS CS')) strand = 'BSCS';
            else if (strandYear.includes('BSIT') || strandYear.includes('BS IT')) strand = 'BSIT';
            else if (strandYear.includes('ICT')) strand = 'ICT';
            return { strand, year };
          };
          const { strand, year } = parseStrandYear(existingData.strandYear);
          if (strand) form.querySelector('[name="strand"]').value = strand;
          if (year) form.querySelector('[name="year"]').value = year;
        }
      }
    }

    function showStudentFoundStep(studentData) {
      document.getElementById('student-id-step').classList.add('hidden');
      document.getElementById('student-profile-step').classList.add('hidden');
      document.getElementById('student-found-step').classList.remove('hidden');
      const firstName = studentData.firstName || (studentData.fullName ? studentData.fullName.split(' ')[0] : 'Student');
      const lastName = studentData.lastName || (studentData.fullName ? studentData.fullName.split(' ').slice(1).join(' ') : '');
      const fullName = studentData.fullName || `${firstName} ${lastName}`.trim();
      const department = studentData.department || studentData.academicInfo?.department || 'Unknown Department';
      const strandYear = studentData.strandYear || (studentData.strand && studentData.year ? `${studentData.year} Year ${studentData.strand}` : '') || studentData.academicInfo?.course || 'Unknown Program';
      const studentId = studentData.studentId || currentStudentId;
      const preview = document.getElementById('student-profile-preview');
      preview.innerHTML = `
          <p><strong>👤 Name:</strong> ${fullName}</p>
          <p><strong>🎓 Department:</strong> ${department}</p>
          <p><strong>📚 Program:</strong> ${strandYear}</p>
          <p><strong>🆔 Student ID:</strong> ${studentId}</p>
        `;
      window.currentStudentData = studentData;
    }

    document.getElementById('student-id-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('verify-student-id').click(); });

    document.getElementById('general-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        const result = await window.authManager.loginGeneral(formData.get('email'), formData.get('password'));
        if (result.success) { loginModal.classList.add('hidden'); window.authManager.redirectToGame(); }
        else { window.showError('Login failed: ' + result.error, { title: 'General Login Failed' }); }
      } catch (error) {
        console.warn('Firebase login failed, trying offline mode:', error);
        const offlineResult = window.authManager.loginGeneralOffline(formData.get('email'));
        if (offlineResult.success) {
          window.showInfo('Welcome! You are playing in offline mode. Progress will be saved locally.', { title: '📱 Offline Mode' }).then(() => {
            loginModal.classList.add('hidden'); window.authManager.redirectToGame();
          });
        } else { window.showError('Login failed: Unable to authenticate', { title: 'Authentication Error' }); }
      }
    });

    document.getElementById('general-register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const result = await window.authManager.registerGeneral({ fullName: formData.get('fullName'), email: formData.get('email'), department: formData.get('department') || 'General', year: formData.get('year') || 'None', password: formData.get('password') });
      if (result.success) {
        window.showSuccess('Account created successfully!', { title: '🎉 Registration Complete' }).then(() => {
          e.target.reset(); loginModal.classList.add('hidden'); window.authManager.redirectToGame();
        });
      } else { window.showError('Registration failed: ' + result.error, { title: 'Registration Failed' }); }
    });

    const closeLoginModalBtn = document.getElementById('close-login-modal');
    if (closeLoginModalBtn) {
      closeLoginModalBtn.addEventListener('click', () => { if (loginModal) { loginModal.classList.add('hidden'); window.resetStudentFormSteps(); } });
    }
    if (loginModal) {
      loginModal.addEventListener('click', (e) => { if (e.target === loginModal) { loginModal.classList.add('hidden'); window.resetStudentFormSteps(); } });
    }

    const screenshots = [
      'assets/img/bg/classroom_day.png',
      'assets/img/bg/libraryBG.png',
      'assets/img/mainhub/MainHubBG.png'
    ];
    const closeModalBtn = document.getElementById('close-screenshots-modal');
    const carouselImg = document.getElementById('carousel-image');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dots = document.querySelectorAll('#carousel-dots .dot');
    let current = 0;

    function showScreenshot(idx) {
      if (!carouselImg) return;
      carouselImg.src = screenshots[idx];
      carouselImg.style.transform = 'scale(0.95)';
      setTimeout(() => { carouselImg.style.transform = 'scale(1)'; }, 150);
      dots.forEach((dot, i) => {
        if (i === idx) { dot.classList.add('bg-primary', 'scale-110'); dot.classList.remove('bg-gray-500'); }
        else { dot.classList.remove('bg-primary', 'scale-110'); dot.classList.add('bg-gray-500'); }
      });
      current = idx;
    }

    if (startGameBtn) {
      (async () => {
        try {
          await window.authManager.ensureAuthenticated();
          try {
            if (window.firebaseConfig && !window.firebaseConfig.isInitialized()) { await window.firebaseConfig.initializeFirebase(); }
            if (window.firebase && firebase.auth && !firebase.auth().currentUser) { try { await firebase.auth().signInAnonymously(); } catch {} }
          } catch (e) { console.warn('Firebase init before maintenance watcher failed:', e?.message || e); }
          const setBtnState = (active) => {
            if (!startGameBtn) return;
            if (active) { startGameBtn.disabled = true; startGameBtn.classList.add('opacity-60', 'cursor-not-allowed'); }
            else { startGameBtn.disabled = false; startGameBtn.classList.remove('opacity-60', 'cursor-not-allowed'); }
          };
          try {
            if (window.firebase && firebase.database) {
              const snap = await firebase.database().ref('system/maintenance').once('value');
              const val = snap.val() || {};
              const now = Date.now();
              const startsAtMs = val?.startsAtMs ?? (val?.startsAt ? Date.parse(val.startsAt) : 0);
              const endsAtMs = val?.endsAtMs ?? (val?.endsAt ? Date.parse(val.endsAt) : 0);
              const isActive = !!(val && val.enabled && (!startsAtMs || now >= startsAtMs) && (!endsAtMs || now < endsAtMs));
              setBtnState(isActive);
            }
          } catch {}
          if (window.MaintenanceToast && typeof window.MaintenanceToast.init === 'function') {
            window.MaintenanceToast.init({
              onChange: (active, val) => {
                const now = Date.now();
                const startsAtMs = val?.startsAtMs ?? (val?.startsAt ? Date.parse(val.startsAt) : 0);
                const endsAtMs = val?.endsAtMs ?? (val?.endsAt ? Date.parse(val.endsAt) : 0);
                const isActive = !!(val && val.enabled && (!startsAtMs || now >= startsAtMs) && (!endsAtMs || now < endsAtMs));
                setBtnState(isActive, val?.message, endsAtMs);
              }
            });
          } else { console.warn('MaintenanceToast module not available; falling back to no toast.'); }
        } catch (e) { console.warn('Maintenance observer failed:', e.message); }
      })();

      startGameBtn.addEventListener('click', async (ev) => {
        try {
          const snap = await firebase.database().ref('system/maintenance').once('value');
          const val = snap.val() || {};
          const now = Date.now();
          const startsAtMs = val.startsAtMs ?? (val.startsAt ? Date.parse(val.startsAt) : 0);
          const endsAtMs = val.endsAtMs ?? (val.endsAt ? Date.parse(val.endsAt) : 0);
          const active = !!(val.enabled && (!startsAtMs || now >= startsAtMs) && (!endsAtMs || now < endsAtMs));
          if (active) {
            ev.preventDefault();
            const endsStr = endsAtMs ? new Date(endsAtMs).toLocaleString() : '';
            const msg = (val.message || 'Site is under maintenance.') + (endsStr ? `\n\nEnds: ${endsStr}` : '');
            if (window.showWarning) { window.showWarning(msg, { title: 'Maintenance Mode' }); } else { alert(msg); }
            return;
          }
        } catch {}
        if (window.authManager.isAuthenticated()) { window.authManager.redirectToGame(); }
        else { window.showLoginModal(); }
      });
    }

    if (closeModalBtn && screenshotsModal) {
      closeModalBtn.addEventListener('click', () => { screenshotsModal.classList.add('hidden'); });
    }
    if (prevBtn) { prevBtn.addEventListener('click', () => { let prev = (current - 1 + screenshots.length) % screenshots.length; showScreenshot(prev); }); }
    if (nextBtn) { nextBtn.addEventListener('click', () => { let next = (current + 1) % screenshots.length; showScreenshot(next); }); }
    dots.forEach((dot, i) => { dot.addEventListener('click', () => showScreenshot(i)); });
    if (screenshotsModal) {
      screenshotsModal.addEventListener('click', (e) => { if (e.target === screenshotsModal) screenshotsModal.classList.add('hidden'); });
    }
  });

  // Konami and dev mode + mobile menu + news loader hook will be in other modules
})();
