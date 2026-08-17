// `defineConfig` comes from vitest, not vite: since vite 8 the `test` key is no
// longer merged into vite's own config type, so importing it from 'vite' makes
// `tsc -b` reject this file and the build gate never runs.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Static site. Everything runs in the browser; there is no API layer.
// `base: './'` keeps the build portable — it works from a subdirectory
// (GitHub Pages project sites) as well as from a domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // GitHub Pages can publish the `/docs` directory directly from `main`.
    // Keeping the generated site here lets the source and published site share
    // one branch without needing a deployment action or a second branch.
    outDir: 'docs',
    target: 'es2020',
  },
  test: {
    setupFiles: ['./src/test-setup.ts'],
  },
});
