import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(root, 'index.html'),
        menu: resolve(root, 'menu.html'),
        order: resolve(root, 'order.html'),
        about: resolve(root, 'about.html'),
        findUs: resolve(root, 'find-us.html'),
        contact: resolve(root, 'contact.html'),
        orders: resolve(root, 'orders.html'),
        admin: resolve(root, 'e2s-owner-portal-8m4q7x2n.html'),
      },
    },
  },
})
