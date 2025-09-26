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
  
  // EMERGENCY FIX: Add timestamp to force cache invalidation
  const buildTimestamp = Date.now();

  return {
    base: '/',
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
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
      chunkSizeWarningLimit: 1000, // Increased to prevent warnings
      assetsInlineLimit: 2048,
      reportCompressedSize: false,
      cssCodeSplit: true,
      // EMERGENCY FIX: Add build timestamp to force cache invalidation
      rollupOptions: {
        maxParallelFileOps: 5,
        treeshake: {
          moduleSideEffects: true,
        },
        input: "index.html",
        external: [],
        output: {
          // EMERGENCY FIX: Add timestamp to filenames to force cache invalidation
          entryFileNames: `assets/[name]-${buildTimestamp}-[hash].js`,
          chunkFileNames: `assets/[name]-${buildTimestamp}-[hash].js`,
          // EMERGENCY FIX: Ultra-simplified chunking to ensure compatibility
          manualChunks: (id) => {
            // Force all lucide-react icons into a single chunk to prevent infinite chunking
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            
            // Keep main app code together
            if (id.includes('/src/') && !id.includes('node_modules')) {
              return 'app';
            }
            
            // Optimized vendor chunking to prevent large chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('three') || id.includes('@react-three')) {
                return 'vendor-threejs';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('@tanstack') || id.includes('react-router')) {
                return 'vendor-routing';
              }
              if (id.includes('framer-motion') || id.includes('@radix-ui')) {
                return 'vendor-ui';
              }
              if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
                return 'vendor-forms';
              }
              if (id.includes('date-fns') || id.includes('lodash') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'vendor-utils';
              }
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'vendor-i18n';
              }
              // Split remaining vendors into smaller chunks
              const hash = id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0);
              const chunkIndex = Math.abs(hash) % 5; // Split into 5 smaller chunks
              return `vendor-misc-${chunkIndex}`;
            }
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const ext = info[info.length - 1];

            if (
              /\\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || "")
            ) {
              return `assets/[name]-${buildTimestamp}-[hash].${ext}`;
            }

            if (/\\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || ""))
            {
              return `assets/[name]-${buildTimestamp}-[hash].${ext}`;
            }

            if (/\\.css$/i.test(assetInfo.name || ""))
            {
              return `assets/[name]-${buildTimestamp}-[hash].${ext}`;
            }

            return `assets/[name]-${buildTimestamp}-[hash].${ext}`;
          },
        },
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
    },

    optimizeDeps: {
      force: true, // EMERGENCY FIX: Force re-optimization
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react-reconciler",
        "react-router-dom",
        "lucide-react" // EMERGENCY FIX: Include lucide-react in pre-bundling
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
        // "lucide-react", // REMOVED: Now included in pre-bundling
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