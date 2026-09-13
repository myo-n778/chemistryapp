import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api/tutor': { target: 'http://127.0.0.1:8787', changeOrigin: false } } },
  assetsInclude: ['**/*.csv'],
  base: process.env.NODE_ENV === 'production' ? '/chemistryapp/' : '/',
})

