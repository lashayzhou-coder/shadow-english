import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/shadow-english/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      scope: '/shadow-english/',
      base: '/shadow-english/',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ShadowEnglish',
        short_name: '影子英语',
        description: '英语听说影子训练工具',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/shadow-english/',
        start_url: '/shadow-english/',
        icons: [
          {
            src: 'icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icons/icon-192x192.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'icons/icon-192x192.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: '开始听写',
            short_name: '听写',
            description: '快速进入听写模式',
            url: '/shadow-english/?mode=dictation',
            icons: [{ src: 'icons/icon-192x192.svg', sizes: '192x192' }]
          },
          {
            name: '打开生词本',
            short_name: '生词本',
            description: '快速打开生词本',
            url: '/shadow-english/?mode=vocab',
            icons: [{ src: 'icons/icon-192x192.svg', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.dictionaryapi\.dev\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dictionary-api',
              cacheableResponse: {
                statuses: [200]
              },
              expiration: {
                maxAgeSeconds: 7 * 24 * 60 * 60
              }
            }
          }
        ]
      }
    })
  ]
})
