/**
 * Mobile Logout Component
 * Handles logout functionality for mobile devices
 */

class MobileLogout {
  constructor(authService) {
    this.authService = authService;
    this.mobileLogoutBtn = null;
    this.regularLogoutBtn = null;
    this.initialized = false;
  }

  /**
   * Initialize mobile logout functionality
   */
  init() {
    if (this.initialized) return;

    this.mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    this.regularLogoutBtn = document.getElementById('logout-btn');
    
    if (this.mobileLogoutBtn) {
      this.setupMobileLogout();
    }
    
    if (this.regularLogoutBtn) {
      this.setupRegularLogout();
    }
    
    this.initialized = true;
  }

  /**
   * Setup mobile logout button
   */
  setupMobileLogout() {
    this.mobileLogoutBtn.addEventListener('click', async () => {
      await this.performLogout();
    });
  }

  /**
   * Setup regular logout button
   */
  setupRegularLogout() {
    this.regularLogoutBtn.addEventListener('click', async () => {
      await this.performLogout();
    });
  }

  /**
   * Perform logout operation
   */
  async performLogout() {
    try {
      // Show loading state
      this.setLoadingState(true);
      
      // Sign out using the provided auth service
      if (this.authService && this.authService.signOut) {
        await this.authService.signOut();
      } else if (window.auth && window.auth.signOut) {
        await window.auth.signOut();
      } else {
        throw new Error('Auth service not available');
      }
      
      // Redirect to login page
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Error signing out:', error);
      this.showError('Failed to logout. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Set loading state for logout buttons
   */
  setLoadingState(isLoading) {
    const buttons = [this.mobileLogoutBtn, this.regularLogoutBtn].filter(btn => btn);
    
    buttons.forEach(button => {
      if (isLoading) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
      } else {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
      }
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    // You can implement a toast notification or alert here
    alert(message);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileLogout;
} else {
  window.MobileLogout = MobileLogout;
}
