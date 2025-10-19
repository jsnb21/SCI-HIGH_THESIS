// Tailwind runtime config for this page
(function(){
  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    theme: {
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      extend: {
        colors: {
          primary: '#F4CE14',
          accent: '#379777',
          dark: '#1a1a2e',
          light: '#16213e',
          purple: '#9c27b0',
          cyan: '#00bcd4',
          textColor: '#ffffff',
          cardBg: 'rgba(22, 33, 62, 0.8)'
        },
        fontFamily: {
          gaming: ['Orbitron', 'monospace'],
          body: ['Exo 2', 'sans-serif']
        },
        animation: {
          'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
          'float': 'float 6s ease-in-out infinite',
          'slide-in': 'slide-in 0.8s ease-out',
          'bounce-in': 'bounce-in 1s ease-out'
        }
      }
    }
  };
})();
