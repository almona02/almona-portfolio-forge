import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

/** DO-3 local evidence config — Vitest globals. */
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
      'src/lib/customerDailyOpsApi.test.ts',
      'src/components/customer/CustomerDailyOpsStrip.test.tsx',
      'src/pages/TicketDetailPage.do3.focus.test.tsx',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
