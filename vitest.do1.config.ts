import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

/** DO-1 local evidence config — uses Vitest globals (importing describe from 'vitest' breaks collector in 4.1.12). */
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    include: [
      'src/lib/staffDailyOpsApi.test.ts',
      'src/components/support/StaffDailyOpsStrip.test.tsx',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
