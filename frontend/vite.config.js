import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 1024,
      algorithm: 'gzip',
      ext: '.gz',
    }),
    visualizer({
      filename: 'dist/stats.html',
      title: 'TalentPulse AI Bundle Map',
      open: false, // Outputs to dist/stats.html, viewable manually
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group primary react frameworks
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('react-router-dom')
            ) {
              return 'vendor-core';
            }
            // Group charts dependencies
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // Group component styling and icons
            if (id.includes('@mui') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            // All other third party vendors
            return 'vendor-others';
          }
          // Split AI related features into its own lazy chunk
          if (
            id.includes('src/pages/RecuirmentAi.jsx') ||
            id.includes('src/components/SmartScheduler.jsx') ||
            id.includes('src/api/aiService.js')
          ) {
            return 'ai-features';
          }
        },
      },
    },
  },
});
