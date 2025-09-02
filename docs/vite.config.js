import { defineConfig } from 'vite';

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
});
