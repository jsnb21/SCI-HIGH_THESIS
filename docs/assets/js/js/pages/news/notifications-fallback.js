// Simple notification fallbacks in case notifications.js hasn't loaded yet
(function ensureNotifications() {
  function init() {
    if (typeof window.modernConfirm === 'undefined') {
      window.modernConfirm = function (message) {
        return Promise.resolve(confirm(message));
      };
      window.modernAlert = function (message) {
        alert(message);
        return Promise.resolve(true);
      };
      window.showSuccess = function (message) {
        alert('✅ ' + message);
        return Promise.resolve(true);
      };
      window.showError = function (message) {
        alert('❌ ' + message);
        return Promise.resolve(true);
      };
      window.showWarning = function (message) {
        alert('⚠️ ' + message);
        return Promise.resolve(true);
      };
      window.showInfo = function (message) {
        alert('ℹ️ ' + message);
        return Promise.resolve(true);
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
