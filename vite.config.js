import { defineConfig } from 'vite';

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
});
