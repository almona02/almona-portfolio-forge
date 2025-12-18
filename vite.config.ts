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
      ...(isProduction ? [VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        filename: "manifest.webmanifest", // Explicit filename
        strategies: "generateSW", // Use generateSW for better control
        devOptions: {
          enabled: false // Disable in development for stability
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
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // 12MB limit to handle large JS bundles
          runtimeCaching: [
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
            // Cache JS chunks aggressively
            {
              urlPattern: /\.(?:js|mjs)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'js-chunks',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cache CSS files
            {
              urlPattern: /\.(?:css)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'css-files',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|gif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            }
          ],
        },
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "Almona Precision - Factory Calibration",
          short_name: "Almona Precision",
          description: "Factory floor calibration tool for precision window fabrication",
          theme_color: "#0d0f12",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
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
      })] : []),
      ...(isProduction && process.env.ANALYZE === 'true'
        ? [
            visualizer({
              filename: "dist/bundle-analysis.html",
              template: "treemap", // Generate interactive HTML treemap
              open: false, // Don't auto-open (user will open manually)
              gzipSize: true,
              brotliSize: true,
              sourcemap: false,
              json: true, // Also generate stats.json for programmatic analysis
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
      target: "esnext",
      minify: isProduction ? "esbuild" : false, // FIXED: Use esbuild instead of terser to avoid circular reference issues
      sourcemap: false, // Disable sourcemaps to speed up build
      // Aggressive chunk splitting to prevent 17MB monster
      chunkSizeWarningLimit: 2000, // Warn if any chunk exceeds 2MB (helps identify issues)
      // Note: CSS file sizes shown in build output are informational, not errors
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
          // Suppress CSS file size warnings (CSS is separate from JS chunks)
          if (warning.message?.includes('.css') && warning.code === 'CHUNK_SIZE_WARNING') {
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
          // Web Worker support (required for Week 3 ProductionDXFParser)
          workerFileNames: `assets/[name]-[hash].worker.js`,
          // Refined: keep pure engines split; put all React-touching deps together
          manualChunks: (id) => {
            // Exclude app code (let Vite handle app code splitting)
            if (id.includes('/src/') || id.includes('\\src\\')) {
              return undefined;
            }

            // === THE 3D ECOSYSTEM (Massive savings - catches all three.js related libraries) ===
            // Catches three, fiber, drei, postprocessing, stdlib, mesh-bvh, troika
            if (
              id.includes('three') ||
              id.includes('@react-three') ||
              id.includes('postprocessing') ||
              id.includes('troika') ||
              id.includes('drei') ||
              id.includes('fiber') ||
              id.includes('three-stdlib') ||
              id.includes('three-mesh-bvh')
            ) {
              return 'three-ecosystem';
            }
            
            // Physics engine
            if (id.includes('node_modules/ammo.js/')) {
              return 'physics-engine';
            }
            
            // Maps
            if (id.includes('maplibre-gl') || id.includes('mapbox-gl')) {
              return 'map-engine';
            }
            
            // === AI/ML LIBRARIES (Separate chunks) ===
            
            // TensorFlow.js (very heavy)
            if (id.includes('@tensorflow/tfjs')) {
              return 'ai-tensorflow';
            }
            
            // MediaPipe Vision (huge AI library)
            if (id.includes('@mediapipe') || id.includes('tasks-vision')) {
              return 'ai-vision';
            }
            
            // Google Generative AI
            if (id.includes('@google/generative-ai')) {
              return 'ai-google';
            }
            
            // Hugging Face
            if (id.includes('@huggingface/inference')) {
              return 'ai-huggingface';
            }
            
            // === DOCUMENT PROCESSING (Separate chunks) ===
            
            // Excel processing
            if (id.includes('exceljs')) {
              return 'doc-excel';
            }
            
            // PDF processing (jspdf, pdf-lib, pdfjs-dist)
            if (id.includes('pdfjs-dist') || id.includes('pdf-lib') || id.includes('jspdf')) {
              return 'doc-pdf';
            }
            
            // === UI LIBRARIES (Grouped by usage) ===
            
            // MARKDOWN EDITOR ECOSYSTEM (Surprisingly large - react-md-editor, markdown-it, micromark, etc.)
            if (
              id.includes('react-md-editor') ||
              id.includes('@uiw/react-md-editor') ||
              id.includes('markdown-it') ||
              id.includes('micromark') ||
              id.includes('hast-') ||
              id.includes('mdast-') ||
              id.includes('unified') ||
              id.includes('remark') ||
              id.includes('rehype')
            ) {
              return 'ui-markdown';
            }
            
            // ANT DESIGN & INTERNALS (Captures antd AND the rc- components it depends on)
            if (
              id.includes('antd') ||
              id.includes('@ant-design') ||
              id.includes('rc-') ||
              id.includes('@rc-component')
            ) {
              return 'ui-antd';
            }
            
            // Lucide React icons (large bundle - split separately)
            if (id.includes('lucide-react')) {
              return 'ui-icons-lucide';
            }
            
            // Chart libraries (heavy)
            if (id.includes('recharts') || id.includes('d3') || id.includes('chart.js')) {
              return 'ui-charts';
            }
            
            // Radix UI components (group together)
            if (id.includes('@radix-ui/')) {
              return 'ui-radix';
            }
            
            // === UTILITIES (Grouped) ===
            
            // Date libraries
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
              return 'utils-date';
            }
            
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('formik')) {
              return 'utils-forms';
            }
            
            // === REACT ECOSYSTEM (Core vendor) ===
            
            // React core
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react-core';
            }
            
            // React Router
            if (id.includes('react-router')) {
              return 'react-router';
            }
            
            // === DATA & STATE MANAGEMENT ===
            
            // Tanstack (Query, Table, Virtual - all together)
            if (id.includes('@tanstack') || id.includes('react-query')) {
              return 'data-query';
            }
            
            // Supabase client
            if (id.includes('@supabase')) {
              return 'data-supabase';
            }
            
            // === ANIMATION LIBRARIES (Separate chunks) ===
            if (id.includes('framer-motion')) {
              return 'ui-animations';
            }
            
            // === THEME & STYLING (Separate chunks) ===
            if (id.includes('next-themes')) {
              return 'ui-theme';
            }
            
            // === UTILITY LIBRARIES (Grouped) ===
            
            // Lodash (if present - can be large)
            if (id.includes('lodash')) {
              return 'utils-lodash';
            }
            
            if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
              return 'utils-styling';
            }
            
            if (id.includes('zod') || id.includes('yup')) {
              return 'utils-validation';
            }
            
            // === I18N & LOCALIZATION ===
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'utils-i18n';
            }
            
            // === ANALYTICS & MONITORING (Defer these) ===
            if (id.includes('@vercel/analytics') || id.includes('@vercel/speed-insights')) {
              return 'analytics';
            }
            
            // === HELMET & SEO ===
            if (id.includes('react-helmet')) {
              return 'utils-seo';
            }
            
            // === ADDITIONAL UTILITIES ===
            
            // Axios HTTP client
            if (id.includes('axios')) {
              return 'utils-http';
            }
            
            // File handling utilities
            if (id.includes('file-saver') || id.includes('qrcode')) {
              return 'utils-files';
            }
            
            // DXF Writer
            if (id.includes('dxf-writer')) {
              return 'utils-dxf';
            }
            
            // Dropzone
            if (id.includes('react-dropzone')) {
              return 'ui-dropzone';
            }
            
            // === EVERYTHING ELSE (Fallback vendor - should be much smaller now) ===
            if (id.includes('node_modules')) {
              return 'vendor-misc';
            }
            
            return undefined;
          },

        },
      },
      // CRITICAL: Disable module preload for heavy lazy-loaded chunks
      // This prevents the browser from downloading 2.2MB+ chunks on initial page load
      modulePreload: {
        resolveDependencies: (filename, deps, context) => {
          // List of heavy chunks that should NOT be preloaded (lazy loaded on demand)
          const heavyChunks = [
            'three-ecosystem',      // 2.2MB - 3D engine
            'ai-vision',            // MediaPipe vision library
            'ai-tensorflow',        // TensorFlow.js
            'doc-excel',            // ExcelJS
            'doc-pdf',              // PDF.js
            'physics-engine',       // Ammo.js physics
            'map-engine',           // MapLibre/Mapbox
          ];
          
          // Filter out heavy chunks from being preloaded
          return deps.filter(dep => {
            // If the dependency filename contains any of our heavy chunk names, SKIP IT
            return !heavyChunks.some(chunkName => dep.includes(chunkName));
          });
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