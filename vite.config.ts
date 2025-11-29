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
      // Simplified PWA configuration for reliable builds
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        devOptions: {
          enabled: false // Disable in development to avoid build issues
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          // Fix for crypto.hash compatibility
          runtimeCaching: [],
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
      dedupe: ["react", "react-dom"]
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
      chunkSizeWarningLimit: 1000, // Reduced to 1000 kB for better performance
      assetsInlineLimit: 2048, // Reduced to prevent large inline assets
      reportCompressedSize: false,
      cssCodeSplit: true, // Enable CSS code splitting to reduce main bundle size
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
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
          // Optimize chunk splitting for better caching
          manualChunks: (id) => {
            // Vendor chunks - keep these separate for better caching
            if (id.includes('node_modules')) {
              // React and React DOM
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              // UI libraries
              if (id.includes('@radix-ui') || id.includes('@radix')) {
                return 'ui-vendor';
              }
              // Chart libraries
              if (id.includes('chart.js') || id.includes('react-chartjs')) {
                return 'chart-vendor';
              }
              // PDF libraries
              if (id.includes('pdf-lib') || id.includes('pdfjs')) {
                return 'pdf-vendor';
              }
              // Three.js and 3D libraries
              if (id.includes('three') || id.includes('@react-three')) {
                return 'three-vendor';
              }
              // Utility libraries
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'utils-vendor';
              }
              // Other large vendor libraries go into a common vendor chunk
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
              // Optimization engine
              if (id.includes('CuttingOptimizationEngine')) {
                return 'fabricator-algorithms';
              }
              // Other Fabricator components
              return 'fabricator-components';
            }
            
            // Algorithms directory
            if (id.includes('algorithms/')) {
              return 'fabricator-algorithms';
            }
            
            // Fabricator context
            if (id.includes('context/FabricatorWorkspaceContext')) {
              return 'fabricator-core';
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
        "react-router-dom",
        "exceljs"
      ],
      exclude: ["@google/generative-ai","@huggingface/inference","@tensorflow/tfjs","three"],
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
      // Hint to split heavy libs dynamically when possible
      // Consumers should import('three') / import('exceljs') lazily where feasible.
    },
  };
});