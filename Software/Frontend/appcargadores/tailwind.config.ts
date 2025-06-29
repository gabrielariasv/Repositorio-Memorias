// tailwind.config.ts

import type { Config } from 'tailwindcss';

// Se unifican todas las configuraciones en un solo objeto.
export default {
  // Propiedad para habilitar y configurar el modo oscuro.
  darkMode: 'class',
  
  // Archivos a los que Tailwind debe prestar atención para generar las clases.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  // Aquí se extienden los estilos base de Tailwind.
  theme: {
    extend: {
      // Se añade tu sombra de caja personalizada.
      boxShadow: {
        'iot': '0 4px 24px 0 rgba(0,0,0,0.08)',
        'iot-hover': '0 8px 32px 0 rgba(0,0,0,0.12)'
      }
    },
  },
  
  // Espacio para plugins de Tailwind.
  plugins: [],

} satisfies Config; // "satisfies Config" asegura que nuestro objeto cumple con el tipo de Tailwind.