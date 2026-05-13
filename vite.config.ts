import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(Date.now().toString()),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: 'generate-version-json',
      writeBundle() {
        const version = { version: Date.now().toString() };
        fs.writeFileSync('dist/version.json', JSON.stringify(version));
        console.log('version.json generated');
      }
    },
    VitePWA({
      registerType: "prompt",
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "robots.txt", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "ProspecLead",
        short_name: "ProspecLead",
        description:
          "CRM gamificado para promoters — funciona offline e sincroniza automaticamente.",
        theme_color: "#0a3d99",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "pt-BR",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/api\//,
          /^\/functions\//,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth|functions)\/.*/i,
            handler: "NetworkOnly",
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        // Força a invalidação de cache mudando o nome do arquivo a cada deploy
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
