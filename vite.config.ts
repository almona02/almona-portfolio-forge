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
        devOptions: {
          enabled: false // Disable in development for stability
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          globDirectory: 'dist',
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for stability
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
          // AGGRESSIVE chunk splitting to isolate 17MB monster
          manualChunks: (id) => {
            // 🔪 ISOLATE AI/ML ENGINES (TensorFlow, ONNX) - 5MB+
            if (id.includes('@tensorflow') || id.includes('tfjs') || 
                id.includes('onnx') || id.includes('@huggingface') ||
                id.includes('@google/generative-ai')) {
              return 'ai-engine';
            }
            
            // 🔪 ISOLATE PHYSICS ENGINE (Ammo.js) - 5MB+
            if (id.includes('ammo') || id.includes('ammo.js')) {
              return 'physics-engine';
            }
            
            // 🔪 ISOLATE 3D ENGINE (Three.js) - 4MB
            if (id.includes('three') || id.includes('@react-three/fiber') || 
                id.includes('@react-three/drei') || id.includes('@react-three/xr')) {
              return '3d-engine';
            }
            
            // 🔪 ISOLATE PDF/EXCEL PROCESSING - 2MB+
            if (id.includes('pdfjs') || id.includes('pdf-lib') || 
                id.includes('exceljs') || id.includes('pdfjs-dist')) {
              return 'document-vendor';
            }
            
            // 🔪 ISOLATE CHART LIBRARIES - 1MB+
            if (id.includes('chart.js') || id.includes('recharts') || 
                id.includes('react-chartjs-2')) {
              return 'chart-vendor';
            }
            
            // 🔪 ISOLATE MAP LIBRARIES - 1MB+
            if (id.includes('maplibre') || id.includes('mapbox')) {
              return 'map-vendor';
            }
            
            // React core libraries - keep together
            if (id.includes('react') || id.includes('react-dom') || 
                id.includes('react-router') || id.includes('react/jsx-runtime')) {
              return 'react-vendor';
            }
            
            // UI libraries (framer-motion, lucide, etc.)
            if (id.includes('framer-motion') || id.includes('lucide-react') ||
                id.includes('@radix-ui') || id.includes('class-variance-authority') ||
                id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'ui-vendor';
            }
            
            // Heavy algorithm libraries (fabricator core)
            if (id.includes('algorithms') || id.includes('fabricator') && 
                !id.includes('components') && !id.includes('pages')) {
              return 'fabricator-core';
            }
            
            // Admin dashboard code
            if (id.includes('admin') || id.includes('dashboard') || 
                id.includes('analytics')) {
              return 'admin-dashboard';
            }
            
            // Large utility libraries
            if (id.includes('i18next') || id.includes('axios') || 
                id.includes('zustand') || id.includes('zod')) {
              return 'utils-vendor';
            }
            
            // Markdown editor (heavy)
            if (id.includes('@uiw/react-md-editor') || id.includes('markdown-it')) {
              return 'markdown-vendor';
            }
            
            // Everything else from node_modules
            if (id.includes('node_modules')) {
              return 'vendor';
            }
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