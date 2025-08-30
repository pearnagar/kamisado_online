// client/vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')], // allow ../shared
    },
  },
});
