// Visual effects: particles and nav hover
(function(){
  function createParticles() {
    const particles = document.getElementById('particles');
    if (!particles) return;
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 3 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
      particles.appendChild(particle);
    }
  }
  window.createParticles = createParticles;

  document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Nav hover underline effect background motion
    document.querySelectorAll('.gaming-nav-link').forEach(link => {
      link.addEventListener('mouseenter', function(){
        const bar = this.querySelector('div');
        if (bar) bar.style.transform = 'skewX(12deg) scaleX(1)';
      });
      link.addEventListener('mouseleave', function(){
        const bar = this.querySelector('div');
        if (bar) bar.style.transform = 'skewX(12deg) scaleX(0)';
      });
    });

    // Initialize particles
    createParticles();
    setInterval(() => {
      const parts = document.querySelectorAll('#particles div');
      parts.forEach(particle => {
        if (Math.random() > 0.95) {
          particle.style.transform = `translateY(${Math.random() * 20 - 10}px)`;
          setTimeout(() => { particle.style.transform = 'translateY(0)'; }, 2000);
        }
      });
    }, 3000);
  });
})();
