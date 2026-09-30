import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getGitDate(): string {
  try {
    const date = execSync('git log -1 --format=%cd --date=format:%Y-%m-%dT%H:%M:%S%z', { encoding: 'utf-8' }).trim()
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/.test(date)) return date
    return new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      devOptions: {
        enabled: false,
        suppressWarnings: true
      },
      manifest: {
        id: 'de.gassi.app',
        name: 'Teamplaner',
        short_name: 'Teamplaner',
        description: 'Wer macht was? Zuteilungen, Bereiche und Statistik fuer dein Team',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait',
        background_color: '#e7e5e4',
        theme_color: '#3f3a34',
        handle_links: 'preferred',
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        related_applications: [],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['lifestyle'],
        screenshots: []
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gassi\.ipv64\.de\/api/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
              }
            }
          }
        ]
      }
    })
  ],
  define: {
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(getGitHash()),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(getGitDate()),
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
