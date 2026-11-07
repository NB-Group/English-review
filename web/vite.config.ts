import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/v2/',
  plugins: [react(), tailwindcss()],
  server: {
    // 开发时把 /data 代理到仓库根的 data/ 目录（老 server.py 同源时不需要）
    proxy: {
      '/data': { target: 'http://127.0.0.1:8080', changeOrigin: false },
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: false },
    },
  },
})
