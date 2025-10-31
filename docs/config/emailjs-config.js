// Copy this file to emailjs-config.js and fill in your EmailJS details.
// Using EmailJS lets the site send emails directly from the browser without exposing private server keys.
// Docs: https://www.emailjs.com/docs/

// Required keys (public key only; keep service/template IDs non-secret but avoid committing your keys to public repos)
window.EMAILJS_PUBLIC_KEY = '4o3suVUUTBBDMsw2y';
window.EMAILJS_SERVICE_ID = 'service_0a3qc86';
window.EMAILJS_TEMPLATE_ID = 'template_4in5lbb';

// Optional: disable mailto fallback entirely (recommended when EmailJS is configured)
window.FEEDBACK_MAILTO_FALLBACK_ENABLED = false;
window.FEEDBACK_OVERRIDE_RECIPIENTS = 'jamesscott.baronia@perpetual.edu.ph,jamesedward.verceles@perpetual.edu.ph,richardjoseph.delacruz@perpetual.edu.ph';

// Optional: also enqueue each feedback for a backend worker/Cloud Function to process for emails.
// Leave this false when using EmailJS-only to avoid duplicate entries in 'feedback_email_queue'.
window.FEEDBACK_ENABLE_QUEUE = false;
