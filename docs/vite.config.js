import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export default defineConfig({
  base: '/SCI-HIGH_THESIS/',
  // Limit which hostnames can access the dev server (mitigates DNS rebinding).
  // Configure via env: ALLOWED_HOSTS or VITE_ALLOWED_HOSTS or __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
  // Example: ALLOWED_HOSTS=localhost,127.0.0.1,.ngrok-free.app
  server: {
    allowedHosts: (() => {
      const candidates = [
        process.env.ALLOWED_HOSTS,
        process.env.VITE_ALLOWED_HOSTS,
        process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
      ].filter(Boolean);
      if (candidates.length === 0) {
        // Default allow list can include known tunnels or domains used by the project
        return ['subradiative-aidan-unexotically.ngrok-free.dev'];
      }
      // Support comma or space separated values
      return candidates
        .join(',')
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    })()
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        game: './game.html',
        leaderboards: './leaderboards.html',
          news: './news.html',
        'professor-dashboard': './professor-dashboard.html',
        developer: './developer.html',
        admin: './admin.html'
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
          // Also copy admin-password.txt to the root of the dist folder so admin.html can fetch it
          try {
            copyFileSync('./admin-password.txt', './dist/admin-password.txt');
          } catch (passErr) {
            console.warn('admin-password.txt not copied (optional):', passErr.message);
          }
          console.log('✅ Config files copied to dist/config/');
        } catch (error) {
          console.warn('Some config files could not be copied:', error.message);
          // Still try to copy the essential firebase config
          try {
            copyFileSync('./config/firebase-config.js', './dist/config/firebase-config.js');
            copyFileSync('./config/env-config.json', './dist/config/env-config.json');
            try {
              copyFileSync('./admin-password.txt', './dist/admin-password.txt');
            } catch (passErr) {
              console.warn('admin-password.txt not copied (optional):', passErr.message);
            }
            console.log('✅ Essential config files copied');
          } catch (essentialError) {
            console.error('Failed to copy essential config files:', essentialError);
          }
        }
      }
    }
  ]
});
