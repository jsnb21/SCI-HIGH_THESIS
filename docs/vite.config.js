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
          console.log('✓ Copied notifications.js to dist/js/');
        } catch (error) {
          console.error('Failed to copy notifications.js:', error);
        }
      }
    }
  ]
});
