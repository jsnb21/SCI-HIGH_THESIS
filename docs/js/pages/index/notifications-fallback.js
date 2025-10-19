// Fallback functions in case notifications.js hasn't loaded yet
(function(){
  window.ensureNotifications = function() {
    if (typeof window.modernConfirm === 'undefined') {
      console.warn('Notification system not loaded, using fallback');
      window.modernConfirm = function(message, options = {}) {
        return Promise.resolve(confirm(message));
      };
      window.modernAlert = function(message, options = {}) {
        alert(message);
        return Promise.resolve(true);
      };
      window.showSuccess = function(message, options = {}) {
        alert('✅ ' + message);
        return Promise.resolve(true);
      };
      window.showError = function(message, options = {}) {
        alert('❌ ' + message);
        return Promise.resolve(true);
      };
      window.showWarning = function(message, options = {}) {
        alert('⚠️ ' + message);
        return Promise.resolve(true);
      };
      window.showInfo = function(message, options = {}) {
        alert('ℹ️ ' + message);
        return Promise.resolve(true);
      };
    }
  };
  window.addEventListener('DOMContentLoaded', () => {
    window.ensureNotifications();
  });
})();
