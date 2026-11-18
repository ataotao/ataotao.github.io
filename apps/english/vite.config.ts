import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // 显式清空输出目录。Vite 8 实测不会自动清空，
    // 导致 dist/ 累积历史构建产物，进而被发布到站点根目录的 assets/。
    emptyOutDir: true
  },
  server: {
    port: 5173,
    host: true
  }
})
