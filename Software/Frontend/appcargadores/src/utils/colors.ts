// src/utils/colors.ts
/**
 * Genera un color HSL determinista a partir de una cadena.
 * Devuelve un string CSS válido (ej. "hsl(210 64% 50%)").
 *
 * Puedes ajustar saturación (s) y luminosidad (l) para adecuarlo
 * a tu tema (más luminosidad para modo claro, menos para modo oscuro).
 */
export function colorFromString(key: string, s = 64, l = 50): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0; // convert to 32bit int
  }
  const hue = Math.abs(hash) % 360;
  // Usamos la notación HSL con espacios (soportada en CSS moderno)
  return `hsl(${hue} ${s}% ${l}%)`;
}
