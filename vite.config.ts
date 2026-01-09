import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://uniforge.kr',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  define: {
    __COMMIT_HASH__: JSON.stringify(require('child_process').execSync('git rev-parse --short HEAD').toString().trim()),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })),
  },
})