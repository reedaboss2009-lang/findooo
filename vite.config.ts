import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Some libraries expect process.env to exist
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});