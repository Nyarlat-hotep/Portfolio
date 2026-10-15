import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Matched by path rather than package name: the name form let Rollup
        // park react/jsx-runtime in vendor-three, which made the intro page
        // download three.js before it could render.
        manualChunks(id) {
          // Same problem for Vite's dynamic-import helper — keep it with React,
          // which every page loads anyway.
          if (id.includes('vite/preload-helper')) return 'vendor-react';
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(three|@react-three|three-stdlib|postprocessing)\//.test(id)) return 'vendor-three';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'vendor-motion';
        },
      },
    },
  },
})
