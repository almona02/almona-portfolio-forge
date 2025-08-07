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
    plugins: [react(), visualizer()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 2000,
      assetsInlineLimit: 4096, // 4kb
      rollupOptions: {
        input: 'index.html',
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three') || id.includes('three-mesh-bvh')) {
                return 'three';
              }
              if (id.includes('OrbitControls')) {
                return 'orbitcontrols';
              }
              if (id.includes('@react-three/drei')) {
                return 'drei';
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor';
              }
              if (id.includes('@radix-ui')) {
                return 'ui';
              }
              if (id.includes('@google/generative-ai')) {
                return 'google-generative-ai';
              }
              if (id.includes('@huggingface/inference')) {
                return 'huggingface-inference';
              }
              if (id.includes('@tensorflow/tfjs')) {
                return 'tensorflow-tfjs';
              }
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'chartjs';
              }
              if (id.includes('framer-motion')) {
                return 'framer-motion';
              }
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'i18next';
              }
              if (id.includes('pdf-lib')) {
                return 'pdf-lib';
              }
              if (id.includes('recharts')) {
                return 'recharts';
              }
              if (id.includes('zod')) {
                return 'zod';
              }
              if (id.includes('zustand')) {
                return 'zustand';
              }
              return 'vendor_node_modules';
            }
          }
        }
      }
    }
  }
})