import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export default defineConfig({
  base: '/SCI-HIGH_THESIS/dev/',
  build: {
    outDir: './dist-dev',
    emptyOutDir: true,
    sourcemap: true, // Include source maps for debugging
    minify: false,   // Don't minify for easier debugging
    rollupOptions: {
      input: {
        main: './index.html',
        game: './game.html',
        leaderboards: './leaderboards.html',
        'professor-dashboard': './professor-dashboard.html',
        developer: './developer.html',
        'dev-access': './dev-access.html'
      },
    },
  },
  publicDir: 'public',
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env.BUILD_TYPE': '"dev"',
    '__DEV__': true,
    '__PROD__': false,
    '__DEBUG_MODE__': true,
    '__ENABLE_CONSOLE_LOGS__': true
  },
  plugins: [
    {
      name: 'copy-notifications-dev',
      writeBundle() {
        // Copy notifications.js to maintain the same path structure
        try {
          mkdirSync('./dist-dev/js', { recursive: true });
          copyFileSync('./js/notifications.js', './dist-dev/js/notifications.js');
          console.log('✓ [DEV] Copied notifications.js to dist-dev/js/');
        } catch (error) {
          console.error('[DEV] Failed to copy notifications.js:', error);
        }
      }
    }
  ]
});