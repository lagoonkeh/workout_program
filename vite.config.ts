/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    // The Firestore chunk (~640 KB) is above the default but is loaded lazily after sign-in
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Checked before 'react' since the package name contains it
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // re2js is only used by Firestore; keep it in the lazily loaded Firestore chunk
            if (id.includes('firestore') || id.includes('re2js')) {
              return 'vendor-firestore';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            return 'vendor-libs';
          }
          // App code is split by Rollup at the React.lazy / import() boundaries; forcing src files into
          // manual chunks would pull shared core modules into them and make every chunk load up front.
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 6,
        minThreads: 2,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
