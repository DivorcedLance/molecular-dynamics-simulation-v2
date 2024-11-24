import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/molecular-dynamics-simulation-v2/",
  build: {
    outDir: 'dist'
  },
  plugins: [react()],
})