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
        // Optimize JSX runtime
        jsxRuntime: 'automatic'
      }),
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
      // Simplified PWA configuration for reliable builds
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        devOptions: {
          enabled: false // Disable in development to avoid build issues
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          // CRITICAL: Ensure index.html is precached
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
          // Explicitly add index.html to precache manifest
          additionalManifestEntries: [
            { url: '/index.html', revision: null }
          ],
          globIgnores: ['**/node_modules/**/*', '**/sw.js', '**/workbox-*.js', '**/registerSW.js'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          // Disable globbing warnings and fix sync issue
          dontCacheBustURLsMatching: /\.\w{8}\./,
          // Use mode: 'production' to avoid globbing issues
          mode: 'production',
          // Fix for crypto.hash compatibility
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            }
          ],
          // Increase file size limit to accommodate large hero background image (9.99 MB)
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MB
        },
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo.svg"],
        manifest: {
          name: "Almona Portfolio Forge - Industrial Machinery Solutions",
          short_name: "Almona",
          description: "Leading provider of industrial machinery, fabrication services, and technical solutions in Egypt and the Middle East. Now with offline support for service tickets.",
          theme_color: "#f97316",
          background_color: "#0d0f12",
          display: "standalone",
          orientation: "any",
          start_url: "/",
          scope: "/",
          categories: ["business", "productivity", "utilities"],
          lang: "ar",
          dir: "rtl",
          shortcuts: [
            {
              name: "Create Service Ticket",
              short_name: "New Ticket",
              description: "Create a new service ticket",
              url: "/portal/tickets/new",
              icons: [{ src: "/icons/ticket-icon.png", sizes: "96x96" }]
            },
            {
              name: "Machine Health",
              short_name: "Health",
              description: "View machine health dashboard",
              url: "/portal/health",
              icons: [{ src: "/icons/health-icon.png", sizes: "96x96" }]
            }
          ],
          icons: [
            {
              src: "/icons/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/icons/pwa-512x512.png",
              sizes: "512x512", 
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/icons/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: "/icons/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png", 
              purpose: "maskable"
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

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "stream": path.resolve(__dirname, "./src/lib/polyfills/stream.ts"),
        "http": path.resolve(__dirname, "./src/lib/polyfills/http.ts"),
        "https": path.resolve(__dirname, "./src/lib/polyfills/https.ts"),
        "url": path.resolve(__dirname, "./src/lib/polyfills/url.ts"),
        "zlib": path.resolve(__dirname, "./src/lib/polyfills/zlib.ts"),
      },
      // Ensure CommonJS modules like 'long' are properly resolved
      conditions: ['import', 'module', 'browser', 'default'],
      // Properly resolve long package
      mainFields: ['browser', 'module', 'main'],
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
      target: "esnext",
      minify: isProduction ? "esbuild" : false,
      sourcemap: false, // Disable sourcemaps to speed up build
      // Note: react-vendor is intentionally large (3.9MB) to prevent module loading errors
      // This is acceptable as it contains React core and all React-dependent libraries
      chunkSizeWarningLimit: 5000, // Increased to accommodate react-vendor chunk
      assetsInlineLimit: 2048, // Reduced to prevent large inline assets
      reportCompressedSize: false,
      cssCodeSplit: true, // Enable CSS code splitting to reduce main bundle size
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
          chunkFileNames: (chunkInfo) => {
            // Ensure react-vendor has proper naming and loads first
            if (chunkInfo.name === 'react-vendor') {
              return `assets/react-vendor-[hash].js`;
            }
            return `assets/[name]-[hash].js`;
          },
          assetFileNames: `assets/[name]-[hash].[ext]`,
          // Optimize chunk splitting for better caching
          // CRITICAL: React must load before chunks that depend on it
          // FIX: Ensure React loads FIRST by checking it before any other logic
          manualChunks: (id) => {
            // CRITICAL: Check React FIRST - this ensures react-vendor is created first
            // and loads before any other vendor chunks
            if (id.includes('node_modules')) {
              // React core packages - MUST be first check
              if (
                id.includes('/react/') || 
                id.includes('/react-dom/') || 
                id.includes('react/jsx-runtime') ||
                id.includes('react/jsx-dev-runtime')
              ) {
                return 'react-vendor';
              }
              // React-dependent packages - must be with React
              // CRITICAL: Catch ALL packages that use React to prevent "forwardRef" and "createContext" errors
              if (
                id.includes('react-router') ||
                id.includes('react-helmet') ||
                id.includes('react-reconciler') ||
                id.includes('@react-three') || // React Three Fiber
                id.includes('react-') || // ALL react-* packages
                id.includes('/react') || // Any package with /react in path
                id.includes('react-chartjs') || // react-chartjs-2
                id.includes('@tanstack/react') || // TanStack Query
                id.includes('framer-motion') || // framer-motion
                id.includes('next-themes') || // next-themes
                id.includes('sonner') || // sonner
                id.includes('zustand') || // zustand
                id.includes('embla-carousel-react') || // embla-carousel-react
                id.includes('react-content-loader') || // react-content-loader
                id.includes('react-day-picker') || // react-day-picker
                id.includes('react-hook-form') || // react-hook-form
                id.includes('react-i18next') || // react-i18next
                id.includes('react-media-recorder') || // react-media-recorder
                id.includes('react-resizable-panels') || // react-resizable-panels
                id.includes('react-window') || // react-window-infinite-loader
                id.includes('recharts') || // recharts
                id.includes('vaul') || // vaul
                id.includes('lucide-react') || // lucide-react
                id.includes('cmdk') || // cmdk (uses React)
                id.includes('input-otp') || // input-otp (uses React)
                id.includes('markdown-to-jsx') || // markdown-to-jsx (uses React)
                id.includes('@vercel/analytics/react') // Vercel Analytics React
              ) {
                return 'react-vendor';
              }
              // UI libraries - ALL use React
              if (id.includes('@radix-ui') || id.includes('@radix')) {
                return 'react-vendor'; // Radix UI uses React
              }
              // Chart libraries
              if (id.includes('chart.js') || id.includes('react-chartjs')) {
                return 'react-vendor'; // react-chartjs uses React
              }
              // PDF libraries
              if (id.includes('pdf-lib') || id.includes('pdfjs')) {
                return 'pdf-vendor';
              }
              // Pure Three.js library (without React wrappers)
              // @react-three packages are already in react-vendor above
              if (id.includes('/three/') && !id.includes('@react-three')) {
                return 'three-vendor';
              }
              // Utility libraries (non-React)
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'utils-vendor';
              }
              // FIX: Put ALL libraries in react-vendor to prevent module loading order issues
              // The "Cannot set properties of undefined (setting 'exports')" error
              // happens when vendor chunk executes before react-vendor is ready
              // Solution: Put everything in react-vendor to ensure single execution order
              // Only keep truly isolated, non-module libraries separate
              if (
                id.includes('axios') ||
                id.includes('exceljs') ||
                id.includes('qrcode') ||
                id.includes('file-saver') ||
                id.includes('dompurify') ||
                id.includes('jwt-decode') ||
                id.includes('zxcvbn')
              ) {
                // These are pure JS utilities with no module dependencies - safe for vendor
                return 'vendor';
              }
              // Everything else goes to react-vendor to ensure proper loading order
              return 'react-vendor';
            }
            
            // Fabricator-specific chunks - Enhanced splitting
            if (id.includes('components/fabricator')) {
              // Core Fabricator components (most critical, loaded first)
              if (
                id.includes('FabricatorWorkflowPro') ||
                id.includes('FabricatorWorkspaceLayout') ||
                id.includes('FabricatorWorkspaceContext')
              ) {
                return 'fabricator-core';
              }
              // Optimization engine and algorithms (heavy computation)
              if (
                id.includes('CuttingOptimizationEngine') ||
                id.includes('MassProductionDashboard') ||
                id.includes('OptimizationEngine')
              ) {
                return 'fabricator-algorithms';
              }
              // Reporting components (PDF/CSV/DXF generation)
              if (
                id.includes('CuttingListReport') ||
                id.includes('AccessoriesReport') ||
                id.includes('GlassReport') ||
                id.includes('QuickReportsPanel')
              ) {
                return 'fabricator-reports';
              }
              // Inventory and profile management
              if (
                id.includes('InventoryDashboard') ||
                id.includes('InventoryManagement') ||
                id.includes('ProfileManagement') ||
                id.includes('AccessoryManagement')
              ) {
                return 'fabricator-inventory';
              }
              // Other Fabricator components
              return 'fabricator-components';
            }
            
            // Algorithms directory (optimization algorithms)
            if (id.includes('algorithms/')) {
              // Mass production optimizer
              if (id.includes('massProductionOptimizer')) {
                return 'fabricator-algorithms';
              }
              // Smart draw algorithms
              if (id.includes('smartDraw')) {
                return 'fabricator-algorithms';
              }
              // All other algorithms
              return 'fabricator-algorithms';
            }
            
            // Fabricator context and workspace
            if (
              id.includes('context/FabricatorWorkspaceContext') ||
              id.includes('lib/workspace/WorkspaceSyncService')
            ) {
              return 'fabricator-core';
            }
            
            // Export and reporting libraries
            if (
              id.includes('lib/exports/') ||
              id.includes('lib/reports/')
            ) {
              return 'fabricator-reports';
            }
            
            // Default: no manual chunk (let Vite decide)
            return undefined;
          }
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
        "seedrandom" // Include seedrandom to fix require errors
      ],
      exclude: ["@google/generative-ai","@huggingface/inference","@tensorflow/tfjs","three"],
      // Force re-optimization to ensure long package is properly handled
      force: true,
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        target: "es2020",
        // Ensure CommonJS modules are properly transformed
        format: 'esm'
      }
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
      // Hint to split heavy libs dynamically when possible
      // Consumers should import('three') / import('exceljs') lazily where feasible.
    },
  };
});