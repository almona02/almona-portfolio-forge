import { defineConfig, loadEnv, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // vite config
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    server: {
      host: "::",
      port: 3000,
    },
    plugins: [react(), visualizer(), splitVendorChunkPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096, // 4kb
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', 'three-mesh-bvh'],
            orbitcontrols: ['three/examples/jsm/controls/OrbitControls'],
            drei: ['@react-three/drei'],
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slider']
          }
        }
      }
    }
  }
})