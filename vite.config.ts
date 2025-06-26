import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import devtools from 'vite-plugin-vue-devtools'
import { versionPlugin } from './vite-plugin-version'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    devtools(),
    versionPlugin()
  ],
  base: '/flying-chess/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue']
        }
      }
    }
  }
}) 