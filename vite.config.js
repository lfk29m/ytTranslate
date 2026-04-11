import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/ytTranslate/',
  server: {
    host: true, // 監聽 0.0.0.0，讓區域網路內的裝置可以連線
  },
})
