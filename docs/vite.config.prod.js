import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export default defineConfig({
  base: '/SCI-HIGH_THESIS/',
  build: {
    outDir: './dist-prod',
    emptyOutDir: true,
    sourcemap: false, // No source maps for production
    minify: 'terser',  // Minify for production
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
    'process.env.NODE_ENV': '"production"',
    'process.env.BUILD_TYPE': '"prod"',
    '__DEV__': false,
    '__PROD__': true,
    '__DEBUG_MODE__': false,
    '__ENABLE_CONSOLE_LOGS__': false
  },
  plugins: [
    {
      name: 'copy-notifications-prod',
      writeBundle() {
        // Copy notifications.js to maintain the same path structure
        try {
          mkdirSync('./dist-prod/js', { recursive: true });
          copyFileSync('./js/notifications.js', './dist-prod/js/notifications.js');
          console.log('✓ [PROD] Copied notifications.js to dist-prod/js/');
        } catch (error) {
          console.error('[PROD] Failed to copy notifications.js:', error);
        }
      }
    }
  ]
});