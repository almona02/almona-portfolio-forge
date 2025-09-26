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
      minify: isProduction ? "esbuild" : false, // Use esbuild instead of terser for faster builds
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
              // Remove markdown editor CSS from all chunks
              Object.keys(bundle).forEach(fileName => {
                const asset = bundle[fileName];
                if (asset.type === 'chunk' && asset.code) {
                  // Remove markdown editor CSS imports from chunk code
                  asset.code = asset.code.replace(
                    /import\s+['"][^'"]*@uiw\/react-md-editor[^'"]*\.css['"];?\s*/g,
                    ''
                  );
                }
                // Delete both JS and CSS files related to markdown (including vendor-markdown)
                if (fileName.includes('md-editor') || 
                    fileName.includes('markdown') || 
                    fileName.includes('@uiw') ||
                    fileName.includes('vendor-markdown')) {
                  delete bundle[fileName];
                }
              });
            }
          },
          {
            name: 'remove-md-editor-css',
            generateBundle(options, bundle) {
              // Remove CSS files that contain markdown editor styles
              Object.keys(bundle).forEach(fileName => {
                const asset = bundle[fileName];
                if (asset.type === 'asset' && fileName.endsWith('.css') && asset.source) {
                  const cssContent = asset.source.toString();
                  if (cssContent.includes('.wmde-markdown') || cssContent.includes('@uiw/react-md-editor')) {
                    // Remove markdown editor CSS from the file
                    const cleanedCSS = cssContent.replace(
                      /\.wmde-markdown[^{]*\{[^}]*\}/g,
                      ''
                    ).replace(
                      /@media[^{]*\{[^}]*\.wmde-markdown[^{]*\{[^}]*\}[^}]*\}/g,
                      ''
                    );
                    asset.source = cleanedCSS;
                  }
                }
              });
            }
          },
        ],
        output: {
          // Simplified chunking strategy to prevent build hanging
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          // Optimized chunking strategy to reduce bundle sizes
          manualChunks: (id) => {
            // Keep main app code together
            if (id.includes('/src/') && !id.includes('node_modules')) {
              return 'app';
            }
            
            // Granular vendor chunking to prevent large bundles
            if (id.includes('node_modules')) {
              // Core React ecosystem (exclude markdown editor)
              if ((id.includes('react') || id.includes('react-dom') || id.includes('react-router')) && !id.includes('@uiw/react-md-editor')) {
                return 'vendor-react';
              }
              
              // Three.js ecosystem (3D graphics)
              if (id.includes('three') || id.includes('@react-three')) {
                return 'vendor-threejs';
              }
              
              // Supabase
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              
              // UI Components (Radix UI, etc.)
              if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion')) {
                return 'vendor-ui';
              }
              
              // Chart and visualization libraries
              if (id.includes('chart.js') || id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              
              // Form and validation libraries
              if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
                return 'vendor-forms';
              }
              
              // Utility libraries
              if (id.includes('lodash') || id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'vendor-utils';
              }
              
              // Excel processing (separate from other files)
              if (id.includes('exceljs')) {
                return 'vendor-excel';
              }
              
              // File processing (separate from Excel)
              if (id.includes('file-saver') || id.includes('pdf-lib')) {
                return 'vendor-files';
              }
              
              // AI and ML libraries
              if (id.includes('@google/generative-ai') || id.includes('@huggingface') || id.includes('@tensorflow')) {
                return 'vendor-ai';
              }
              
              // Network and state management
              if (id.includes('axios') || id.includes('zustand')) {
                return 'vendor-network';
              }
              
              // Text processing (exclude markdown editor)
              if ((id.includes('markdown') || id.includes('dompurify')) && !id.includes('@uiw/react-md-editor')) {
                return 'vendor-text';
              }
              
              // Explicitly exclude markdown editor from chunking
              if (id.includes('@uiw/react-md-editor')) {
                return undefined; // Don't chunk this
              }
              
              // Animation and motion libraries
              if (id.includes('framer-motion') || id.includes('lottie')) {
                return 'vendor-animation';
              }
              
              // Large libraries that need separate chunks
              if (id.includes('jwt-decode') || id.includes('web-vitals') || id.includes('sonner')) {
                return 'vendor-web';
              }
              
              // Internationalization
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'vendor-i18n';
              }
              
              // Large libraries that might be in the remaining vendor chunk
              if (id.includes('@tanstack') || id.includes('react-query')) {
                return 'vendor-query';
              }
              
              // Everything else goes into vendor chunk
              return 'vendor';
            }
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const ext = info[info.length - 1];

            if (
              /\\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || "")
            ) {
              return `assets/images/[name]-[hash].${ext}`;
            }

            if (/\\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || ""))
            {
              return `assets/fonts/[name]-[hash].${ext}`;
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