// Lo apartado de alguien a quien desactivaron (specs/014-cambios-apartados, ADR-021). Solo
// tipos: el cliente web los toma al compilar (ADR-018), así que acá no va código.

// Un cambio tal como estaba en la cola del dispositivo.
export type CambioParaApartar = { orden: number; creado_en: string; tipo: string; metodo: "POST" | "PUT" | "PATCH" | "DELETE"; ruta: string; cuerpo: unknown };

// POST /apartados, con el token de la sesión cerrada: cuántos quedaron apartados.
export type CambiosParaApartar = { cambios: CambioParaApartar[] };
export type CambiosApartados = { apartados: number };

// GET /apartados: lo que espera una decisión, de lo más viejo a lo más nuevo. `producto` es el
// nombre del producto al que apunta la ruta, si apunta a uno; `error`, por qué no se pudo
// aceptar la última vez que se intentó.
export type CambioApartado = {
  id: string; tipo: string; metodo: string; ruta: string; cuerpo: unknown; hecho_en: string; llegado_en: string; error: string | null;
  usuario_id: string; usuario: string; desactivado_en: string | null; dispositivo: string | null; producto: string | null;
};
export type CambiosParaRevisar = { apartados: CambioApartado[] };
