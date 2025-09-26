import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";

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
      react(),
      // Temporarily disabled PWA plugin due to globbing error
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
      //       },
      //     ],
      //   },
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
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: "esnext",
      minify: isProduction ? "terser" : false,
      sourcemap: !isProduction,
      chunkSizeWarningLimit: 150, // Balanced warning threshold
      assetsInlineLimit: 2048, // Smaller inline limit
      reportCompressedSize: false, // Disable compressed size reporting for faster builds
      cssCodeSplit: true, // Enable CSS code splitting
      rollupOptions: {
        maxParallelFileOps: 5, // Limit parallel operations to prevent memory issues
        output: {
          manualChunks: undefined, // Let Vite handle chunking automatically for now
        }
      },
      // Add better compression and optimization
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
        },
        mangle: {
          safari10: true
        }
      } : undefined,
      rollupOptions: {
        treeshake: {
          moduleSideEffects: true,
        },
        input: "index.html",
        external: [],
        output: {
          // Manual chunking for better code splitting
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          manualChunks: (id) => {
            // More aggressive vendor splitting
            if (id.includes('node_modules')) {
              // Debug large chunks
              if (isProduction && id.includes('node_modules')) {
                console.log('Chunking:', id);
              }
              
              // Special handling for very large packages
              if (id.includes('react-dom') || id.includes('react-dom/client')) {
                return 'vendor-react-dom';
              }
              if (id.includes('react') && !id.includes('react-dom')) {
                return 'vendor-react-core';
              }
              
              // React ecosystem
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                // Split React into smaller chunks
                const hash = id.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                return `vendor-react-${Math.abs(hash) % 8}`;
              }
              // Three.js ecosystem - separate from other vendors
              if (id.includes('three') || id.includes('@react-three')) {
                // Split Three.js into smaller chunks
                const hash = id.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                return `vendor-threejs-${Math.abs(hash) % 10}`;
              }
              // UI libraries
              if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('@radix-ui')) {
                return 'vendor-ui';
              }
              // Query and state management
              if (id.includes('@tanstack') || id.includes('zustand') || id.includes('jotai')) {
                return 'vendor-state';
              }
              // Supabase
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              // Form libraries
              if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
                return 'vendor-forms';
              }
              // Date and utility libraries
              if (id.includes('date-fns') || id.includes('lodash') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'vendor-utils';
              }
              // Animation libraries
              if (id.includes('gsap') || id.includes('lottie') || id.includes('framer-motion')) {
                return 'vendor-animations';
              }
              // Split remaining vendors into smaller chunks
              if (id.includes('lodash') || id.includes('ramda') || id.includes('moment') || id.includes('dayjs')) {
                return 'vendor-date-utils';
              }
              if (id.includes('axios') || id.includes('fetch') || id.includes('http')) {
                return 'vendor-http';
              }
              if (id.includes('chart') || id.includes('d3') || id.includes('recharts')) {
                // Split charts into smaller chunks
                const hash = id.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                return `vendor-charts-${Math.abs(hash) % 6}`;
              }
              if (id.includes('pdf') || id.includes('excel') || id.includes('csv')) {
                // Split documents into smaller chunks
                const hash = id.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                return `vendor-documents-${Math.abs(hash) % 6}`;
              }
              if (id.includes('crypto') || id.includes('hash') || id.includes('jwt')) {
                return 'vendor-crypto';
              }
              if (id.includes('i18n') || id.includes('locale') || id.includes('translation')) {
                return 'vendor-i18n';
              }
              // Large libraries that should be separate
              if (id.includes('monaco-editor') || id.includes('codemirror')) {
                return 'vendor-editor';
              }
              if (id.includes('tensorflow') || id.includes('ml5') || id.includes('brain.js')) {
                return 'vendor-ml';
              }
              if (id.includes('socket.io') || id.includes('ws') || id.includes('websocket')) {
                return 'vendor-websocket';
              }
              if (id.includes('prism') || id.includes('highlight') || id.includes('syntax')) {
                return 'vendor-syntax';
              }
              
              // Use a simple hash-based approach to split remaining vendors
              const hash = id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0);
              const chunkIndex = Math.abs(hash) % 100; // Split into 100 chunks for better balance
              return `vendor-misc-${chunkIndex}`;
            }
            
            // Application chunks
            if (id.includes('/admin/') || id.includes('/pages/AdminDashboard')) {
              // Split admin into smaller chunks
              const hash = id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0);
              return `admin-${Math.abs(hash) % 3}`;
            }
            
            if (id.includes('/3d-model/') || id.includes('/configurator/') || id.includes('/ar/')) {
              return '3d-models';
            }
            
            if (id.includes('/shop/') || id.includes('/pages/Products') || id.includes('/pages/Shop')) {
              // Split shop into smaller chunks
              const hash = id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0);
              return `shop-${Math.abs(hash) % 3}`;
            }
            
            if (id.includes('/components/ui/') || id.includes('/shared/ui/')) {
              return 'ui';
            }
            
            if (id.includes('/lib/') || id.includes('/hooks/') || id.includes('/context/')) {
              // Split utils into smaller chunks
              const hash = id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0);
              return `utils-${Math.abs(hash) % 3}`;
            }
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const ext = info[info.length - 1];

            if (
              /\\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || "")
            ) {
              return `assets/[name]-[hash].${ext}`;
            }

            if (/\\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || ""))
            {
              return `assets/[name]-[hash].${ext}`;
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
        "react-reconciler",
        "react-router-dom"
      ],
      exclude: [
        "@tensorflow/tfjs",
        // Three.js will be handled by manual chunks and loaded on demand
        "three",
        "@react-three/fiber", 
        "@react-three/drei",
        "@react-three/xr",
        "three-stdlib",
        // Exclude heavy libraries that should be loaded on demand
        "gsap",
        "lottie-react",
        "react-spring",
        "react-use-gesture",
        // Exclude more libraries to reduce initial bundle
        "@tanstack/react-query",
        "framer-motion",
        "lucide-react",
        "@supabase/supabase-js",
        "sonner",
        "next-themes",
        "react-i18next",
        "i18next",
        "react-hook-form",
        "@hookform/resolvers",
        "zod",
        "date-fns",
        "clsx",
        "tailwind-merge",
        "class-variance-authority"
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        // Optimize for better tree shaking
        treeShaking: true,
        // Target modern browsers for better optimization
        target: "es2020",
        // Add more aggressive optimization
        minifyIdentifiers: isProduction,
        minifySyntax: isProduction,
        minifyWhitespace: isProduction
      },
    },

    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      treeShaking: true,
      target: "es2020",
      // Enable minification for better compression
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction,
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
