import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Mantém o "virtual:pwa-register" disponível
      injectRegister: 'auto',

      // DESLIGA geração do service worker (evita o erro do workbox/terser no Termux/CI)
      disable: true
    })
  ]
})

