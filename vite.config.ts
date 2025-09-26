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
      minify: isProduction ? "esbuild" : false,
      sourcemap: !isProduction,
      chunkSizeWarningLimit: 500, // Lower warning threshold
      assetsInlineLimit: 2048, // Smaller inline limit
      reportCompressedSize: false, // Disable compressed size reporting for faster builds
      cssCodeSplit: true, // Enable CSS code splitting
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
              // React ecosystem
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              // Three.js ecosystem - separate from other vendors
              if (id.includes('three') || id.includes('@react-three')) {
                return 'vendor-threejs';
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
              // Everything else goes to a smaller vendor chunk
              return 'vendor-misc';
            }
            
            // Application chunks
            if (id.includes('/admin/') || id.includes('/pages/AdminDashboard')) {
              return 'admin';
            }
            
            if (id.includes('/3d-model/') || id.includes('/configurator/') || id.includes('/ar/')) {
              return '3d-models';
            }
            
            if (id.includes('/shop/') || id.includes('/pages/Products') || id.includes('/pages/Shop')) {
              return 'shop';
            }
            
            if (id.includes('/components/ui/') || id.includes('/shared/ui/')) {
              return 'ui';
            }
            
            if (id.includes('/lib/') || id.includes('/hooks/') || id.includes('/context/')) {
              return 'utils';
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
        "react-router-dom",
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
        "react-use-gesture"
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
