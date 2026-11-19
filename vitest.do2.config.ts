import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

/** DO-2 local evidence config — Vitest globals. */
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
      'src/lib/technicianDailyOpsApi.test.ts',
      'src/components/technician/TechnicianDailyOpsStrip.test.tsx',
      'src/pages/TicketDetailPage.do2.focus.test.tsx',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
