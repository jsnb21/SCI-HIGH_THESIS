// Custom Notification System
class NotificationManager {
  constructor() {
    this.container = document.getElementById('notification-container');
    this.notificationId = 0;
  }

  show(message, type = 'info', duration = 5000, options = {}) {
    const notification = this.createNotification(message, type, duration, options);
    this.container.appendChild(notification);
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification);
      }, duration);
    }
    
    return notification;
  }

  createNotification(message, type, duration, options) {
    const id = `notification-${this.notificationId++}`;
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type} border-2 rounded-lg shadow-2xl p-4 relative overflow-hidden`;
    
    // Get icon based on type
    const icons = {
      success: '✅',
      error: '❌', 
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳'
    };
    
    // Get title based on type
    const titles = {
      success: 'Success!',
      error: 'Error!',
      warning: 'Warning!',
      info: 'Information',
      loading: 'Loading...'
    };
    
    notification.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="text-2xl flex-shrink-0 mt-1">${options.icon || icons[type]}</div>
        <div class="flex-1 min-w-0">
          <h4 class="font-gaming text-white font-bold text-sm mb-1">${options.title || titles[type]}</h4>
          <p class="text-white/90 text-sm leading-relaxed">${message}</p>
          ${options.actions ? this.createActions(options.actions, id) : ''}
        </div>
        <button onclick="notificationManager.remove(document.getElementById('${id}'))" 
                class="text-white/70 hover:text-white transition-colors duration-200 flex-shrink-0 ml-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      ${duration > 0 ? `<div class="notification-progress-bar" style="animation-duration: ${duration}ms;"></div>` : ''}
    `;
    
    return notification;
  }

  remove(notification) {
    if (notification && notification.parentNode) {
      notification.classList.add('slideOutRight');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  success(message, options = {}) {
    return this.show(message, 'success', options.duration || 4000, options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', options.duration || 6000, options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options.duration || 5000, options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options.duration || 4000, options);
  }

  loading(message, options = {}) {
    return this.show(message, 'loading', 0, options);
  }

  confirm(message, options = {}) {
    return new Promise((resolve) => {
      const confirmModal = document.createElement('div');
      confirmModal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[150] backdrop-blur-sm';
      
      confirmModal.innerHTML = `
        <div class="neon-border bg-cardBg rounded-xl shadow-2xl max-w-md w-full mx-4 p-8 relative animate-bounce-in">
          <div class="text-center">
            <div class="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-3xl">${options.icon || '❓'}</span>
            </div>
            <h3 class="font-gaming text-xl text-yellow-400 mb-4">${options.title || 'Confirm Action'}</h3>
            <p class="text-gray-300 text-sm mb-8">${message}</p>
            <div class="flex space-x-4">
              <button id="confirm-yes" class="flex-1 px-4 py-2 font-gaming text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg transform transition-all duration-300 hover:scale-105">
                ${options.confirmText || 'Yes'}
              </button>
              <button id="confirm-no" class="flex-1 px-4 py-2 font-gaming text-gray-300 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg transform transition-all duration-300 hover:scale-105 border border-gray-500">
                ${options.cancelText || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(confirmModal);
      
      const yesBtn = confirmModal.querySelector('#confirm-yes');
      const noBtn = confirmModal.querySelector('#confirm-no');
      
      yesBtn.addEventListener('click', () => {
        document.body.removeChild(confirmModal);
        resolve(true);
      });
      
      noBtn.addEventListener('click', () => {
        document.body.removeChild(confirmModal);
        resolve(false);
      });
      
      // Close on outside click
      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
          document.body.removeChild(confirmModal);
          resolve(false);
        }
      });
    });
  }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Global notification functions
function showSuccess(message, options = {}) {
  return notificationManager.success(message, options);
}

function showError(message, options = {}) {
  return notificationManager.error(message, options);
}

function showWarning(message, options = {}) {
  return notificationManager.warning(message, options);
}

function showInfo(message, options = {}) {
  return notificationManager.info(message, options);
}

function showLoading(message, options = {}) {
  return notificationManager.loading(message, options);
}

function showConfirm(message, options = {}) {
  return notificationManager.confirm(message, options);
}
