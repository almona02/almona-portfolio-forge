import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";
import gltf from "vite-plugin-gltf";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,  // Changed to avoid conflict with Tabby
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    imagetools(), // Image optimization plugin
    gltf({
      compress: true,
      draco: {
        compressionLevel: 10,
        quantizePosition: 14
      }
    }),
    // Temporarily disabled VitePWA due to dependency conflicts
    // VitePWA({ // PWA plugin for service workers and caching
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico', 'logo.png', 'apple-touch-icon.png'],
    //   manifest: {
    //     name: 'ALMONA Portfolio',
    //     short_name: 'ALMONA',
    //     description: 'ALMONA Co. Portfolio Website',
    //     theme_color: '#FF5F1F',
    //     icons: [
    //       {
    //         src: 'logo-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png',
    //       },
    //       {
    //         src: 'logo-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //       },
    //     ],
    //   },
    //   workbox: {
    //     runtimeCaching: [
    //       {
    //         urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
    //         handler: 'CacheFirst',
    //         options: {
    //           cacheName: 'images-cache',
    //           expiration: {
    //             maxEntries: 100,
    //             maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
    //           },
    //         },
    //       },
    //       {
    //         urlPattern: /api/,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'api-cache',
    //           networkTimeoutSeconds: 10,
    //           expiration: {
    //             maxEntries: 50,
    //             maxAgeSeconds: 60 * 60, // 1 hour
    //           },
    //         },
    //       },
    //     ],
    //   },
    // }),

    visualizer({ // Bundle analyzer plugin
      open: true,
      filename: "bundle-stats.html",
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('three') || id.includes('webxr')) {
              return 'vendor-ar';
            }
            if (id.includes('tensorflow') || id.includes('gemini')) {
              return 'vendor-ai';
            }
            return 'vendor-other';
          }
        }
      }
    }
  }
}));
