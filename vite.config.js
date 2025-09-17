import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  base: '/SCI-HIGH_THESIS/',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      input: [
        './docs/index.html',
        './docs/game.html',
        './docs/leaderboards.html'
      ],
    },
  },
  plugins: [
    {
      name: 'copy-config-and-assets',
      writeBundle() {
        // Copy config directory to maintain the same path structure
        try {
          mkdirSync('./dist/config', { recursive: true });
          copyFileSync('./docs/config/firebase-config.js', './dist/config/firebase-config.js');
          copyFileSync('./docs/config/env-config.json', './dist/config/env-config.json');
          console.log('✅ Config files copied to dist/config/');
        } catch (error) {
          console.warn('Some config files could not be copied:', error.message);
          // Still try to copy the essential firebase config
          try {
            copyFileSync('./docs/config/firebase-config.js', './dist/config/firebase-config.js');
            copyFileSync('./docs/config/env-config.json', './dist/config/env-config.json');
            console.log('✅ Essential config files copied');
          } catch (essentialError) {
            console.error('Failed to copy essential config files:', essentialError);
          }
        }

        // Copy notifications.js to maintain the same path structure
        try {
          mkdirSync('./dist/js', { recursive: true });
          copyFileSync('./docs/js/notifications.js', './dist/js/notifications.js');
          console.log('✅ Notifications.js copied');
        } catch (error) {
          console.error('Failed to copy notifications.js:', error);
        }
      }
    }
  ]
});
