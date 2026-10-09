import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@text-chat/shared': fileURLToPath(
        new URL('../shared/src', import.meta.url),
      ),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 9766,
    proxy: {
      '/api': { target: 'http://localhost:9765', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:9765',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('naive-ui')) return 'naive-ui';
            if (id.includes('vue')) return 'vue-vendor';
            if (id.includes('socket.io')) return 'socket-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
});
