import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg'],
      manifest: {
        name: 'NeuroLogic Coach - Cognitive Wellness Assistant',
        short_name: 'NeuroLogic',
        description: 'AI-powered cognitive wellness assistant for executive function support',
        theme_color: '#6366f1',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Start Timer',
            short_name: 'Timer',
            url: '/time',
            icons: [{ src: 'icon.svg', sizes: '192x192' }]
          },
          {
            name: 'Voice Dump',
            short_name: 'Voice',
            url: '/voice',
            icons: [{ src: 'icon.svg', sizes: '192x192' }]
          },
          {
            name: 'AI Coach',
            short_name: 'Coach',
            url: '/coach',
            icons: [{ src: 'icon.svg', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'anthropic-api',
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        headers: {
          'Origin': 'https://api.anthropic.com',
        },
      },
    },
  },
})
