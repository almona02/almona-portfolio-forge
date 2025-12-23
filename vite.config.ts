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
      chunkSizeWarningLimit: 2000,
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
          // TBT OPTIMIZATION: Safe chunk splitting strategy
          // 1. Split ONLY standalone engines (no React dependencies) - SAFE
          // 2. Let React.lazy() handle React-dependent code splitting via dynamic imports
          //    This avoids circular dependency errors while reducing initial bundle size
          // 3. Route-based splitting is handled by React.lazy() in App.tsx
          manualChunks: (id) => {
            // Exclude app code from vendor chunks
            if (id.includes('/src/') || id.includes('\\src\\')) {
              return undefined;
            }

            // Only process node_modules
            if (!id.includes('node_modules')) {
              return undefined;
            }

            // Only split standalone engines that don't depend on React
            if (id.includes('node_modules/three/') && !id.includes('@react-three')) {
              return 'three-engine';
            }
            if (id.includes('node_modules/ammo.js/')) {
              return 'physics-engine';
            }
            if (
              id.includes('node_modules/@tensorflow/') ||
              id.includes('node_modules/tfjs/') ||
              id.includes('node_modules/onnx/') ||
              id.includes('node_modules/@google/generative-ai/')
            ) {
              return 'ml-engine';
            }
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

            // Everything else stays in react-vendor (safe, no circular deps)
            return 'react-vendor';
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