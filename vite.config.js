import { defineConfig } from 'vite';

export default defineConfig({
  base: '/SCI-HIGH_THESIS/',
  root: './docs',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
