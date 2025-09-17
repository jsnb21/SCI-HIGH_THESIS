import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export default defineConfig({
  base: '/SCI-HIGH_THESIS/',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        game: './game.html',
        leaderboards: './leaderboards.html',
        'professor-dashboard': './professor-dashboard.html',
        developer: './developer.html'
      },
    },
  },
  publicDir: 'public',
  plugins: [
    {
      name: 'copy-notifications',
      writeBundle() {
        // Copy notifications.js to maintain the same path structure
        try {
          mkdirSync('./dist/js', { recursive: true });
          copyFileSync('./js/notifications.js', './dist/js/notifications.js');
        } catch (error) {
          console.error('Failed to copy notifications.js:', error);
        }
      }
    },
    {
      name: 'copy-config',
      writeBundle() {
        // Copy config directory to maintain the same path structure
        try {
          mkdirSync('./dist/config', { recursive: true });
          copyFileSync('./config/firebase-config.js', './dist/config/firebase-config.js');
          copyFileSync('./config/env-config.json', './dist/config/env-config.json');
          copyFileSync('./config/api-key.txt', './dist/config/api-key.txt');
          console.log('✅ Config files copied to dist/config/');
        } catch (error) {
          console.warn('Some config files could not be copied:', error.message);
          // Still try to copy the essential firebase config
          try {
            copyFileSync('./config/firebase-config.js', './dist/config/firebase-config.js');
            copyFileSync('./config/env-config.json', './dist/config/env-config.json');
            console.log('✅ Essential config files copied');
          } catch (essentialError) {
            console.error('Failed to copy essential config files:', essentialError);
          }
        }
      }
    }
  ]
});
