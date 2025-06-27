import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import devtools from 'vite-plugin-vue-devtools'
import { versionPlugin } from './vite-plugin-version'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), devtools(), versionPlugin()],
  base: '/flying-chess/',
  server: {
    // 允许内网访问
    host: '0.0.0.0',
    // 设置端口
    port: 5173,
    // 自动打开浏览器
    open: false,
    // 允许跨域
    cors: true,
    // 热更新配置
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue'],
        },
      },
    },
  },
})
