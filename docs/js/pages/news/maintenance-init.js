// Initialize maintenance toast on News page if available
(function initMaintenanceToast(){
  try {
    if (window.MaintenanceToast && typeof window.MaintenanceToast.init === 'function') {
      window.MaintenanceToast.init();
    }
  } catch (e) {
    // noop
  }
})();
