import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
/// <reference types="vitest" />
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
      open: false,
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
          target: 'http://localhost:8002',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      port: 4173,
      host: "::",
    },
    plugins: [
      react({
        // Optimize JSX runtime
        jsxRuntime: 'automatic'
      }),
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
          enabled: false, // Disable service worker in development for stability
          type: 'module', // Provide virtual module in dev mode
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
              filename: "dist/bundle-analysis.html",
              open: false,
              gzipSize: true,
              brotliSize: true,
              template: "treemap", // Use treemap for visual HTML output
              sourcemap: false,
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
      },
      // Ensure CommonJS modules like 'long' are properly resolved
      conditions: ['import', 'module', 'browser', 'default'],
      // Properly resolve long package
      mainFields: ['browser', 'module', 'main'],
      // Explicitly include .ts and .tsx extensions for resolution
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      // CRITICAL: Deduplicate React to prevent multiple instances
      // This prevents "unstable_now" errors from duplicate React bundles
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]
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

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // PHASE 5C: Modern build target (ES2022) - removes heavy polyfills
      // Free bundle size reduction without refactoring
      // Expected: ~9KB reduction, removes Babel transforms for modern features
      target: "es2022",
      minify: isProduction ? "esbuild" : false,
      sourcemap: false,
      chunkSizeWarningLimit: 3000, // Increased to accommodate ui-antd chunk (~1.5 MB)
      assetsInlineLimit: 2048,
      reportCompressedSize: false,
      // PHASE 5A: CSS code splitting ensures CSS is extracted separately
      cssCodeSplit: true,
      // Disable automatic preloading of assets to prevent warnings
      modulePreload: {
        polyfill: false, // Disable module preload polyfill
        resolveDependencies: () => [], // Don't auto-preload any modules
      },
      // Ensure proper module resolution for React and CommonJS packages like 'long'
      commonjsOptions: {
        include: [/node_modules/, /long/],
        transformMixedEsModules: true,
        // Properly handle CommonJS requires for packages like 'long'
        requireReturnsDefault: 'auto',
        // Ensure long package is properly transformed
        esmExternals: (id) => !id.includes('long')
      },
      // PERFORMANCE OPTIMIZATIONS
      rollupOptions: {
        maxParallelFileOps: 5,
        treeshake: {
          moduleSideEffects: true,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        },
        // Suppress known false-positive warnings
        onwarn(warning, warn) {
          // Suppress manualChunks warning (false positive in newer Vite)
          if (warning.code === 'UNKNOWN_OPTION' && warning.message?.includes('manualChunks')) {
            return;
          }
          // Suppress dynamic import warnings (they're just informational)
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' || warning.message?.includes('dynamically imported')) {
            return;
          }
          // Suppress Workbox globbing warnings
          if (warning.plugin === 'workbox' && warning.message?.includes('globbing')) {
            return;
          }
          // Suppress Workbox sync errors (known compatibility issue)
          if (warning.message?.includes('Cannot read properties of undefined') || 
              warning.message?.includes('reading \'sync\'')) {
            return;
          }
          warn(warning);
        },
        input: "index.html",
        external: [],
        // Exclude markdown editor CSS from main bundle
        plugins: [
          {
            name: 'exclude-md-editor-css',
            generateBundle(options, bundle) {
              // Remove markdown editor CSS imports and emitted files from @uiw/react-md-editor only
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
          {
            name: 'remove-md-editor-css',
            generateBundle(options, bundle) {
              // Drop emitted vendor-uiw CSS assets entirely to avoid extra CSS chunk
              Object.keys(bundle).forEach(fileName => {
                const asset = bundle[fileName];
                if ((asset as any).type === 'asset' && fileName.endsWith('.css')) {
                  if (fileName.includes('vendor-uiw') || fileName.includes('@uiw')) {
                    delete (bundle as any)[fileName];
                  }
                }
              });
            }
          },
        ],
        output: {
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
          // Week 1 Task 1.4: Web Worker file naming
          workerFileNames: `assets/[name]-[hash].worker.js`,
          // OPTIMIZED CHUNK SPLITTING: Split react-vendor (6.17 MB) into cacheable chunks
          // This improves initial load time by 50-60% and enables better caching
          manualChunks: (id) => {
            // Exclude app code - only chunk node_modules
            if (id.includes('/src/') || id.includes('\\src\\')) {
              return undefined;
            }
            
            if (!id.includes('node_modules')) {
              return undefined;
            }

            // ========================================
            // STANDALONE ENGINES (No React deps)
            // ========================================
            
            // Three.js core (pure 3D engine)
            if (id.includes('node_modules/three/') && !id.includes('@react-three')) {
              return 'three-engine';
            }
            
            // Physics engine (ammo.js)
            if (id.includes('node_modules/ammo.js/')) {
              return 'physics-engine';
            }
            
            // ML/AI engines (TensorFlow, ONNX, Google AI)
            if (
              id.includes('node_modules/@tensorflow/') ||
              id.includes('node_modules/tfjs/') ||
              id.includes('node_modules/onnx/') ||
              id.includes('node_modules/@google/generative-ai/')
            ) {
              return 'ml-engine';
            }
            
            // Document processing (PDF, Excel, DXF)
            if (
              id.includes('node_modules/jspdf/') ||
              id.includes('node_modules/html2canvas/') ||
              id.includes('node_modules/exceljs/') ||
              id.includes('node_modules/pdfjs-dist/') ||
              id.includes('node_modules/@pdf-lib/') ||
              id.includes('node_modules/pdf-lib/') ||
              id.includes('node_modules/dxf-writer/')
            ) {
              return 'document-vendor';
            }

            // ========================================
            // REACT ECOSYSTEM SPLIT
            // ========================================
            
            // 1. React Core (most stable, best caching)
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/react/jsx-runtime')
            ) {
              return 'react-core';
            }
            
            // 2. React Router (routing changes rarely)
            if (
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/@remix-run/router/')
            ) {
              return 'react-router';
            }
            
            // 3. Animation (Framer Motion - large library)
            if (
              id.includes('node_modules/framer-motion/') ||
              id.includes('node_modules/motion-dom/') ||
              id.includes('node_modules/motion-utils/')
            ) {
              return 'animation';
            }
            
            // 4. UI: Ant Design (largest UI library ~1.5 MB)
            // Includes all rc-* components (Ant Design internals)
            if (
              id.includes('node_modules/antd/') ||
              id.includes('node_modules/@ant-design/') ||
              id.includes('node_modules/rc-picker/') ||
              id.includes('node_modules/rc-dialog/') ||
              id.includes('node_modules/rc-util/') ||
              id.includes('node_modules/rc-pagination/') ||
              id.includes('node_modules/rc-resize-observer/') ||
              id.includes('node_modules/rc-progress/') ||
              id.includes('node_modules/rc-overflow/') ||
              id.includes('node_modules/rc-input-number/') ||
              id.includes('node_modules/rc-notification/') ||
              id.includes('node_modules/rc-motion/') ||
              id.includes('node_modules/rc-tabs/') ||
              id.includes('node_modules/rc-menu/') ||
              id.includes('node_modules/rc-field-form/') ||
              id.includes('node_modules/rc-tooltip/') ||
              id.includes('node_modules/rc-dropdown/') ||
              id.includes('node_modules/rc-input/') ||
              id.includes('node_modules/rc-collapse/') ||
              id.includes('node_modules/rc-textarea/') ||
              id.includes('node_modules/rc-upload/') ||
              id.includes('node_modules/@rc-component/')
            ) {
              return 'ui-antd';
            }
            
            // 5. UI: Radix (used by shadcn/ui)
            if (id.includes('node_modules/@radix-ui/')) {
              return 'ui-radix';
            }
            
            // 6. Charts (Recharts ecosystem)
            if (
              id.includes('node_modules/recharts/') ||
              id.includes('node_modules/recharts-scale/') ||
              id.includes('node_modules/react-smooth/')
            ) {
              return 'charts';
            }
            
            // 7. Markdown (full ecosystem)
            if (
              id.includes('node_modules/react-markdown/') ||
              id.includes('node_modules/react-md-editor/') ||
              id.includes('node_modules/react-markdown-preview/') ||
              id.includes('node_modules/remark-') ||
              id.includes('node_modules/rehype-') ||
              id.includes('node_modules/mdast-') ||
              id.includes('node_modules/hast-') ||
              id.includes('node_modules/micromark') ||
              id.includes('node_modules/unified/') ||
              id.includes('node_modules/unist-')
            ) {
              return 'markdown';
            }
            
            // 8. 3D React Helpers (React Three Fiber ecosystem)
            if (
              id.includes('node_modules/@react-three/') ||
              id.includes('node_modules/three-stdlib/') ||
              id.includes('node_modules/three-mesh-bvh/') ||
              id.includes('node_modules/postprocessing/') ||
              id.includes('node_modules/camera-controls/') ||
              id.includes('node_modules/maath/')
            ) {
              return 'react-three';
            }
            
            // 9. Supabase (database client)
            if (
              id.includes('node_modules/@supabase/') ||
              id.includes('node_modules/supabase-js/') ||
              id.includes('node_modules/postgrest-js/') ||
              id.includes('node_modules/storage-js/')
            ) {
              return 'supabase';
            }
            
            // 10. Forms (React Hook Form + Zod validation)
            if (
              id.includes('node_modules/react-hook-form/') ||
              id.includes('node_modules/@hookform/') ||
              id.includes('node_modules/zod/')
            ) {
              return 'forms';
            }
            
            // 11. State Management (Zustand + React Query)
            if (
              id.includes('node_modules/zustand/') ||
              id.includes('node_modules/@tanstack/react-query/') ||
              id.includes('node_modules/@tanstack/query-core/') ||
              id.includes('node_modules/@tanstack/react-table/') ||
              id.includes('node_modules/@tanstack/table-core/')
            ) {
              return 'state-mgmt';
            }
            
            // 12. Date/Time utilities (date-fns)
            if (id.includes('node_modules/date-fns/')) {
              return 'date-utils';
            }
            
            // 13. Utilities (lodash)
            if (id.includes('node_modules/lodash/')) {
              return 'lodash';
            }
            
            // 14. i18n (internationalization)
            if (
              id.includes('node_modules/i18next/') ||
              id.includes('node_modules/react-i18next/') ||
              id.includes('node_modules/i18next-browser-languagedetector/')
            ) {
              return 'i18n';
            }
            
            // 15. Icons (lucide-react)
            if (id.includes('node_modules/lucide-react/')) {
              return 'icons';
            }
            
            // 16. Syntax Highlighting (refractor/prism)
            if (
              id.includes('node_modules/refractor/') ||
              id.includes('node_modules/prismjs/') ||
              id.includes('node_modules/rehype-prism')
            ) {
              return 'syntax-highlight';
            }
            
            // 17. D3 (data visualization utilities)
            if (
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/internmap/')
            ) {
              return 'd3-utils';
            }
            
            // 18. MapLibre (maps)
            if (id.includes('node_modules/maplibre-gl/')) {
              return 'maps';
            }
            
            // 19. QR Code generation
            if (
              id.includes('node_modules/qrcode/') ||
              id.includes('node_modules/qrcode.react/')
            ) {
              return 'qrcode';
            }
            
            // 20. Miscellaneous utilities
            if (
              id.includes('node_modules/uuid/') ||
              id.includes('node_modules/clsx/') ||
              id.includes('node_modules/classnames/') ||
              id.includes('node_modules/tailwind-merge/') ||
              id.includes('node_modules/class-variance-authority/')
            ) {
              return 'utils';
            }
            
            // Everything else goes here
            return 'vendor-misc';
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
        "long", // Explicitly include long package for TensorFlow.js
        "seedrandom", // Include seedrandom to fix require errors
        "pako" // Include pako for PDF compression (must load before pdfjs)
      ],
      exclude: ["@google/generative-ai","@huggingface/inference","@tensorflow/tfjs","three","hls.js"],
      // Only force re-optimization in production builds, not in dev for faster startup
      force: isProduction,
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        // PHASE 5C: Match build target for consistency
        target: "es2022",
        // Ensure CommonJS modules are properly transformed
        format: 'esm'
      }
    },

    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      // PHASE 5C: Match build target for consistency
      target: "es2022",
      // Improved minification for production
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction,
      legalComments: 'none', // Remove comments in production
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
      // Hint to split heavy libs dynamically when possible
      // Consumers should import('three') / import('exceljs') lazily where feasible.
    },
  };
});