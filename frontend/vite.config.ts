import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import fs from 'node:fs'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    server: {
      host: true,
      port: Number(env.VITE_PORT) || 5173,

      https: {
        cert: fs.readFileSync('../certs/localhost.pem'),
        key: fs.readFileSync('../certs/localhost-key.pem'),
      },

      proxy: {
        '/api/v1': {
          target: env.BACKEND_URL,
          changeOrigin: true,
          secure: false
        },
      },
    },
  }
})
