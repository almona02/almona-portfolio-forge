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
      // Temporarily disabled PWA plugin due to configuration issues
      // TODO: Re-enable with proper configuration
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
      //       }
      //     ]
      //   }
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
      minify: isProduction ? "terser" : false,
      terserOptions: isProduction ? {
        module: true,
        compress: {
          passes: 2,
          hoist_vars: false,
          hoist_funs: false,
        },
        mangle: true,
        safari10: true
      } : undefined,
      sourcemap: false, // Disable sourcemaps to speed up build
      chunkSizeWarningLimit: 1500, // Set to 1500 kB to allow for reasonable chunk sizes
      assetsInlineLimit: 4096, // Increased to inline more assets
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
          // Let Rollup decide optimal chunking to avoid brittle execution order issues
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
      exclude: [
        "@google/generative-ai",
        "@huggingface/inference",
        "@tensorflow/tfjs"
      ],
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
    },
  };
});