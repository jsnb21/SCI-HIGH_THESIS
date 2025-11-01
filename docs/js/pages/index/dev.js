// Dev tools, Konami code, and console helpers
(function(){
  // Konami + DEV mode activation
  let konamiCode = [];
  const konami = [38,38,40,40,37,39,37,39,66,65];
  let devCode = [];
  const devKeys = [68,69,86];

  document.addEventListener('keydown', (e) => {
    // Konami effect
    konamiCode.push(e.keyCode);
    if (konamiCode.length > konami.length) konamiCode.shift();
    if (konamiCode.join(',') === konami.join(',')) {
      document.body.style.filter = 'hue-rotate(180deg)';
      setTimeout(() => { document.body.style.filter = 'none'; }, 3000);
      konamiCode = [];
    }
    // DEV toggle
    devCode.push(e.keyCode);
    if (devCode.length > devKeys.length) devCode.shift();
    if (devCode.join(',') === devKeys.join(',')) {
      const devPanel = document.getElementById('dev-panel');
      if (devPanel) {
        devPanel.classList.toggle('hidden');
        if (!devPanel.classList.contains('hidden')) {
          if (window.showInfo) window.showInfo('DEV MODE ACTIVATED!\nUse the panel or console commands to create test accounts.', { title: '🔧 Developer Mode', type: 'info' });
        }
      }
      devCode = [];
    }
  });

  // Console helpers
  window.createAdminUser = async () => {
    const admin = await window.authManager.createAdminUser();
    if (window.showSuccess) window.showSuccess('Admin user created! Professor tab should now be visible.', { title: '🔧 Admin Created' });
    return admin;
  };

  window.createProfessorUser = async (email, password, fullName, institution) => {
    if (!email || !password || !fullName) {
      if (window.showWarning) window.showWarning('Usage: createProfessorUser("email@domain.com", "password", "Full Name", "Institution (optional)")', { title: 'Missing Parameters' });
      return;
    }
    const result = await window.authManager.createProfessorUser(email, password, fullName, institution);
    if (result.success) {
      if (window.showSuccess) window.showSuccess(`Professor user created!\nEmail: ${email}\nUID: ${result.uid}\nThe professor can now login with their email and password.`, { title: '✅ Professor Created' });
    } else {
      console.error('Failed to create professor user:', result.error);
      if (window.showError) window.showError(`Failed to create professor user: ${result.error}`, { title: '❌ Creation Failed' });
    }
    return result;
  };

  window.testFirebase = async () => {
    const result = await window.authManager.testFirebaseConnection();
    if (result.success) { if (window.showSuccess) window.showSuccess('Firebase connection test passed! Check console for details.', { title: '✅ Connection Test Passed' }); }
    else { console.error('❌ Firebase connection test failed:', result.error); if (window.showError) window.showError(`Firebase connection test failed: ${result.error}`, { title: '❌ Connection Test Failed' }); }
    return result;
  };

  window.createSampleProfessor = () => {
    const professor = { uid: 'prof_' + Date.now(), type: 'professor', profile: { fullName: 'Dr. Sample Professor', email: 'professor@sci-high.edu', institution: 'SCI-HIGH University', isVerified: true } };
    window.authManager.currentUser = professor;
    window.authManager.userType = 'professor';
    localStorage.setItem('sci_high_user', JSON.stringify(professor));
    window.authManager.updateProfessorTabVisibility();
    window.authManager.updateUserInterface();
    if (window.showSuccess) window.showSuccess('Sample professor created!\nEmail: professor@sci-high.edu\nPassword: Prof123!', { title: '👨‍🏫 Sample Professor Created' });
    return professor;
  };

  window.createSampleStudent = () => {
    const student = { uid: 'stud_' + Date.now(), type: 'student', studentId: '24-2024-001', profile: { studentId: '24-2024-001', fullName: 'Juan Dela Cruz', academicInfo: { level: 'college', course: 'BS Computer Science', yearLevel: '3rd Year' }, accountStatus: { isFirstLogin: false, createdBy: 'prof_sample', lastLogin: new Date().toISOString() }, gameData: { totalPoints: 850, courseProgress: { python: { progress: 75, completed: 8, total: 12 }, javascript: { progress: 60, completed: 6, total: 10 }, java: { progress: 45, completed: 4, total: 9 } } } } };
    window.authManager.currentUser = student; window.authManager.userType = 'student';
    localStorage.setItem('sci_high_user', JSON.stringify(student));
    window.authManager.updateProfessorTabVisibility(); window.authManager.updateUserInterface();
    if (window.showSuccess) window.showSuccess('Sample student created!\nStudent ID: 24-2024-001\nNo password needed!\n\nOther test accounts:\n- 24-2024-002 (Maria Santos)\n- 24-2024-003 (Pedro Garcia)', { title: '🎓 Sample Student Created' });
    return student;
  };

  window.createSampleGeneral = () => {
    const generalUser = { uid: 'gen_' + Date.now(), type: 'general', profile: { fullName: 'Maria Santos', email: 'maria@example.com', displayName: 'CodeMaster_Maria', gameData: { totalPoints: 1200, achievements: ['First Steps','Code Warrior','Puzzle Solver'], courseProgress: { python: { progress: 90, completed: 10, total: 12 }, webdesign: { progress: 85, completed: 9, total: 10 } } } } };
    window.authManager.currentUser = generalUser; window.authManager.userType = 'general';
    localStorage.setItem('sci_high_user', JSON.stringify(generalUser));
    window.authManager.updateProfessorTabVisibility(); window.authManager.updateUserInterface();
    if (window.showSuccess) window.showSuccess('Sample general user created!\nEmail: maria@example.com\nPassword: General123!', { title: '🌟 General User Created' });
    return generalUser;
  };

  window.createSampleCareerStats = async () => {
    try {
      const sampleCareerStats = [
        { studentId: 'student_001', careerStats: { totalPoints: 2450, totalSessions: 18, averageAccuracy: 87.5, highestStreak: 15, totalQuestions: 180, totalPlayTime: 7200, courseCompletionStatus: { python: true, java: true, csharp: false, cpp: true, c: false, webdesign: true }, globalRank: 1, departmentRank: 1 }, studentInfo: { fullName: 'Maria Santos', lastUpdated: new Date().toISOString() }, firstName: 'Maria', lastName: 'Santos', department: 'College - BS Computer Science', strandYear: '3rd Year', recentSessions: { } },
        { studentId: 'student_002', careerStats: { totalPoints: 1890, totalSessions: 14, averageAccuracy: 78.2, highestStreak: 12, totalQuestions: 140, totalPlayTime: 5400, courseCompletionStatus: { python: true, java: false, csharp: true, cpp: false, c: true, webdesign: false }, globalRank: 2, departmentRank: 1 }, studentInfo: { fullName: 'John Carlo Reyes', lastUpdated: new Date().toISOString() }, firstName: 'John Carlo', lastName: 'Reyes', department: 'Senior High - STEM', strandYear: 'Grade 12', recentSessions: { } },
        { studentId: 'student_003', careerStats: { totalPoints: 1230, totalSessions: 9, averageAccuracy: 73.8, highestStreak: 8, totalQuestions: 90, totalPlayTime: 3600, courseCompletionStatus: { python: true, java: false, csharp: false, cpp: false, c: false, webdesign: true }, globalRank: 3, departmentRank: 2 }, studentInfo: { fullName: 'Anna Mae Garcia', lastUpdated: new Date().toISOString() }, firstName: 'Anna Mae', lastName: 'Garcia', department: 'Senior High - ICT', strandYear: 'Grade 11', recentSessions: { } }
      ];
      const db = firebase.database();
      const promises = sampleCareerStats.map(async (careerData) => { await db.ref(`student_career_stats/${careerData.studentId}`).set(careerData); });
      await Promise.all(promises);
      return sampleCareerStats;
    } catch (error) { console.error('❌ Error creating sample career stats:', error); throw error; }
  };

  window.logoutUser = () => { window.authManager.logout(); };
  window.showDevCommands = () => { if (window.showInfo) window.showInfo('Dev commands shown in console! Press F12 to see all available commands.', { title: '📋 Developer Commands' }); };
  window.openDeveloperTools = () => { const isAuthorized = prompt('🔐 Enter developer access key:'); if (isAuthorized === 'sci-high-dev-2025') { window.open('developer.html', '_blank'); } else { if (window.showError) window.showError('Invalid access key. Developer tools access denied.', { title: '❌ Access Denied' }); } };
})();
