import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import devtools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'
import { versionPlugin } from './vite-plugin-version'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    devtools(),
    versionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '飞行棋游戏',
        short_name: '飞行棋',
        description: '一个有趣的飞行棋游戏，支持多人游戏和陷阱设置',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/flying-chess/',
        start_url: '/flying-chess/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
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
  // 优化依赖处理
  optimizeDeps: {
    include: ['qr-scanner', 'qrcode'],
  },
})
