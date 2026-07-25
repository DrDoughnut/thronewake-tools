/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static site. Everything runs in the browser; there is no API layer.
// `base: './'` keeps the build portable — it works from a subdirectory
// (GitHub Pages project sites) as well as from a domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    setupFiles: ['./src/test-setup.ts'],
  },
});
