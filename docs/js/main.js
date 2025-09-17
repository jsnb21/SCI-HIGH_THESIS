// SCI-HIGH Main Application Logic

// Global Modal Functions
function showLoginModal() {
  console.log('showLoginModal called');
  const loginModal = document.getElementById('login-modal');
  console.log('Login modal element:', loginModal);
  if (loginModal) {
    loginModal.classList.remove('hidden');
    showUserTypeSelection();
  } else {
    console.error('Login modal not found');
  }
}

// Global Registration Success Modal Function
function showRegistrationSuccessModal(fullName, studentId, academicLevel) {
  const modal = document.getElementById('registration-success-modal');
  const detailsDiv = document.getElementById('registration-details');
  
  // Set the registration details
  detailsDiv.innerHTML = `
    <div class="text-center space-y-2">
      <p><span class="text-cyan-300 font-bold">👤 Name:</span> ${fullName}</p>
      <p><span class="text-cyan-300 font-bold">🆔 Student ID:</span> ${studentId}</p>
      <p><span class="text-cyan-300 font-bold">📚 Level:</span> ${academicLevel}</p>
      <p class="text-green-400 font-gaming mt-4">🎮 Ready to start your learning adventure!</p>
    </div>
  `;
  
  // Show the modal
  modal.classList.remove('hidden');
  
  // Attach event listeners when modal is shown
  const startGameBtn = document.getElementById('modal-start-game-btn');
  const backToIndexBtn = document.getElementById('modal-back-to-index-btn');
  
  // Remove any existing listeners to prevent duplicates
  const newStartGameBtn = startGameBtn.cloneNode(true);
  const newBackToIndexBtn = backToIndexBtn.cloneNode(true);
  startGameBtn.parentNode.replaceChild(newStartGameBtn, startGameBtn);
  backToIndexBtn.parentNode.replaceChild(newBackToIndexBtn, backToIndexBtn);
  
  // Add fresh event listeners
  newStartGameBtn.addEventListener('click', () => {
    console.log('Start Game clicked');
    modal.classList.add('hidden');
    if (window.authManager && typeof window.authManager.redirectToGame === 'function') {
      window.authManager.redirectToGame();
    } else {
      console.error('authManager not available');
      // Fallback redirect to correct game path
      window.location.href = 'html-pages/game.html';
    }
  });
  
  newBackToIndexBtn.addEventListener('click', () => {
    console.log('Back to Index clicked');
    modal.classList.add('hidden');
    // Stay on the current page
  });
}
