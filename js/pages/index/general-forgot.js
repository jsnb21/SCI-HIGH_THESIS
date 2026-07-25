(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function on(id, evt, fn){ const el = document.getElementById(id); if (el) el.addEventListener(evt, fn); }

  function show(el){ el && el.classList.remove('hidden'); }
  function hide(el){ el && el.classList.add('hidden'); }

  function getLoginEmail(){
    const form = document.getElementById('general-login-form');
    if (!form) return '';
    const emailInput = form.querySelector('input[name="email"]');
    return (emailInput && emailInput.value) ? emailInput.value.trim() : '';
  }

  async function ensureFirebase(){
    try {
      if (typeof firebase === 'undefined' || !firebase.auth) {
        if (window.authManager && typeof window.authManager.loadFirebase === 'function') {
          await window.authManager.loadFirebase();
        }
      }
      return (typeof firebase !== 'undefined' && !!firebase.auth);
    } catch { return false; }
  }

  function toastSuccess(msg){ if (window.showSuccess) window.showSuccess(msg); else alert(msg); }
  function toastError(msg){ if (window.showError) window.showError(msg); else alert(msg); }

  function init(){
    const toggle = document.getElementById('general-forgot-toggle');
    const panel = document.getElementById('general-forgot-panel');
    const input = document.getElementById('general-forgot-email');
    const sendBtn = document.getElementById('general-send-reset-btn');

    if (!toggle || !panel || !input || !sendBtn) return;

    toggle.addEventListener('click', () => {
      // Prefill from the login email field if available
      const em = getLoginEmail();
      if (em && !input.value) input.value = em;
      if (panel.classList.contains('hidden')) show(panel); else hide(panel);
    });

    sendBtn.addEventListener('click', async () => {
      try {
        const email = (input.value || '').trim();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toastError('Enter a valid email.'); return; }
        const ok = await ensureFirebase();
        if (!ok) { toastError('Password reset service not available offline.'); return; }
        await firebase.auth().sendPasswordResetEmail(email);
        toastSuccess('Reset email sent. Check your inbox.');
        hide(panel);
      } catch(e) { toastError(e?.message || 'Failed to send reset email'); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
