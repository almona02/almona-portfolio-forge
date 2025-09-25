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
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff,woff2}"],
          // Exclude the large stats file from the service worker
          globIgnores: ['**/stats.json'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
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
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo.svg", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "Almona Portfolio Forge - Industrial Machinery Solutions",
          short_name: "Almona",
          description: "Leading provider of industrial machinery, fabrication services, and technical solutions in Egypt and the Middle East.",
          theme_color: "#0d0f12",
          background_color: "#0d0f12",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            },
          ],
        },
      }),
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
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096,
      reportCompressedSize: false, // Disable compressed size reporting for faster builds
      rollupOptions: {
        treeshake: {
          moduleSideEffects: false,
        },
        input: "index.html",
        external: [],
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            const parts = id.split('node_modules/')[1].split('/')
            const pkg = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]

            // Core React ecosystem - keep together for better caching
            if (['react', 'react-dom', 'scheduler', 'react-is'].includes(pkg)) {
              return 'react-core'
            }

            // Three.js ecosystem - separate chunk for 3D libraries
            if (['three', '@react-three/drei', '@react-three/fiber', '@react-three/xr'].includes(pkg)) {
              return 'three-ecosystem'
            }

            // Large UI libraries - group Radix UI components
            if (pkg.startsWith('@radix-ui/')) {
              return 'ui-components'
            }

            // Chart libraries
            if (['recharts', 'react-chartjs-2', 'chart.js', 'd3-array', 'd3-color', 'd3-format', 'd3-interpolate', 'd3-path', 'd3-scale', 'd3-shape', 'd3-time', 'd3-time-format'].includes(pkg)) {
              return 'charts'
            }

            // Form libraries
            if (['react-hook-form', '@hookform/resolvers', 'zod'].includes(pkg)) {
              return 'forms'
            }

            // Specific large libraries that need their own chunks
            const specificChunks: Record<string, string> = {
              'react-router-dom': 'router',
              '@tanstack/react-query': 'query',
              '@tanstack/react-table': 'table',
              'framer-motion': 'animations',
              'lucide-react': 'icons',
              '@supabase/supabase-js': 'supabase',
              'axios': 'http-client',
              'i18next': 'i18n',
              'i18next-browser-languagedetector': 'i18n',
              'react-i18next': 'i18n',
              'react-helmet-async': 'seo',
              'react-day-picker': 'date-picker',
              'react-resizable-panels': 'panels',
              'react-media-recorder': 'media',
              'react-content-loader': 'loading',
              'embla-carousel-react': 'carousel',
              'pg': 'database',
              '@vercel/analytics': 'analytics'
            }

            if (specificChunks[pkg]) return specificChunks[pkg]

            // Handle refractor and syntax highlighting separately
            if (pkg.includes('refractor') || pkg.includes('prism')) {
              return 'syntax-highlighting'
            }

            // Group smaller utilities together
            if (['date-fns', 'class-variance-authority', 'clsx', 'tailwind-merge', 'tailwindcss-animate', 'tailwindcss-rtl', 'next-themes', 'cmdk', 'input-otp', 'jwt-decode', 'sonner', 'vaul', 'web-vitals', 'zustand', 'zxcvbn'].includes(pkg)) {
              return 'utilities'
            }

            // Group text processing libraries
            if (['markdown-it', 'markdown-to-jsx', '@uiw/react-markdown-preview', '@uiw/react-md-editor', 'dompurify'].includes(pkg)) {
              return 'text-processing'
            }

            // Group file processing libraries
            if (['file-saver', 'pdf-lib', 'xlsx'].includes(pkg)) {
              return 'file-processing'
            }

            // Group AI/ML libraries
            if (['@google/generative-ai', '@huggingface/inference', '@tensorflow/tfjs'].includes(pkg)) {
              return 'ai-ml'
            }

            // Default vendor chunk for remaining packages
            return 'vendor-misc'
          },

          chunkFileNames: 'js/[name]-[hash].js',

          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const ext = info[info.length - 1];

            if (
              /\\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || "")
            ) {
              return `images/[name]-[hash].${ext}`;
            }

            if (/\\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || ""))
            {
              return `fonts/[name]-[hash].${ext}`;
            }

            if (/\\.css$/i.test(assetInfo.name || ""))
            {
              return `css/[name]-[hash].${ext}`;
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
      ],
      exclude: [
        "@tensorflow/tfjs",
        "three",
        "@react-three/fiber",
        "@react-three/drei",
        "@react-three/xr",
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },

    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
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
    },
  };
});
