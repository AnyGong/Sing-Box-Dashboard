import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This dashboard targets the latest Chrome only, so we don't ship legacy
// polyfills or transpile down further than Vite's modern default.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
