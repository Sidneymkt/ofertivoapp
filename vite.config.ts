import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: 'prompt',
      // Registration is handled by useServiceWorker so the React UI owns
      // the "new version available" state. A second injected register can
      // consume the update event before the button is mounted.
      injectRegister: false,
      includeAssets: ['favicon.ico', 'robots.txt', 'notification-sound.mp3'],
      manifest: {
        name: 'Ofertivo - Ofertas Locais Gamificadas',
        short_name: 'Ofertivo',
        description: 'Descubra ofertas incríveis em Manaus, ganhe pontos e participe de sorteios',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'https://storage.googleapis.com/gpt-engineer-file-uploads/JPKEQ3Sg09UQwFg2Zlg1WtYkX6o2/uploads/1762533492784-OFER_20251107_122014_0000.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'https://storage.googleapis.com/gpt-engineer-file-uploads/JPKEQ3Sg09UQwFg2Zlg1WtYkX6o2/uploads/1762533492784-OFER_20251107_122014_0000.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['shopping', 'lifestyle', 'social'],
        screenshots: [
          {
            src: 'https://storage.googleapis.com/gpt-engineer-file-uploads/JPKEQ3Sg09UQwFg2Zlg1WtYkX6o2/social-images/social-1762531660055-Posts Ofertivo Instagranm_20251107_111948_0000.png',
            sizes: '1200x630',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // skipWaiting/clientsClaim: false para que o SW novo fique em "waiting"
        // e o botão de atualização apareça. A ativação é forçada via SKIP_WAITING.
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        // Sem navigateFallback: evitamos servir index.html precacheado (que aponta
        // para chunks hasheados antigos) e deixamos a navegação usar NetworkFirst.
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            // Navegações HTML: sempre tenta rede primeiro para pegar o index.html
            // novo, que referencia os chunks hasheados atuais. Isso evita o erro
            // "Failed to fetch dynamically imported module" após deploy.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-navigations',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Assets hasheados do build (JS/CSS): CacheFirst por serem imutáveis.
            // cleanupOutdatedCaches remove versões antigas na ativação do SW novo.
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && (request.destination === 'script' || request.destination === 'style'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/wogenchxhjipmhfojker\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
        },
      },
    },
  },
}));
