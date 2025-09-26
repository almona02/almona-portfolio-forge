import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

// Simplified Vite config for reliable builds
export default defineConfig(({ mode }) => {
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
    },
    plugins: [
      react({
        jsxImportSource: "@emotion/react",
        babel: {
          plugins: ["@emotion/babel-plugin"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    css: {
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
      chunkSizeWarningLimit: 1000, // More lenient for now
      assetsInlineLimit: 4096,
      reportCompressedSize: false,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Simple manual chunks - just the essentials
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-ui': ['framer-motion', 'lucide-react'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-forms': ['react-hook-form', 'zod'],
            'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
          }
        }
      },
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: {
          safari10: true,
        },
      } : undefined,
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
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
        "three",
        "@react-three/fiber", 
        "@react-three/drei",
        "@react-three/xr",
        "three-stdlib",
        "gsap",
        "lottie-react",
        "react-spring",
        "react-use-gesture"
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
  };
});
