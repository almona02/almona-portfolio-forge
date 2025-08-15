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
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "three-vendor": ["three", "@react-three/drei", "@react-three/fiber"],
            "ui-vendor": ["@radix-ui/react-accordion", "lucide-react"],
            // Add more manual chunks here for other large dependencies
          },

          // Optimize chunk names for caching
          chunkFileNames: 'js/[name]-[hash].js',

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
