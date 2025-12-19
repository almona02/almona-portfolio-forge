import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
/// <reference types="vitest" />
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
// Updated: 2024-12-19 - Optimized bundle splitting for national scale deployment
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  

  return {
    base: '/',
    // Web Worker configuration (required for Week 3 ProductionDXFParser)
    worker: {
      format: 'es',
    },
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
      global: "globalThis",
      // Fix for Ant Design version property access
      'process.env.ANTD_VERSION': JSON.stringify('5.29.1'),
      // Fix for RC components version property access
      'process.env.RC_UTIL_VERSION': JSON.stringify('5.44.4'),
      // Additional RC component version defines to prevent undefined version errors
      'process.env.RC_PICKER_VERSION': JSON.stringify('3.7.0'),
      'process.env.RC_DIALOG_VERSION': JSON.stringify('9.3.0'),
      'process.env.RC_MENU_VERSION': JSON.stringify('10.0.0'),
      'process.env.RC_FIELD_FORM_VERSION': JSON.stringify('1.35.0'),
      'process.env.RC_INPUT_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_TABS_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_NOTIFICATION_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_PROGRESS_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_OVERFLOW_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_RESIZE_OBSERVER_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_PAGINATION_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_INPUT_NUMBER_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_MOTION_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_COLLAPSE_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_TEXTAREA_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_UPLOAD_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_DROPDOWN_VERSION': JSON.stringify('1.0.0'),
      'process.env.RC_TOOLTIP_VERSION': JSON.stringify('1.0.0'),
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
        resolveId(id) {
          if (id === 'long') {
            return { id: 'long', external: false };
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
              '**/*-hero*.png',
              '**/bundle-analysis.html', // Exclude bundle analysis from PWA cache
              '**/stats.json' // Exclude stats JSON from PWA cache
            ],
          globDirectory: 'dist',
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for heavy 3D chunks
          runtimeCaching: [
            {
              // CRITICAL: NEVER CACHE API REQUESTS - We want live cutting data, not stale cache
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              handler: 'NetworkOnly',
            },
            {
              // Google Fonts - Cache aggressively
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
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
      })] : []),
      
      // Bundle analyzer (only in production with ANALYZE=true)
      ...(isProduction && process.env.ANALYZE === 'true'
        ? [
            visualizer({
              filename: "./dist/bundle-analysis.html",
              template: "treemap", // Interactive treemap visualization (HTML, not JSON)
              open: false,
              gzipSize: true,
              brotliSize: true,
            }) as any,
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
        // Polyfills
        "stream": path.resolve(__dirname, "./src/lib/polyfills/stream.ts"),
        "http": path.resolve(__dirname, "./src/lib/polyfills/http.ts"),
        "https": path.resolve(__dirname, "./src/lib/polyfills/https.ts"),
        "url": path.resolve(__dirname, "./src/lib/polyfills/url.ts"),
        "zlib": path.resolve(__dirname, "./src/lib/polyfills/zlib.ts"),
        // Note: Let Vite handle heavy library resolution normally for better compatibility
      },
      conditions: ['import', 'module', 'browser', 'default'],
      mainFields: ['browser', 'module', 'main'],
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      // **IMPORTANT: Keep React deduped**
      dedupe: [
        "react", 
        "react-dom", 
        "react/jsx-runtime", 
        "react/jsx-dev-runtime",
        "antd",
        "@ant-design/icons",
        "rc-util"
      ]
    },

    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        scss: {
          additionalData: `@import \"@/styles/variables.scss\";`,
        },
      },
      postcss: './postcss.config.cjs',
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
      sourcemap: false,
      
      // **REDUCE CHUNK SIZE WARNING - Target 1MB chunks**
      chunkSizeWarningLimit: 1024,
      
      assetsInlineLimit: 2048,
      reportCompressedSize: false,
      cssCodeSplit: true,
      
      commonjsOptions: {
        include: [/node_modules/, /long/],
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
        esmExternals: (id) => !id.includes('long')
      },
      
      rollupOptions: {
        maxParallelFileOps: 3, // Reduce parallel ops for stability
        treeshake: {
          moduleSideEffects: true,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
          // **AGGRESSIVE TREE SHAKING**
          preset: 'smallest',
          annotations: true,
        },
        
        onwarn(warning, warn) {
          // Suppress specific warnings
          if (warning.code === 'UNKNOWN_OPTION' || 
              (warning.message && (
                warning.message.includes('manualChunks') || 
                warning.message.includes('Unknown input options') ||
                warning.message.includes('dynamically imported') ||
                warning.message.includes('MODULE_LEVEL_DIRECTIVE')
              ))) {
            return;
          }
          // Suppress Workbox warnings
          if (warning.plugin === 'workbox' || warning.message?.includes('workbox')) {
            return;
          }
          // Suppress CSS size warnings
          if (warning.message?.includes('.css') && warning.code === 'CHUNK_SIZE_WARNING') {
            return;
          }
          warn(warning);
        },
        
        input: "index.html",
        external: [],
        
        output: {
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
          workerFileNames: `assets/[name]-[hash].worker.js`,
          
          // **REVISED MANUAL CHUNKS - SAFER STRATEGY (Fixes Circular Dependencies)**
          manualChunks: (id) => {
            // Exclude app code
            if (id.includes('/src/') || id.includes('\\src\\')) {
              return undefined;
            }

            // **CRITICAL FIX: Keep Framer Motion separate**
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }

            // **CRITICAL: Keep Zod separate (common source of issues)**
            if (id.includes('zod')) {
              return 'vendor-zod';
            }

            // **CRITICAL: Keep Lodash separate**
            if (id.includes('lodash')) {
              return 'vendor-lodash';
            }

            // **TIER 1: HEAVY 3D & AI (Keep separate)**
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-three';
            }
            
            if (id.includes('@tensorflow/tfjs')) {
              return 'vendor-tfjs';
            }
            
            if (id.includes('@mediapipe') || id.includes('tasks-vision')) {
              return 'vendor-mediapipe';
            }
            
            if (id.includes('ammo.js')) {
              return 'vendor-physics';
            }

            // **TIER 2: DOCUMENT PROCESSING**
            if (id.includes('exceljs')) {
              return 'vendor-excel';
            }
            
            if (id.includes('pdfjs-dist') || id.includes('pdf-lib') || id.includes('jspdf')) {
              return 'vendor-pdf';
            }

            // **TIER 3: UI FRAMEWORKS (Split Ant Design for better loading)**
            
            // Ant Design icons (separate chunk - can be lazy loaded)
            if (id.includes('@ant-design/icons')) {
              return 'vendor-antd-icons';
            }
            
            // RC components (Ant Design base components - separate chunk)
            if (id.includes('rc-') && !id.includes('@ant-design')) {
              return 'vendor-rc-components';
            }
            
            // Ant Design core (main library - smaller now)
            if (id.includes('antd/es') || id.includes('antd/lib')) {
              return 'vendor-antd';
            }
            
            // Ant Design theme and utilities
            if (id.includes('@ant-design') && (id.includes('theme') || id.includes('colors'))) {
              return 'vendor-antd-theme';
            }

            // **TIER 4: CORE REACT**
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router')) {
              return 'vendor-react';
            }

            // **TIER 5: DATA & STATE**
            if (id.includes('@tanstack') || id.includes('@supabase')) {
              return 'vendor-data';
            }

            // **TIER 6: FORM LIBRARIES**
            if (id.includes('react-hook-form') || id.includes('formik') || id.includes('@hookform')) {
              return 'vendor-forms';
            }

            // **CRITICAL: Don't dump everything else into vendor-utils**
            // Let Vite handle the rest with its default chunking
            return undefined;
          },

          // **IMPORTANT: Better chunk optimization**
          minifyInternalExports: true,
          compact: true,
        },
      },
      
      // **DISABLE MODULE PRELOAD FOR HEAVY CHUNKS**
      modulePreload: {
        resolveDependencies: (filename, deps) => {
          const heavyChunks = [
            'vendor-three',
            'vendor-tfjs',
            'vendor-mediapipe',
            'vendor-excel',
            'vendor-pdf',
            'vendor-physics',
            'vendor-markdown',
            'vendor-forms', // Form libraries with initialization issues
            'vendor-framer', // Framer Motion (circular deps)
            'vendor-zod', // Zod (circular deps)
            'vendor-lodash', // Lodash (large utility)
          ];
          
          return deps.filter(dep => {
            return !heavyChunks.some(chunkName => dep.includes(chunkName));
          });
        },
        polyfill: false, // Don't polyfill modulepreload
      },
    },

    optimizeDeps: {
      // **OPTIMIZE DEPENDENCIES FOR BETTER SPLITTING**
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-router-dom",
        
        // Force optimization for better splitting
        "long",
        "seedrandom",
        "pako",
        
        // Include Ant Design icons for better optimization
        "@ant-design/icons",
      ],
      
      // **EXCLUDE HEAVY LIBRARIES FROM PRE-BUNDLING**
      exclude: [
        "@google/generative-ai",
        "@huggingface/inference",
        "@tensorflow/tfjs",
        "three",
        "exceljs",
        "pdfjs-dist",
        "@mediapipe/tasks-vision",
        "ammo.js",
        "@uiw/react-md-editor",
        // **CRITICAL: Exclude libraries with circular dependencies**
        "framer-motion",
        "zod",
        "lodash"
      ],
      
      force: true,
      
      esbuildOptions: {
        define: {
          global: "globalThis",
          // RC component version defines for pre-bundling
          'process.env.RC_UTIL_VERSION': JSON.stringify('5.44.4'),
          'process.env.RC_PICKER_VERSION': JSON.stringify('3.7.0'),
          'process.env.RC_DIALOG_VERSION': JSON.stringify('9.3.0'),
          'process.env.RC_MENU_VERSION': JSON.stringify('10.0.0'),
          'process.env.RC_FIELD_FORM_VERSION': JSON.stringify('1.35.0'),
        },
        target: "es2020",
        format: 'esm',
        // **CRITICAL: Fix circular dependencies**
        keepNames: true,
        legalComments: 'none',
        // **TREE SHAKE AT OPTIMIZATION TIME**
        treeShaking: true,
        minifyIdentifiers: false,
        minifySyntax: false,
        minifyWhitespace: false,
      }
    },

    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      target: "es2020",
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction,
      legalComments: 'none',
      treeShaking: true,
    },
  };
});
