import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: './' para que los assets se carguen de forma relativa (necesario cuando Electron
// abre el index.html desde file:// en producción, evitando la pantalla en blanco).
export default defineConfig({
  plugins: [react()],
  base: './',
})
