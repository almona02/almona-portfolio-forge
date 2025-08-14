import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";

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
    },
    server: {
      host: "::",
      port: 3000,
      open: false,
      cors: true,
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
      ...(isProduction
        ? [
            visualizer({
              filename: "dist/stats.html",
              open: false,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // CSS optimization
    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },

    // Build optimization
    build: {
      target: "esnext",
      minify: isProduction ? "esbuild" : false,
      sourcemap: !isProduction,
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096, // 4kb

      // Rollup options for advanced bundling
      rollupOptions: {
        input: "index.html",

        // External dependencies (if any)
        external: [],

        output: {
          // Advanced chunking strategy
          manualChunks: (id) => {
            // Vendor chunks for better caching
            if (id.includes("node_modules")) {
              // React ecosystem
              if (id.includes("react") || id.includes("react-dom")) {
                return "react-vendor";
              }

              // UI libraries
              if (id.includes("@radix-ui") || id.includes("lucide-react")) {
                return "ui-vendor";
              }

              // 3D and graphics libraries
              if (
                id.includes("three") ||
                id.includes("@react-three") ||
                id.includes("three-mesh-bvh")
              ) {
                return "graphics-vendor";
              }

              // AI and ML libraries
              if (
                id.includes("@google/generative-ai") ||
                id.includes("@huggingface/inference") ||
                id.includes("@tensorflow/tfjs")
              ) {
                return "ai-vendor";
              }

              // Charts and data visualization
              if (
                id.includes("chart.js") ||
                id.includes("react-chartjs-2") ||
                id.includes("recharts")
              ) {
                return "charts-vendor";
              }

              // Animation libraries
              if (id.includes("framer-motion")) {
                return "animation-vendor";
              }

              // Internationalization
              if (id.includes("i18next") || id.includes("react-i18next")) {
                return "i18n-vendor";
              }

              // Utilities
              if (
                id.includes("date-fns") ||
                id.includes("zod") ||
                id.includes("clsx") ||
                id.includes("class-variance-authority")
              ) {
                return "utils-vendor";
              }

              // State management
              if (
                id.includes("zustand") ||
                id.includes("@tanstack/react-query")
              ) {
                return "state-vendor";
              }

              // Routing
              if (id.includes("react-router")) {
                return "router-vendor";
              }

              // PDF and file handling
              if (id.includes("pdf-lib") || id.includes("file-saver")) {
                return "files-vendor";
              }

              // HTTP and API
              if (id.includes("axios")) {
                return "http-vendor";
              }

              // Everything else
              return "vendor";
            }

            // App chunks
            if (id.includes("/src/pages/")) {
              return "pages";
            }

            if (id.includes("/src/components/")) {
              return "components";
            }

            if (id.includes("/src/lib/")) {
              return "lib";
            }
          },

          // Optimize chunk names for caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId
                  .split("/")
                  .pop()
                  ?.replace(".tsx", "")
                  .replace(".ts", "")
              : "chunk";
            return `js/${facadeModuleId}-[hash].js`;
          },

          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const ext = info[info.length - 1];

            if (
              /\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || "")
            ) {
              return `images/[name]-[hash].${ext}`;
            }

            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || "")) {
              return `fonts/[name]-[hash].${ext}`;
            }

            if (/\.css$/i.test(assetInfo.name || "")) {
              return `css/[name]-[hash].${ext}`;
            }

            return `assets/[name]-[hash].${ext}`;
          },
        },
      },

      // Optimize dependencies
      optimizeDeps: {
        include: [
          "react",
          "react-dom",
          "react-router-dom",
          "@tanstack/react-query",
          "framer-motion",
          "lucide-react",
        ],
        exclude: [
          // Exclude large libraries that should be loaded on demand
          "@tensorflow/tfjs",
          "three",
        ],
      },
    },

    // Performance optimizations
    esbuild: {
      // Remove console logs in production
      drop: isProduction ? ["console", "debugger"] : [],
      // Enable tree shaking
      treeShaking: true,
    },

    // Experimental features
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
