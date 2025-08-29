import { defineConfig } from 'vite';

export default defineConfig({
  base: '/SCI-HIGH_THESIS/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: '../index.html',
        game: '../html-pages/game.html',
        leaderboards: '../html-pages/leaderboards.html',
        'professor-dashboard': '../html-pages/professor-dashboard.html',
        developer: '../html-pages/developer.html'
      },
    },
  },
});
