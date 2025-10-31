// Feedback box logic: saves to Firebase Realtime Database and optionally emails site contacts.
(function(){
  const ta = document.getElementById('feedback-message');
  const btn = document.getElementById('send-feedback');
  const charEl = document.getElementById('feedback-char');
  const statusEl = document.getElementById('feedback-status');
  const policyEl = document.getElementById('feedback-policy');
  if (!ta || !btn) return;

  // live char counter
  function updateCounter(){ if (!charEl) return; const v = ta.value || ''; charEl.textContent = String(v.length); }
  ta.addEventListener('input', updateCounter); updateCounter();

  function getAllEmailsOnPage(){
    try {
      const emails = Array.from(document.querySelectorAll('#contact a[href^="mailto:"]'))
        .map(a => (a.getAttribute('href')||'').replace(/^mailto:/i,'').trim())
        .filter(Boolean);
      // de-dup
      return Array.from(new Set(emails));
    } catch(_) { return []; }
  }

  function showStatus(msg, type='info'){
    if (!statusEl) return;
    statusEl.classList.remove('hidden');
    statusEl.textContent = msg;
    statusEl.style.color = type === 'error' ? '#f87171' : type === 'success' ? '#86efac' : '#cbd5e1';
  }

  function guardByRole(){
    try {
      const am = window.authManager;
      if (!am || !am.currentUser) { btn.disabled = true; policyEl && (policyEl.textContent = 'Login as Student or General User to send feedback.'); return 'blocked'; }
      const t = am.userType;
      if (t !== 'student' && t !== 'general') { btn.disabled = true; policyEl && (policyEl.textContent = 'Only Students and General Users can send feedback.'); return 'blocked'; }
      btn.disabled = false; return 'ok';
    } catch(_) { return 'ok'; }
  }
  guardByRole();

  async function ensureFirebase(){
    if (typeof firebase !== 'undefined' && firebase.database) return true;
    try { if (window.authManager && window.authManager.firebaseInitPromise) { await window.authManager.firebaseInitPromise; return true; } } catch {}
    return false;
  }

  async function pushFeedback(message){
    await ensureFirebase();
    if (typeof firebase === 'undefined' || !firebase.database) throw new Error('Firebase not available');
    try { if (!firebase.auth().currentUser) { await firebase.auth().signInAnonymously(); } } catch(_) {}
    const am = window.authManager || { currentUser: null, userType: 'guest' };
    const nowIso = new Date().toISOString();
    const sendInfo = {
      message: String(message).slice(0,1000),
      createdAt: nowIso,
      senderUid: (firebase.auth().currentUser && firebase.auth().currentUser.uid) || (am.currentUser && am.currentUser.uid) || 'unknown',
      senderType: am.userType || 'guest',
      senderName: am?.currentUser?.profile?.fullName || am?.currentUser?.name || am?.currentUser?.email || am?.currentUser?.studentId || 'Anonymous',
      senderEmail: am?.currentUser?.email || null,
      studentId: am?.currentUser?.studentId || null,
      meta: { userAgent: navigator.userAgent, page: location.href }
    };
    const ref = firebase.database().ref('feedbacks').push();
    await ref.set(sendInfo);
    // Queue for optional email worker/functions
    try { await firebase.database().ref('feedback_email_queue').child(ref.key).set({ ...sendInfo, targets: getAllEmailsOnPage(), queuedAt: nowIso }); } catch {}
    return { key: ref.key, ...sendInfo };
  }

  // Optional: EmailJS support if configured (window.EMAILJS_*). This is best-effort.
  async function tryEmailSend(toEmails, subject, text){
    try {
      const pub = window.EMAILJS_PUBLIC_KEY; const service = window.EMAILJS_SERVICE_ID; const template = window.EMAILJS_TEMPLATE_ID;
      if (!pub || !service || !template) return false;
      if (!window.emailjs) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js';
          s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
      }
      if (!window.emailjs) return false;
      window.emailjs.init(pub);
      const payload = { to_email: toEmails.join(','), subject, message: text, page: location.href };
      await window.emailjs.send(service, template, payload);
      return true;
    } catch(_) { return false; }
  }

  btn.addEventListener('click', async () => {
    if (guardByRole() === 'blocked') { showStatus('Please login as Student or General User.', 'error'); return; }
    const msg = (ta.value || '').trim();
    if (!msg) { showStatus('Please enter a message.', 'error'); ta.focus(); return; }
    btn.disabled = true; showStatus('Sending...', 'info');
    try {
      const saved = await pushFeedback(msg);
      // Attempt email delivery (best effort)
      const recipients = getAllEmailsOnPage();
      const subject = 'SCI-HIGH Website Feedback';
      const body = `${saved.senderName} (${saved.senderType}${saved.studentId?(':'+saved.studentId):''})\n\n${msg}\n\nSent: ${new Date(saved.createdAt).toLocaleString()}`;
      let emailed = false;
      if (recipients.length) emailed = await tryEmailSend(recipients, subject, body);
      if (!emailed && recipients.length) {
        // Fallback: open mail client for the first address
        const mailto = `mailto:${encodeURIComponent(recipients[0])}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, '_blank');
      }
      showStatus('Thanks! Your feedback was sent successfully.', 'success');
      ta.value = ''; updateCounter();
    } catch (e) {
      console.error('feedback send failed:', e);
      showStatus('Failed to send feedback. Please try again later.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();
