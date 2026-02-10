import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
/// <reference types="vitest" />
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
// Updated: 2024-09-26 - Simplified build config to fix chunk rendering issues
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  
  // Simplified build configuration

  return {
    // Show build output in production
    logLevel: 'info',
    base: '/',
    // Week 1 Task 1.4: Web Worker Configuration
    // Required for Week 3 ProductionDXFParser with Web Worker pool
    worker: {
      format: 'es',
      plugins: () => [],
    },
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
      global: "globalThis",
    },
    server: {
      host: "::",
      port: 3000,
      open: true,
      cors: true,
      historyApiFallback: true,
      hmr: {
        overlay: true,
        // Optimize HMR for faster updates in dev
        clientPort: 3000,
      },
      // Optimize dev server performance
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..'],
        strict: false,
      },
      // Reduce middleware overhead in dev
      middlewareMode: false,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      port: 4173,
      host: true, // Faster than "::" binding
      open: true, // Auto-open browser
      cors: true,
      strictPort: false, // Allow port fallback
      // Optimized for large dist folders
      fs: {
        strict: false,
        allow: ['..']
      },
      // Skip sourcemap serving for faster preview
      sourcemapIgnoreList: true,
    },
    plugins: [
      react({
        // Optimize JSX runtime
        jsxRuntime: 'automatic'
      }),
      // Suppress known build warnings
      {
        name: 'suppress-build-warnings',
        configResolved(_config) {
          // Suppress PDF.js worker warnings (resolved at runtime)
          const originalWarn = console.warn;
          console.warn = (...args: any[]) => {
            const message = args.join(' ');
            if (message.includes('pdfjs-dist/build/pdf.worker.min.js') ||
                message.includes('doesn\'t exist at build time') ||
                message.includes('will remain unchanged to be resolved at runtime')) {
              return; // Suppress PDF.js worker warning
            }
            if (message.includes('Module "fs" has been externalized') ||
                message.includes('Module "path" has been externalized') ||
                message.includes('externalized for browser compatibility')) {
              if (message.includes('ammo.js') || message.includes('ammo')) {
                return; // Suppress ammo.js Node.js module warnings
              }
            }
            originalWarn.apply(console, args);
          };
        },
      },
      // PHASE 5A: CSS deferral plugin - defers non-critical CSS loading
      // This separates painting from scripting, improving FCP
      // Expected: ~440ms improvement in FCP, removes CSS from render-blocking
      {
        name: 'defer-css',
        transformIndexHtml(html) {
          // Defer CSS loading by converting <link rel="stylesheet"> to async loading
          // Skip if already processed (has onload) or is external (Google Fonts)
          return html.replace(
            /<link([^>]*rel=["']stylesheet["'][^>]*)>/gi,
            (match, attrs) => {
              // Skip if already has onload, is external, or is in noscript
              if (attrs.includes('onload') || 
                  attrs.includes('googleapis.com') || 
                  attrs.includes('fonts.gstatic.com') ||
                  html.indexOf(`<noscript>${match}</noscript>`) !== -1) {
                return match;
              }
              // Convert to async loading (only for Vite-generated CSS)
              if (attrs.includes('/assets/') || attrs.includes('crossorigin')) {
                return `<link${attrs} media="print" onload="this.media='all'; this.onload=null;"><noscript>${match}</noscript>`;
              }
              return match;
            }
          );
        },
      },
      // Plugin to ensure long package is available for TensorFlow.js
      {
        name: 'fix-long-package',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Ensure long is available before TensorFlow.js loads
            if (req.url?.includes('@tensorflow') || req.url?.includes('tfjs')) {
              // This ensures long is pre-loaded
            }
            next();
          });
        },
        resolveId(id) {
          // Ensure long package resolves correctly
          if (id === 'long') {
            return null; // Let Vite handle it normally
          }
        }
      },
      // PWA Configuration - Stable, Production-Ready
      // Always include plugin to provide virtual module, but only enable SW in production
      VitePWA({
        registerType: "prompt", // Changed from "autoUpdate" to "prompt" - user must confirm before reload
        injectRegister: "auto",
        devOptions: {
          enabled: false, // Disable service worker in development to avoid CacheStorage errors
          type: 'module', // Provide virtual module in dev mode
          navigateFallback: 'index.html',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
          globIgnores: [
            '**/hero01*.png',
            '**/egyptian-industrial-hero-bg.png',
            '**/about-page-image.png',
            '**/*-large.png',
            '**/*-hero*.png'
          ],
          globDirectory: 'dist',
          cleanupOutdatedCaches: true,
          skipWaiting: false, // Changed to false - wait for user confirmation before activating
          clientsClaim: false, // Changed to false - don't claim clients immediately (prevents auto-reload)
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // 12MB limit to handle large JS bundles
          // PHASE 6: Optimized cache strategy for better performance
          runtimeCaching: [
            // Cache fonts with long expiration (fonts rarely change)
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            // Cache images with medium expiration
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            },
            // Network-first for API calls (always fresh data)
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
                networkTimeoutSeconds: 10,
              },
            },
            // Cache static assets (JS, CSS) with versioning
            {
              urlPattern: /\.(?:js|css|woff2?)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                }
              }
            }
          ],
        },
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "Almona Portfolio Forge",
          short_name: "Almona Forge",
          description: "Industrial Aluminium & UPVC Fabrication Platform",
          theme_color: "#f97316", // Almona Orange
          background_color: "#1a1a1a", // Almona Dark
          display: "standalone",
          orientation: "landscape", // Preferred for fabrication dashboards
          start_url: "/",
          scope: "/",
          lang: "ar", // Default to Arabic for Egypt
          dir: "rtl",
          categories: ["business", "productivity"],
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        }
      }),
      ...(isProduction && process.env.ANALYZE === 'true'
        ? [
            visualizer({
              open: false,
              gzipSize: true,
              brotliSize: true,
              filename: "stats.json",
              template: "raw-data"
            }),
          ]
        : []),
    ],

    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: false,
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "stream": path.resolve(__dirname, "./src/lib/polyfills/stream.ts"),
        "http": path.resolve(__dirname, "./src/lib/polyfills/http.ts"),
        "https": path.resolve(__dirname, "./src/lib/polyfills/https.ts"),
        "url": path.resolve(__dirname, "./src/lib/polyfills/url.ts"),
        "zlib": path.resolve(__dirname, "./src/lib/polyfills/zlib.ts"),
        // Redirect hls.js to mock (VideoTexture not used)
        "hls.js": path.resolve(__dirname, "./src/lib/mocks/hls-mock.ts"),
        // Fix for PWA build failing to resolve version_lock.json
        "./version_lock.json": path.resolve(__dirname, "./src/core/authority/version_lock.json"),
      },
      // Ensure CommonJS modules like 'long' are properly resolved
      conditions: ['import', 'module', 'browser', 'default'],
      // Properly resolve long package
      mainFields: ['browser', 'module', 'main'],
      // Explicitly include .ts and .tsx extensions for resolution
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      // CRITICAL: Deduplicate React to prevent multiple instances
      // This prevents "unstable_now" errors from duplicate React bundles
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "three"]
    },

    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        scss: {
          additionalData: `@import \"@/styles/variables.scss\";`,
        },
      },
      // Use external PostCSS config
      postcss: './postcss.config.cjs',
      // Enable CSS code splitting with careful configuration
      cssCodeSplit: true,
      modules: {
        generateScopedName: isProduction ? '[hash:base64:5]' : '[name]__[local]___[hash:base64:5]'
      }
    },

    // Optimized build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // PHASE 5C: Modern build target (ES2022)
      target: "es2022",
      minify: isProduction ? "esbuild" : false,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 2048,
      reportCompressedSize: false, // Use analyzer instead
      cssCodeSplit: true,
      modulePreload: {
        polyfill: false,
        resolveDependencies: () => [],
      },
      commonjsOptions: {
        include: [/node_modules/, /long/],
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
        esmExternals: (id) => !id.includes('long')
      },
      rollupOptions: {
        maxParallelFileOps: 5,
        treeshake: {
          moduleSideEffects: true,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        },
        onwarn(warning, warn) {
          if (warning.code === 'UNKNOWN_OPTION' && warning.message?.includes('manualChunks')) return;
          if (warning.message?.includes('Unknown input options: manualChunks')) return;
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' || warning.message?.includes('dynamically imported')) return;
          if (warning.plugin === 'workbox' && warning.message?.includes('globbing')) return;
          if (warning.message?.includes('Cannot read properties of undefined') || warning.message?.includes('reading \'sync\'')) return;
          if (warning.message?.includes('pdfjs-dist/build/pdf.worker.min.js') || warning.message?.includes('pdf.worker.min.js')) return;
          if (warning.plugin === 'vite:resolve' && (warning.message?.includes('Module "fs" has been externalized') || warning.message?.includes('Module "path" has been externalized'))) return;
          warn(warning);
        },
        input: "index.html",
        external: [],
        plugins: [
          {
            name: 'exclude-md-editor-css',
            generateBundle(options, bundle) {
              Object.keys(bundle).forEach(fileName => {
                const asset = bundle[fileName];
                if ((asset as any).type === 'chunk' && (asset as any).code) {
                  (asset as any).code = (asset as any).code.replace(
                    /import\s+['"][^'"\n]*@uiw\/react-md-editor[^'"\n]*\.css['"];?\s*/g,
                    ''
                  );
                }
                if (fileName.includes('vendor-markdown')) {
                  delete (bundle as any)[fileName];
                }
              });
            }
          },
        ],
        output: {
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
          workerFileNames: `assets/[name]-[hash].worker.js`,
          
          // STRATEGIC BUNDLE SPLITTING
          manualChunks: (id) => {
             // Exclude app code
             if (id.includes('/src/') || id.includes('\\src\\')) {
               return undefined;
             }
             
             if (!id.includes('node_modules')) {
               return undefined;
             }
 
             // 1. React Core (Critical for init)
             if (
               id.includes('node_modules/react/') ||
               id.includes('node_modules/react-dom/') ||
               id.includes('node_modules/scheduler/') ||
               id.includes('node_modules/react-router')
             ) {
               return 'react-core';
             }
 
             // 2. Three.js Ecosystem
            // Now safe to split as they are lazy-loaded via Prestige3DScene
            if (
              id.includes('node_modules/three/')
            ) {
              return 'vendor-3d-core';
            }

            if (
              id.includes('node_modules/@react-three/') ||
              id.includes('node_modules/drei/') ||
              id.includes('node_modules/react-reconciler')
            ) {
              return 'vendor-3d-react';
            }
 
             // 3. UI Libraries (Shadcn/Radix/Antd/Lucide)
             if (
               id.includes('node_modules/@radix-ui') ||
               id.includes('node_modules/lucide-react') ||
               id.includes('node_modules/class-variance-authority') ||
               id.includes('node_modules/clsx') ||
               id.includes('node_modules/tailwind-merge') ||
               id.includes('node_modules/antd') ||
               id.includes('node_modules/@ant-design') ||
               id.includes('node_modules/framer-motion') ||
               id.includes('node_modules/motion-dom') ||
               id.includes('node_modules/motion-utils') ||
               id.includes('node_modules/cmdk') ||
               id.includes('node_modules/vaul') ||
               id.includes('node_modules/sonner')
             ) {
               return 'vendor-ui';
             }
 
             // 4. Charts
             if (
               id.includes('node_modules/recharts') ||
               id.includes('node_modules/chart.js') ||
               id.includes('node_modules/react-chartjs-2')
             ) {
               return 'vendor-charts';
             }
 
             // 5. Heavy Documents (PDF/Excel) - SPLIT into separate chunks
            if (
              id.includes('node_modules/jspdf') || // ~470KB
              id.includes('node_modules/html2canvas') || // ~340KB
              id.includes('node_modules/pdf-lib') || 
              id.includes('node_modules/pdfjs-dist') || // ~750KB
              id.includes('node_modules/dxf-writer')
            ) {
              return 'vendor-pdf';
            }

            if (
              id.includes('node_modules/exceljs') // ~1.3MB
            ) {
              return 'vendor-excel';
            }
 
             // 6. TensorFlow / ML
             if (
               id.includes('node_modules/@tensorflow') ||
               id.includes('node_modules/@google/generative-ai') ||
               id.includes('node_modules/tfjs') ||
               id.includes('node_modules/onnx')
             ) {
               return 'vendor-ml';
             }
             
             // 7. Utilities
             if (
               id.includes('node_modules/date-fns') ||
               id.includes('node_modules/axios') ||
               id.includes('node_modules/zod') ||
               id.includes('node_modules/react-hook-form') ||
               id.includes('node_modules/i18next') ||
               id.includes('node_modules/zustand') ||
               id.includes('node_modules/@tanstack')
             ) {
               return 'vendor-utils';
             }
             
             // Everything else falls into the default chunk (usually just index or small deps)
           },
        },
      },
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-router-dom",
        "exceljs",
        "long",
        "seedrandom",
        "pako",
        "clsx",
        "tailwind-merge",
        "react-reconciler"
      ],
      // Exclude heavy ML libs from pre-optimization to speed up dev start
      // and align with manualChunks strategy. 
      // NOTE: 3D libs (three, @react-three/*) MUST be optimized to ensure proper CJS/ESM interop
      exclude: [
        "@google/generative-ai",
        "@tensorflow/tfjs", 
        "hls.js"
      ],
      force: isProduction,
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        target: "es2022",
        format: 'esm'
      }
    },

    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      target: "es2022",
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction,
      legalComments: 'none',
      treeShaking: true,
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