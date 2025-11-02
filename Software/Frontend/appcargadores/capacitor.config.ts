import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.app.cargadores',
  appName: 'ECCODe',
  webDir: 'dist',
  server: {
    url: 'https://repositorio-memorias.onrender.com', // URL de tu app en Render
    cleartext: true // Solo si usas HTTP (no recomendado)
  }
};

export default config;
