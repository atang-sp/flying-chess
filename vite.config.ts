import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { versionPlugin } from './vite-plugin-version'

// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
  const plugins = [
    vue(),
    versionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // The online room requires a live network connection. Serving a precached HTML shell can
        // leave an installed PWA on an old roster limit or invitation flow after a release.
        globIgnores: ['online.html'],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' && url.pathname.endsWith('/online.html'),
            handler: 'NetworkOnly',
          },
        ],
        // This is a multi-page app. Let the server/precache resolve these entry points instead of
        // serving the classic game's index.html for a refreshed invitation or controller URL.
        navigateFallbackDenylist: [/\/(?:online|controller)\.html(?:\?.*)?$/],
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
  ]

  const shouldEnableDevtools =
    command === 'serve' && mode !== 'test' && process.env.VITEST !== 'true'
  if (shouldEnableDevtools) {
    const { default: devtools } = await import('vite-plugin-vue-devtools')
    plugins.splice(1, 0, devtools())
  }

  return {
    plugins,
    base: '/flying-chess/',
    test: {
      setupFiles: ['src/tests/setup.ts'],
      include: [
        'src/tests/**/*.test.ts',
        'packages/**/*.test.ts',
        'apps/**/*.test.ts',
        'scripts/**/*.test.mjs',
      ],
      exclude: ['**/e2e/**', 'node_modules/**'],
    },
    server: {
      // 允许内网访问
      host: '0.0.0.0',
      // 设置端口
      port: 5173,
      // 自动打开浏览器
      open: false,
      // 允许跨域
      cors: true,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          controller: resolve(__dirname, 'controller.html'),
          online: resolve(__dirname, 'online.html'),
        },
        output: {
          manualChunks: {
            vendor: ['vue'],
          },
        },
      },
    },
    // 优化依赖处理
    optimizeDeps: {
      include: ['qrcode'],
    },
  }
})
