// Lightweight debug logger with a runtime toggle.
// Enable by either:
//  - window.__DEBUG__ = true (before scene starts), or
//  - localStorage.setItem('DEBUG', '1')

export const DEBUG = (() => {
  try {
    if (typeof window !== 'undefined') {
      if (window.__DEBUG__ === true) return true;
      const ls = window.localStorage && window.localStorage.getItem('DEBUG');
      return ls === '1' || ls === 'true';
    }
  } catch (_) {}
  return false;
})();

export function dlog(scope, ...args) {
  if (!DEBUG) return;
  try {
    // Keep output compact and consistent
    // eslint-disable-next-line no-console
    console.log(`[${scope}]`, ...args);
  } catch (_) {}
}
