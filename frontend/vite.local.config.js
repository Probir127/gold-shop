import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config.js';
export default mergeConfig(base, defineConfig({
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api'), 'import.meta.env.VITE_BACKEND_URL': JSON.stringify('') },
  server: { host:'127.0.0.1', port:5175, strictPort:true, watch:{usePolling:true,interval:300},
    proxy: { '/api':{target:'http://127.0.0.1:8001',changeOrigin:true}, '/media':{target:'http://127.0.0.1:8001',changeOrigin:true} }
  }
}));
