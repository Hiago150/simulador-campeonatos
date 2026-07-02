import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: '/simulador-campeonatos/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Simulador de Campeonatos',
        short_name: 'Simcamp',
        description: 'Crie e simule campeonatos de futebol e e-sports — vários formatos, times reais ou criados por você.',
        lang: 'pt-BR',
        theme_color: '#0a0a0b',
        background_color: '#0a0a0b',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        // precache da casca do app (offline); imagens (escudos) em cache de runtime
        globPatterns: ['**/*.{js,css,html,woff2,svg}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'simcamp-images', expiration: { maxEntries: 320 } }
          }
        ]
      }
    })
  ],
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
