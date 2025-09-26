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
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096,
      reportCompressedSize: false, // Disable compressed size reporting for faster builds
      cssCodeSplit: true, // Enable CSS code splitting
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
          manualChunks: {
            // Vendor chunk for core libraries
            vendor: [
              'react',
              'react-dom',
              'react-dom/client',
              'react-router-dom',
              '@tanstack/react-query',
              'framer-motion',
              'lucide-react',
              '@supabase/supabase-js'
            ],
            // Three.js chunk for 3D components
            threejs: [
              'three',
              '@react-three/fiber',
              '@react-three/drei',
              '@react-three/xr',
              'three-stdlib'
            ],
            // UI components chunk
            ui: [
              '@/components/ui/button',
              '@/components/ui/card',
              '@/components/ui/input',
              '@/components/ui/badge',
              '@/components/ui/avatar',
              '@/components/ui/dropdown-menu',
              '@/components/ui/tabs',
              '@/components/ui/select',
              '@/components/ui/separator',
              '@/components/ui/skeleton',
              '@/components/ui/toast',
              '@/components/ui/dialog',
              '@/components/ui/form',
              '@/components/ui/label',
              '@/components/ui/textarea',
              '@/components/ui/checkbox',
              '@/components/ui/radio-group',
              '@/components/ui/switch',
              '@/components/ui/slider',
              '@/components/ui/progress',
              '@/components/ui/alert',
              '@/components/ui/accordion',
              '@/components/ui/alert-dialog',
              '@/components/ui/aspect-ratio',
              '@/components/ui/calendar',
              '@/components/ui/carousel',
              '@/components/ui/command',
              '@/components/ui/context-menu',
              '@/components/ui/data-table',
              '@/components/ui/date-picker',
              '@/components/ui/hover-card',
              '@/components/ui/menubar',
              '@/components/ui/navigation-menu',
              '@/components/ui/pagination',
              '@/components/ui/popover',
              '@/components/ui/resizable',
              '@/components/ui/scroll-area',
              '@/components/ui/sheet',
              '@/components/ui/table',
              '@/components/ui/toggle',
              '@/components/ui/toggle-group',
              '@/components/ui/tooltip'
            ],
            // Utils and libs chunk
            utils: [
              '@/lib/utils',
              '@/lib/supabase',
              '@/lib/validation',
              '@/lib/permissions',
              '@/lib/comparisonStorage',
              '@/lib/ticketing',
              '@/lib/i18n',
              '@/hooks/use-toast',
              '@/hooks/useToast',
              '@/hooks/useScrollThreshold',
              '@/context/AuthContext',
              '@/context/QuoteContext',
              '@/context/LoadingContext'
            ],
            // Admin components chunk
            admin: [
              '@/pages/AdminDashboard',
              '@/components/admin/DashboardStats',
              '@/components/admin/RecentOrders',
              '@/components/admin/TopProducts',
              '@/components/admin/LowStockAlerts',
              '@/components/admin/CustomerActivity',
              '@/components/admin/SalesChart',
              '@/components/admin/panels/ProductsPanel',
              '@/components/admin/panels/OrdersPanel',
              '@/components/admin/panels/CustomersPanel',
              '@/components/admin/panels/InventoryPanel',
              '@/components/admin/panels/FinancePanel',
              '@/components/support/AdminTicketDashboard',
              '@/components/admin/SparePartsImportPanel'
            ],
            // 3D model components chunk
            '3d-models': [
              '@/components/3d-model/GLBViewer',
              '@/components/3d-model/EnhancedGLBViewer',
              '@/components/3d-model/OptimizedGLBViewer',
              '@/components/3d-model/Model3DDialog',
              '@/components/3d-model/ModelTest',
              '@/features/shop/configurator/components/ProductConfigurator',
              '@/features/shop/configurator/components/ModelLoader',
              '@/components/shop/3d-configurator/ModelLoader',
              '@/components/shop/ar/WorkspaceChecker'
            ],
            // Shop and product components chunk
            shop: [
              '@/pages/Products',
              '@/pages/Shop',
              '@/pages/Shop-enhanced',
              '@/components/shop/IndustrialProductCard',
              '@/components/shop/EquipmentComparisonTool',
              '@/components/shop/FreightCalculator',
              '@/components/shop/EgyptianStandardsGuide',
              '@/components/shop/EgyptianTechnicalSupportHub',
              '@/components/shop/ProductQuickView',
              '@/components/shop/RecentlyViewedProducts',
              '@/components/shop/DurabilityDetailsModal',
              '@/components/shop/ai-advisor/AiEquipmentAdvisor',
              '@/components/shop/machine-recommendation/MachineRecommendationWizard'
            ]
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
        // Three.js will be handled by manual chunks
        "three",
        "@react-three/fiber", 
        "@react-three/drei",
        "@react-three/xr",
        "three-stdlib"
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        // Optimize for better tree shaking
        treeShaking: true,
        // Target modern browsers for better optimization
        target: "es2020"
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
