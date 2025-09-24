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
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo.svg"],
        manifest: {
          name: "Almona Portfolio Forge",
          short_name: "Almona",
          description: "Almona Portfolio Forge Application",
          theme_color: "#ffffff",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
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
      chunkSizeWarningLimit: 500,
      assetsInlineLimit: 4096,

      rollupOptions: {
        input: "index.html",
        external: [],
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            const parts = id.split('node_modules/')[1].split('/')
            const pkg = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]

            const reactGraphVendors = new Set([
              'react',
              'react-dom',
              'scheduler',
              'react-is',
              'react-transition-group',
              'recharts',
              'react-smooth',
              'd3-array',
              'd3-color',
              'd3-format',
              'd3-interpolate',
              'd3-path',
              'd3-scale',
              'd3-shape',
              'd3-time',
              'd3-time-format',
              'victory',
              'victory-vendor'
            ])

            const groups: Record<string, string> = {
              ...(reactGraphVendors.has(pkg) ? { [pkg]: 'react-vendor' } : {}),
              'react-router-dom': 'router-vendor',
              '@tanstack/react-query': 'query-vendor',
              '@tanstack/react-table': 'table-vendor',
              three: 'three-vendor',
              '@react-three/drei': 'three-react',
              '@react-three/fiber': 'three-react',
              '@radix-ui/react-accordion': 'ui-vendor',
              '@radix-ui/react-dialog': 'ui-vendor',
              '@radix-ui/react-dropdown-menu': 'ui-vendor',
              '@radix-ui/react-select': 'ui-vendor',
              '@radix-ui/react-tabs': 'ui-vendor',
              'react-hook-form': 'form-vendor',
              '@hookform/resolvers': 'form-vendor',
              zod: 'form-vendor',
              'react-chartjs-2': 'chartjs-vendor',
              'chart.js': 'chartjs-vendor',
              'framer-motion': 'motion-vendor',
              'lucide-react': 'icons-vendor',
              '@supabase/supabase-js': 'supabase-vendor',
              'date-fns': 'date-vendor',
            }

            if (groups[pkg]) return groups[pkg]
            if (reactGraphVendors.has(pkg)) return 'react-vendor'
            return `vendor-${pkg.replace('@', '').replace('/', '-')}`
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
        "react-router-dom",
        "@tanstack/react-query",
        "framer-motion",
        "lucide-react",
        "@supabase/supabase-js",
      ],
      exclude: [
        "@tensorflow/tfjs",
        "three",
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
