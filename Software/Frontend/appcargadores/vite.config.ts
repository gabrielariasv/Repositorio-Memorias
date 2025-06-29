import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "leaflet/dist/leaflet.css";`
      }
    }
  },
  build: {
    outDir: 'dist', // Debe ser 'dist'
  },
  base: './' // ¡Importante! Usa rutas relativas
});