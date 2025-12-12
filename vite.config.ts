import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { qrcode } from 'vite-plugin-qrcode'; // ★追加1: これをインポート

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    qrcode() // ★追加2: プラグインを有効化
  ],
  server: {
    host: true, // ★追加3: これがないとスマホから繋がりません（IPアドレス公開）
    // これにより、React(5173)からサーバー(3001)へ通信できるようになります
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
})