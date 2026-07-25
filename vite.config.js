import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  base: '/SCI-HIGH_THESIS/',

  server: {
    // Limit which hostnames can access the dev server (mitigates DNS rebinding)
    allowedHosts: (() => {
      const candidates = [
        process.env.ALLOWED_HOSTS,
        process.env.VITE_ALLOWED_HOSTS,
        process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
      ].filter(Boolean);

      if (candidates.length === 0) {
        return ['localhost', '127.0.0.1', '.ngrok-free.app'];
      }

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
        admin: './admin.html',
        profile: './profile.html'
      },
    },
  },

  publicDir: 'public',

  plugins: [
    {
      name: 'copy-static-resources',
      writeBundle() {
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
          mkdirSync('./dist/js', { recursive: true });

          // Individual utility scripts
          if (existsSync('./js/notifications.js')) {
            copyFileSync('./js/notifications.js', './dist/js/notifications.js');
          }
          if (existsSync('./js/maintenanceToast.js')) {
            copyFileSync('./js/maintenanceToast.js', './dist/js/maintenanceToast.js');
          }
          if (existsSync('./js/professor-dashboard.js')) {
            copyFileSync('./js/professor-dashboard.js', './dist/js/professor-dashboard.js');
          }

          // Script directories
          copyDir('./js/pages', './dist/js/pages');
          copyDir('./js/leaderboards', './dist/js/leaderboards');

          // Copy runtime firebaseInit.js dynamic import fallback
          const firebaseInitSrc = './src/services/firebaseInit.js';
          if (existsSync(firebaseInitSrc)) {
            mkdirSync('./dist/src/services', { recursive: true });
            copyFileSync(firebaseInitSrc, './dist/src/services/firebaseInit.js');
            console.log('✅ Copied firebaseInit.js to dist/src/services/');
          } else {
            console.warn('⚠️ firebaseInit.js not found at ./src/services/firebaseInit.js');
          }
        } catch (error) {
          console.error('Failed to copy static resources:', error);
        }
      }
    },
    {
      name: 'copy-config',
      writeBundle() {
        try {
          mkdirSync('./dist/config', { recursive: true });
          const configDir = './config';

          if (existsSync(configDir)) {
            for (const entry of readdirSync(configDir)) {
              const src = join(configDir, entry);
              const st = statSync(src);
              if (st.isFile()) {
                copyFileSync(src, join('./dist/config', entry));
              }
            }
            console.log('✅ Config files copied to dist/config/');
          }

          // Optional password file copy
          if (existsSync('./admin-password.txt')) {
            copyFileSync('./admin-password.txt', './dist/admin-password.txt');
          }
        } catch (error) {
          console.warn('Some config files could not be copied:', error.message);
        }
      }
    }
  ]
});