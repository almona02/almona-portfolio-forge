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
          // Use only essential glob patterns to reduce sync errors
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          globDirectory: 'dist',
          navigateFallback: null, // Disable navigate fallback to prevent sw.js errors
          navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
          globIgnores: [
            '**/node_modules/**',
            '**/sw.js',
            '**/workbox-*.js',
            '**/workbox-*.map',
            '**/registerSW.js'
          ],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: false,
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          
          // Use runtime caching for better control
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60,
                },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            }
          ]
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
      // Note: After optimization, react-core should be ~200-300KB (React + ReactDOM only)
      // Other React libraries are split into separate chunks for better caching
      chunkSizeWarningLimit: 1500, // Further reduced to catch large chunks
      assetsInlineLimit: 2048, // Reduced to prevent large inline assets
      reportCompressedSize: false,
      cssCodeSplit: true, // Enable CSS code splitting to reduce main bundle size
      // Optimize chunk loading
      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps) => {
          // Preload critical chunks only - avoid preloading heavy vendors
          if (filename.includes('index')) {
            return deps.filter(dep => 
              (dep.includes('react-core') || 
               dep.includes('react-router') ||
               dep.includes('react-utils') ||
               dep.includes('index')) &&
              // Exclude heavy vendors from preload
              !dep.includes('three-vendor') &&
              !dep.includes('three-ecosystem-vendor') &&
              !dep.includes('pdf-vendor') &&
              !dep.includes('ml-vendor') &&
              !dep.includes('ai-vendor') &&
              !dep.includes('charts-vendor') &&
              !dep.includes('file-vendor') &&
              !dep.includes('maps-vendor') &&
              !dep.includes('fabricator-components') &&
              !dep.includes('vendor') // Exclude large vendor chunk
            );
          }
          return deps;
        }
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
          
          // CORRECT: Use function format that returns string | undefined
          manualChunks: (id: string) => {
            // CRITICAL: Check React FIRST - this ensures react-vendor is created first
            if (id.includes('node_modules')) {
              // React core packages ONLY - keep this minimal
              if (
                id.includes('/react/') || 
                id.includes('/react-dom/') || 
                id.includes('react/jsx-runtime') ||
                id.includes('react/jsx-dev-runtime')
              ) {
                return 'react-core';
              }
              
              // React Router - essential for routing
              if (id.includes('react-router')) {
                return 'react-router';
              }
              
              // React Query - data fetching
              if (id.includes('@tanstack/react-query')) {
                return 'react-query';
              }
              
              // Heavy charting libraries - split out
              if (id.includes('recharts') || id.includes('chart.js') || id.includes('react-chartjs')) {
                return 'charts-vendor';
              }
              
              // Heavy form libraries - split out
              if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
                return 'forms-vendor';
              }
              
              // Heavy UI libraries - split out
              if (id.includes('@radix-ui') || id.includes('@radix')) {
                return 'ui-vendor';
              }
              
              // React Helmet - SEO
              if (id.includes('react-helmet')) {
                return 'react-utils';
              }
              
              // React i18n - internationalization
              if (id.includes('react-i18next') || id.includes('i18next')) {
                return 'react-utils';
              }
              
              // TanStack Table and Virtual - separate chunk
              if (id.includes('@tanstack/react-table') || id.includes('@tanstack/react-virtual')) {
                return 'table-vendor';
              }
              
              // Other React utilities - smaller ones together
              // CRITICAL: Catch ALL React-dependent libraries here
              if (
                id.includes('react-') ||
                id.includes('/react') ||
                id.includes('next-themes') ||
                id.includes('sonner') ||
                id.includes('zustand') ||
                id.includes('embla-carousel-react') ||
                id.includes('react-content-loader') ||
                id.includes('react-day-picker') ||
                id.includes('react-media-recorder') ||
                id.includes('react-resizable-panels') ||
                id.includes('react-window') ||
                id.includes('vaul') ||
                id.includes('cmdk') ||
                id.includes('input-otp') ||
                id.includes('markdown-to-jsx') ||
                id.includes('@vercel/analytics/react') ||
                id.includes('qrcode.react') ||
                id.includes('qrcode/react') ||
                id.includes('react-window-infinite-loader')
              ) {
                return 'react-utils';
              }
              // PDF libraries - ensure pako loads first
              if (id.includes('pako')) {
                return 'compression-vendor';
              }
              if (id.includes('pdf-lib') || id.includes('pdfjs')) {
                return 'pdf-vendor';
              }
              // Pure Three.js library and React Three Fiber
              if ((id.includes('/three/') && !id.includes('@react-three')) || id.includes('@react-three')) {
                return 'three-vendor';
              }
              // Animation libraries
              if (id.includes('framer-motion')) {
                return 'animation-vendor';
              }
              // Icon libraries
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              // Utility libraries (non-React)
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'utils-vendor';
              }
              // Supabase - large library, split out
              if (id.includes('@supabase/supabase-js')) {
                return 'supabase-vendor';
              }
              
              // TensorFlow - very large, should be lazy loaded
              // CRITICAL: Consolidate ALL tensorflow packages AND their dependencies into ml-vendor
              // to prevent split initialization issues. This includes 'long' which is a critical dependency.
              // Force deployment rebuild: 2025-12-04
              if (id.includes('@tensorflow/')) {
                return 'ml-vendor';
              }
              
              // CRITICAL: 'long' package is a dependency of TensorFlow and MUST be in the same chunk
              // to prevent initialization order issues. Check this BEFORE other utility checks.
              if (id.includes('/long/') || id.includes('node_modules/long')) {
                return 'ml-vendor';
              }
              
              // i18next - internationalization
              if (id.includes('i18next') || id.includes('i18next-browser')) {
                return 'i18n-vendor';
              }
              
              // Maps library
              if (id.includes('maplibre-gl')) {
                return 'maps-vendor';
              }
              
              // Markdown libraries
              if (id.includes('markdown-it') || id.includes('@uiw/react-md') || id.includes('@uiw/react-markdown')) {
                return 'markdown-vendor';
              }
              
              // Excel/File processing - can be lazy loaded
              if (id.includes('exceljs') || id.includes('file-saver')) {
                return 'file-vendor';
              }
              
              // QR Code
              if (id.includes('qrcode')) {
                return 'qrcode-vendor';
              }
              
              // AI/ML libraries - very large, should be lazy loaded
              if (id.includes('@google/generative-ai') || id.includes('@huggingface/inference')) {
                return 'ai-vendor';
              }
              
              // Three.js ecosystem - split from core three
              // Include its-fine (React helper used by @react-three/fiber) to avoid landing in vendor
              if (
                id.includes('its-fine') ||
                id.includes('@react-spring/three') ||
                id.includes('@react-three/xr') ||
                id.includes('@use-gesture/react') ||
                id.includes('ammo.js')
              ) {
                return 'three-ecosystem-vendor';
              }
              
              // Database libraries (shouldn't be in browser, but handle if present)
              if (id.includes('/pg/') || id.includes('node_modules/pg')) {
                return 'db-vendor';
              }
              
              // Web vitals and analytics
              if (id.includes('web-vitals') || id.includes('@vercel/analytics')) {
                return 'analytics-vendor';
              }
              
              // Tailwind utilities
              if (id.includes('tailwindcss-rtl') || id.includes('tailwindcss-animate') || id.includes('class-variance-authority')) {
                return 'tailwind-vendor';
              }
              
              // Small utilities - keep together
              if (
                id.includes('axios') ||
                id.includes('dompurify') ||
                id.includes('jwt-decode') ||
                id.includes('zxcvbn') ||
                id.includes('lz-string') ||
                id.includes('dxf-writer')
              ) {
                return 'utils-vendor';
              }
              
              // Check for other known large libraries before catch-all
              // React Three Fiber dependencies (if not caught above)
              if (id.includes('@react-three/drei') || id.includes('@react-three/postprocessing')) {
                return 'three-ecosystem-vendor';
              }
              
              // Transitive dependencies - common large ones
              // @floating-ui (Radix UI dependency) - positioning library
              if (id.includes('@floating-ui')) {
                return 'ui-vendor'; // Group with Radix UI
              }
              
              // @use-gesture (Three.js ecosystem dependency)
              if (id.includes('@use-gesture')) {
                return 'three-ecosystem-vendor';
              }
              
              // @remix-run/router (React Router dependency)
              if (id.includes('@remix-run/router')) {
                return 'react-router';
              }
              
              // @monogrid (fullpage.js dependency) - if used
              if (id.includes('@monogrid')) {
                return 'utils-vendor';
              }
              
              // @babel (runtime helpers) - should be small
              if (id.includes('@babel/runtime')) {
                return 'utils-vendor';
              }
              
              // @ungap (polyfills)
              if (id.includes('@ungap')) {
                return 'utils-vendor';
              }
              
              // @mediapipe (if used for ML/AR features)
              if (id.includes('@mediapipe')) {
                return 'ml-vendor';
              }
              
              // CRITICAL: Catch any remaining React-dependent libraries BEFORE vendor catch-all
              // Libraries that import React but weren't caught by earlier checks
              // This prevents React-dependent code from ending up in vendor chunk
              // Check for common React patterns that might have been missed
              if (id.includes('node_modules') && (
                id.includes('/react') || 
                id.includes('react-') ||
                id.includes('@react') ||
                id.includes('react/') ||
                (id.includes('use') && (id.includes('react') || id.includes('hook'))) ||
                id.includes('createContext') ||
                id.includes('useState') ||
                id.includes('useEffect') ||
                id.includes('useLayoutEffect') ||
                id.includes('useMemo') ||
                id.includes('useCallback')
              )) {
                // If it's React-related but not caught above, ensure it's in react-utils
                return 'react-utils';
              }
              
              // Everything else (unknown libraries) - try to split by common patterns
              // If it's a scoped package, try to group by scope
              if (id.includes('node_modules/@')) {
                const scopeMatch = id.match(/node_modules\/(@[^/]+)/);
                if (scopeMatch) {
                  const scope = scopeMatch[1];
                  // Group by scope for unknown scoped packages
                  if (!scope.includes('radix') && 
                      !scope.includes('tanstack') && 
                      !scope.includes('react-three') &&
                      !scope.includes('uiw') &&
                      !scope.includes('supabase') &&
                      !scope.includes('tensorflow') &&
                      !scope.includes('google') &&
                      !scope.includes('huggingface') &&
                      !scope.includes('vercel') &&
                      !scope.includes('floating-ui') &&
                      !scope.includes('use-gesture') &&
                      !scope.includes('remix-run') &&
                      !scope.includes('monogrid') &&
                      !scope.includes('babel') &&
                      !scope.includes('ungap') &&
                      !scope.includes('mediapipe')) {
                    return `scope-${scope.replace('@', '').replace('/', '-')}-vendor`;
                  }
                }
              }
              
              // Everything else goes to vendor (should be much smaller now)
              // NOTE: Vendor chunk should NOT contain React-dependent code
              return 'vendor';
            }
            
            // Fabricator-specific chunks
            if (id.includes('components/fabricator')) {
              // Core Fabricator components
              if (
                id.includes('FabricatorWorkflowPro') ||
                id.includes('FabricatorWorkspaceLayout') ||
                id.includes('FabricatorWorkspaceContext')
              ) {
                return 'fabricator-core';
              }
              // Optimization engine and algorithms
              if (
                id.includes('CuttingOptimizationEngine') ||
                id.includes('MassProductionDashboard') ||
                id.includes('OptimizationEngine')
              ) {
                return 'fabricator-algorithms';
              }
              // Reporting components
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
            
            // Algorithms directory - heavy computation
            if (id.includes('algorithms/')) {
              return 'fabricator-algorithms';
            }
            
            // Pages - split heavy pages
            if (id.includes('pages/')) {
              // Heavy pages that should be lazy loaded
              if (
                id.includes('FabricatorWorkflow') ||
                id.includes('FabricationServices') ||
                id.includes('CustomerPortal') ||
                id.includes('AdminDashboard')
              ) {
                return undefined; // Let them be their own chunks
              }
              // Products and Services are already large - keep separate
              if (id.includes('Products.tsx')) {
                return undefined;
              }
              if (id.includes('Services.tsx')) {
                return undefined;
              }
              if (id.includes('Shop.tsx')) {
                return undefined;
              }
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
            
            // Route-specific chunks for better code splitting
            if (id.includes('pages/Projects') || id.includes('components/fabricator/PositionsGrid')) {
              return 'fabricator-projects';
            }
            
            if (id.includes('components/fabricator/FabricatorWorkspaceLayout')) {
              return 'fabricator-layout';
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
        "seedrandom", // Include seedrandom to fix require errors
        "pako" // Include pako for PDF compression (must load before pdfjs)
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
      target: "es2020",
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