import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { dirname, join } from 'path';

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
      name: 'copy-static-resources',
      writeBundle() {
        // Recursively copy selected folders/files that are referenced directly by HTML (not bundled)
        const copyDir = (src, dest) => {
          try {
            if (!existsSync(src)) return;
            mkdirSync(dest, { recursive: true });
            for (const entry of readdirSync(src)) {
              const s = join(src, entry);
              const d = join(dest, entry);
              const st = statSync(s);
              if (st.isDirectory()) {
                copyDir(s, d);
              } else {
                copyFileSync(s, d);
              }
            }
          } catch (e) {
            console.warn(`Failed to copy directory ${src} -> ${dest}:`, e.message);
          }
        };

        try {
          // Ensure js root exists
          mkdirSync('./dist/js', { recursive: true });
          // Individual utility files
          if (existsSync('./js/notifications.js')) copyFileSync('./js/notifications.js', './dist/js/notifications.js');
          if (existsSync('./js/maintenanceToast.js')) copyFileSync('./js/maintenanceToast.js', './dist/js/maintenanceToast.js');
          // Page-specific scripts (kept as plain scripts vs bundling)
          copyDir('./js/pages', './dist/js/pages');
          // Leaderboards page modules used via dynamic import()
          copyDir('./js/leaderboards', './dist/js/leaderboards');
        } catch (error) {
          console.error('Failed to copy static resources:', error);
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
