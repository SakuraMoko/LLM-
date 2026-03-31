import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          // 代理目标：阿里云 DashScope 兼容模式基础路径
          target: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          changeOrigin: true,
          secure: true,
          // 将 /api/xxx 重写为 /xxx
          // 最终路径: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
          rewrite: path => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
