import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
// Updated: 2024-09-26 - Simplified build config to fix chunk rendering issues
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  
  // Simplified build configuration

  return {
    base: '/',
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
      global: "globalThis",
    },
    server: {
      host: "::",
      port: 3000,
      open: false,
      cors: true,
      historyApiFallback: true,
      hmr: {
        overlay: true,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 4173,
      host: "::",
    },
    plugins: [
      react({
        // Enable React Fast Refresh for better development experience
        fastRefresh: true,
        // Optimize JSX runtime
        jsxRuntime: 'automatic'
      }),
      // Temporarily disabled PWA plugin due to configuration issues
      // TODO: Re-enable with proper configuration
      // VitePWA({
      //   registerType: "autoUpdate",
      //   injectRegister: "auto",
      //   workbox: {
      //     globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff,woff2}"],
      //     globIgnores: ['**/stats.json'],
      //     cleanupOutdatedCaches: true,
      //     skipWaiting: true,
      //     clientsClaim: true,
      //     navigateFallback: null,
      //     navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
      //   },
      //   includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo.svg", "pwa-192x192.png", "pwa-512x512.png"],
      //   manifest: {
      //     name: "Almona Portfolio Forge - Industrial Machinery Solutions",
      //     short_name: "Almona",
      //     description: "Leading provider of industrial machinery, fabrication services, and technical solutions in Egypt and the Middle East.",
      //     theme_color: "#0d0f12",
      //     background_color: "#0d0f12",
      //     display: "standalone",
      //     orientation: "portrait",
      //     start_url: "/",
      //     scope: "/",
      //     icons: [
      //       {
      //         src: "pwa-192x192.png",
      //         sizes: "192x192",
      //         type: "image/png",
      //         purpose: "any maskable"
      //       },
      //       {
      //         src: "pwa-512x512.png",
      //         sizes: "512x512",
      //         type: "image/png",
      //         purpose: "any maskable"
      //       }
      //     ]
      //   }
      // }),
      ...(isProduction
        ? [
            visualizer({
              filename: "dist/stats.json",
              open: false,
              gzipSize: true,
              brotliSize: true,
              template: "raw-data",
              // Disabled sourcemap to fix build warnings
              sourcemap: false,
            }),
          ]
        : []),
    ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "stream": path.resolve(__dirname, "./src/lib/polyfills/stream.ts"),
        "http": path.resolve(__dirname, "./src/lib/polyfills/http.ts"),
        "https": path.resolve(__dirname, "./src/lib/polyfills/https.ts"),
        "url": path.resolve(__dirname, "./src/lib/polyfills/url.ts"),
        "zlib": path.resolve(__dirname, "./src/lib/polyfills/zlib.ts"),
      },
    },

    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        scss: {
          additionalData: `@import \"@/styles/variables.scss\";`,
        },
      },
      // Optimize CSS processing
      postcss: {
        plugins: [
          // PostCSS plugins will be configured in postcss.config.cjs
        ]
      }
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: "esnext",
      minify: isProduction ? "esbuild" : false, // Use esbuild instead of terser for faster builds
      sourcemap: false, // Disable sourcemaps to speed up build
      chunkSizeWarningLimit: 2000, // Increased to prevent warnings
      assetsInlineLimit: 4096, // Increased to inline more assets
      reportCompressedSize: false,
      cssCodeSplit: false, // Disable CSS code splitting to simplify build
      // PERFORMANCE OPTIMIZATIONS
      rollupOptions: {
        maxParallelFileOps: 5,
        treeshake: {
          moduleSideEffects: true,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        },
        input: "index.html",
        external: [],
        output: {
          // Simplified chunking strategy to prevent build hanging
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          // Simplified manual chunks to prevent circular dependencies
          manualChunks: (id) => {
            // Keep main app code together
            if (id.includes('/src/') && !id.includes('node_modules')) {
              return 'app';
            }
            
            // Simple vendor chunking to prevent build issues
            if (id.includes('node_modules')) {
              // Core React ecosystem
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              
              // Three.js ecosystem
              if (id.includes('three') || id.includes('@react-three')) {
                return 'vendor-threejs';
              }
              
              // Supabase
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              
              // Everything else goes into vendor chunk
              return 'vendor';
            }
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const ext = info[info.length - 1];

            if (
              /\\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || "")
            ) {
              return `assets/images/[name]-[hash].${ext}`;
            }

            if (/\\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || ""))
            {
              return `assets/fonts/[name]-[hash].${ext}`;
            }

            if (/\\.css$/i.test(assetInfo.name || ""))
            {
              return `assets/[name]-[hash].${ext}`;
            }

            return `assets/[name]-[hash].${ext}`;
          },
        },
      },
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react-router-dom"
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        target: "es2020"
      },
    },

    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      target: "es2020"
    },

    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === "js") {
          return { js: `/${filename}` };
        } else {
          return { relative: true };
        }
      },
    },
  };
});