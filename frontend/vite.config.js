import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'pei-baddish-bruce.ngrok-free.dev',
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
    include: ['animejs']
  },
  build: {
    chunkSizeWarningLimit: 600,
    target: 'es2015',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React — always loaded
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Heavy animation libs — loaded only when needed
          if (id.includes('node_modules/framer-motion/')) return 'vendor-motion';
          if (id.includes('node_modules/animejs/')) return 'vendor-animejs';
          // Charts — admin only
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3') || id.includes('node_modules/victory')) return 'vendor-charts';
          // Icons — shared
          if (id.includes('node_modules/lucide-react/')) return 'vendor-icons';
          // TanStack Query
          if (id.includes('node_modules/@tanstack/')) return 'vendor-query';
        },
        // Content hash for long-term caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop()?.toLowerCase();
          if (['png','jpg','jpeg','gif','svg','webp'].includes(ext)) return 'assets/images/[name]-[hash][extname]';
          if (ext === 'css') return 'assets/css/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }

})

