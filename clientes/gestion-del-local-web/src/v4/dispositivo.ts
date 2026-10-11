// Qué dispositivo es este, en pocas palabras: queda anotado en cada venta y en cada sesión.
// Celular = Android o iPhone/iPad; la oferta de entrar con la huella es solo para ellos.
export const esCelular = () => /Android|iPhone|iPad/.test(navigator.userAgent);

export function describirDispositivo(): string {
  const ua = navigator.userAgent;
  const tipo = esCelular() ? "celular" : "computadora";
  const navegador = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${tipo} · ${navegador}`;
}
