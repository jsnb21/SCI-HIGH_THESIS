// Universal Notification System for SCI-HIGH
// Modern replacement for alert() and confirm() functions

class NotificationSystem {
  constructor() {
    this.queue = [];
    this.isShowing = false;
    this.notificationId = 0;
    this.isInitialized = false;
    this.init();
  }

  init() {
    this.createModalStructure();
    this.bindEvents();
    if (document.getElementById('universal-notification-modal')) {
      this.isInitialized = true;
    }
  }

  createModalStructure() {
    // Wait for DOM to be ready
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.createModalStructure();
          this.bindEvents();
          this.isInitialized = true;
        });
        return;
      } else {
        console.error('Document body not available');
        return;
      }
    }

    // Remove old container if exists
    const oldContainer = document.getElementById('notification-container');
    if (oldContainer) {
      oldContainer.remove();
    }

    // Create notification modal HTML
    const modalHTML = `
      <!-- Universal Notification Modal -->
      <div id="universal-notification-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] hidden transition-all duration-300">
        <div id="notification-content" class="bg-gradient-to-br from-dark via-light to-dark rounded-xl border-2 border-primary shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95 opacity-0">
          <!-- Header -->
          <div id="notification-header" class="flex items-center justify-between p-4 border-b border-primary/30">
            <div class="flex items-center space-x-3">
              <div id="notification-icon" class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg">
                ℹ️
              </div>
              <h3 id="notification-title" class="text-white font-gaming font-bold text-lg">
                Notification
              </h3>
            </div>
            <button id="notification-close" class="text-gray-400 hover:text-white transition-colors duration-200 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
              ✕
            </button>
          </div>
          
          <!-- Body -->
          <div class="p-6">
            <div id="notification-message" class="text-gray-200 font-body leading-relaxed text-sm mb-6">
              <!-- Message will be inserted here -->
            </div>
            
            <!-- Action Buttons -->
            <div id="notification-actions" class="flex justify-end space-x-3">
              <!-- Buttons will be inserted here -->
            </div>
          </div>
        </div>
      </div>

      <!-- Toast Notifications Container -->
      <div id="toast-container" class="fixed top-4 right-4 z-[10000] space-y-3">
        <!-- Toast notifications will be added here -->
      </div>
    `;

    // Insert modal into body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  bindEvents() {
    // Check if modal elements exist before binding events
    const modal = document.getElementById('universal-notification-modal');
    const closeBtn = document.getElementById('notification-close');
    
    if (!modal || !closeBtn) {
      console.warn('Modal elements not found, skipping event binding');
      return;
    }

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'universal-notification-modal') {
        this.closeModal();
      }
    });

    // Close button
    closeBtn.addEventListener('click', () => {
      this.closeModal();
    });

    // Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isShowing) {
        this.closeModal();
      }
    });
  }

  // Modern alert replacement
  alert(message, options = {}) {
    // Fallback to native alert if not initialized
    if (!this.isInitialized) {
      console.warn('Notification system not ready, using native alert');
      window.alert(message);
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const config = {
        title: options.title || 'Alert',
        type: options.type || 'info', // 'success', 'error', 'warning', 'info'
        icon: this.getIcon(options.type || 'info'),
        showClose: options.showClose !== false,
        buttons: [
          {
            text: options.buttonText || 'OK',
            style: 'primary',
            action: () => resolve(true)
          }
        ],
        ...options
      };

      this.showModal(message, config);
    });
  }

  // Modern confirm replacement
  confirm(message, options = {}) {
    // Fallback to native confirm if not initialized
    if (!this.isInitialized) {
      console.warn('Notification system not ready, using native confirm');
      return Promise.resolve(window.confirm(message));
    }

    return new Promise((resolve) => {
      const config = {
        title: options.title || 'Confirm',
        type: options.type || 'warning',
        icon: this.getIcon(options.type || 'warning'),
        showClose: options.showClose !== false,
        buttons: [
          {
            text: options.cancelText || 'Cancel',
            style: 'secondary',
            action: () => resolve(false)
          },
          {
            text: options.confirmText || 'Confirm',
            style: 'primary',
            action: () => resolve(true)
          }
        ],
        ...options
      };

      this.showModal(message, config);
    });
  }

  // Toast notification (non-blocking)
  toast(message, options = {}) {
    const config = {
      type: options.type || 'info',
      duration: options.duration || 4000,
      showClose: options.showClose !== false,
      ...options
    };

    this.showToast(message, config);
  }

  // Success notification shortcut
  success(message, options = {}) {
    return this.alert(message, { ...options, type: 'success', title: options.title || 'Success' });
  }

  // Error notification shortcut
  error(message, options = {}) {
    return this.alert(message, { ...options, type: 'error', title: options.title || 'Error' });
  }

  // Warning notification shortcut
  warning(message, options = {}) {
    return this.alert(message, { ...options, type: 'warning', title: options.title || 'Warning' });
  }

  // Info notification shortcut
  info(message, options = {}) {
    return this.alert(message, { ...options, type: 'info', title: options.title || 'Information' });
  }

  showModal(message, config) {
    if (this.isShowing) {
      this.queue.push({ message, config });
      return;
    }

    this.isShowing = true;
    const modal = document.getElementById('universal-notification-modal');
    const content = document.getElementById('notification-content');
    const title = document.getElementById('notification-title');
    const icon = document.getElementById('notification-icon');
    const messageEl = document.getElementById('notification-message');
    const actions = document.getElementById('notification-actions');
    const closeBtn = document.getElementById('notification-close');

    // Set content
    title.textContent = config.title;
    icon.innerHTML = config.icon;
    messageEl.innerHTML = this.formatMessage(message);

    // Set icon background based on type
    icon.className = `w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg ${this.getIconClass(config.type)}`;

    // Show/hide close button
    closeBtn.style.display = config.showClose ? 'flex' : 'none';

    // Create action buttons
    actions.innerHTML = '';
    config.buttons.forEach(button => {
      const btn = document.createElement('button');
      btn.textContent = button.text;
      btn.className = this.getButtonClass(button.style);
      btn.addEventListener('click', () => {
        this.closeModal();
        button.action();
      });
      actions.appendChild(btn);
    });

    // Show modal with animation
    modal.classList.remove('hidden');
    
    // Trigger animation after a brief delay to ensure the element is rendered
    setTimeout(() => {
      modal.classList.add('opacity-100');
      content.classList.add('scale-100', 'opacity-100');
      content.classList.remove('scale-95', 'opacity-0');
    }, 10);
  }

  closeModal() {
    if (!this.isShowing) return;

    const modal = document.getElementById('universal-notification-modal');
    const content = document.getElementById('notification-content');

    // Hide with animation
    modal.classList.remove('opacity-100');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
      modal.classList.add('hidden');
      this.isShowing = false;
      
      // Process queue
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        setTimeout(() => this.showModal(next.message, next.config), 100);
      }
    }, 300);
  }

  showToast(message, config) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    toast.className = `
      bg-gradient-to-r ${this.getToastGradient(config.type)} 
      text-white p-4 rounded-lg shadow-lg border border-white/20
      transform translate-x-full transition-all duration-300 ease-out
      max-w-sm flex items-start space-x-3
    `;

    toast.innerHTML = `
      <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm ${this.getIconClass(config.type)}">
        ${this.getIcon(config.type)}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium">${this.formatMessage(message)}</p>
      </div>
      ${config.showClose ? `
        <button class="flex-shrink-0 text-white/70 hover:text-white transition-colors ml-2" onclick="this.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      ` : ''}
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 10);

    // Auto remove
    if (config.duration > 0) {
      setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, config.duration);
    }
  }

  formatMessage(message) {
    // Convert newlines to <br> and preserve emoji
    return message.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }

  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  getIconClass(type) {
    const classes = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    return classes[type] || classes.info;
  }

  getButtonClass(style) {
    const classes = {
      primary: 'px-4 py-2 bg-primary text-dark font-bold rounded-lg hover:bg-yellow-300 transition-colors duration-200 font-gaming',
      secondary: 'px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-500 transition-colors duration-200 font-body',
      danger: 'px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-500 transition-colors duration-200 font-body'
    };
    return classes[style] || classes.secondary;
  }

  getToastGradient(type) {
    const gradients = {
      success: 'from-green-500 to-green-600',
      error: 'from-red-500 to-red-600',
      warning: 'from-yellow-500 to-yellow-600',
      info: 'from-blue-500 to-blue-600'
    };
    return gradients[type] || gradients.info;
  }

  // Legacy NotificationManager compatibility methods
  show(message, type = 'info', duration = 5000, options = {}) {
    if (duration === 0) {
      // Show as modal for persistent notifications
      return this.alert(message, { ...options, type, title: options.title || this.getTitle(type) });
    } else {
      // Show as toast for temporary notifications
      this.toast(message, { ...options, type, duration });
    }
  }

  getTitle(type) {
    const titles = {
      success: 'Success!',
      error: 'Error!',
      warning: 'Warning!',
      info: 'Information',
      loading: 'Loading...'
    };
    return titles[type] || 'Notification';
  }
}

// Initialize the notification system when DOM is ready
let notifications;
let notificationManager;

function initializeNotifications() {
  notifications = new NotificationSystem();
  notificationManager = notifications;

  // Replace global alert and confirm functions
  window.modernAlert = notifications.alert.bind(notifications);
  window.modernConfirm = notifications.confirm.bind(notifications);
  window.showToast = notifications.toast.bind(notifications);
  window.showSuccess = notifications.success.bind(notifications);
  window.showError = notifications.error.bind(notifications);
  window.showWarning = notifications.warning.bind(notifications);
  window.showInfo = notifications.info.bind(notifications);

  // Additional global aliases to ensure compatibility
  window.notify = notifications;
  window.notificationSystem = notifications;

  console.log('✅ Notification system initialized');
}

// Initialize immediately or when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNotifications);
} else {
  initializeNotifications();
}

// Also initialize immediately to ensure functions are available
initializeNotifications();

// For backwards compatibility, override native functions (optional)
// Uncomment the lines below if you want to completely replace alert/confirm
// window.alert = notifications.alert.bind(notifications);
// window.confirm = notifications.confirm.bind(notifications);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationSystem, notifications };
}
