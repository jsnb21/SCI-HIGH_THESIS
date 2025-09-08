/**
 * Mobile Navigation Component
 * Handles mobile menu functionality for dashboard pages
 */

class MobileNavigation {
  constructor() {
    this.mobileMenuBtn = null;
    this.mobileMenu = null;
    this.initialized = false;
  }

  /**
   * Initialize mobile navigation
   */
  init() {
    if (this.initialized) return;

    this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
    this.mobileMenu = document.getElementById('mobile-menu');
    
    if (this.mobileMenuBtn && this.mobileMenu) {
      this.setupEventListeners();
      this.initialized = true;
    }
  }

  /**
   * Setup event listeners for mobile navigation
   */
  setupEventListeners() {
    // Mobile menu toggle
    this.mobileMenuBtn.addEventListener('click', () => {
      this.toggleMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
      if (!this.mobileMenuBtn.contains(event.target) && 
          !this.mobileMenu.contains(event.target)) {
        this.closeMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeMenu();
      }
    });
  }

  /**
   * Toggle mobile menu visibility
   */
  toggleMenu() {
    const isHidden = this.mobileMenu.style.display === 'none' || !this.mobileMenu.style.display;
    this.mobileMenu.style.display = isHidden ? 'block' : 'none';
    
    // Update aria-expanded
    this.mobileMenuBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    
    // Update icon rotation
    const svg = this.mobileMenuBtn.querySelector('svg');
    if (svg) {
      svg.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    }
  }

  /**
   * Close mobile menu
   */
  closeMenu() {
    this.mobileMenu.style.display = 'none';
    this.mobileMenuBtn.setAttribute('aria-expanded', 'false');
    
    const svg = this.mobileMenuBtn.querySelector('svg');
    if (svg) {
      svg.style.transform = 'rotate(0deg)';
    }
  }

  /**
   * Check if menu is open
   */
  isMenuOpen() {
    return this.mobileMenu.style.display === 'block';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileNavigation;
} else {
  window.MobileNavigation = MobileNavigation;
}
