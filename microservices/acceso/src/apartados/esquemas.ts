import { z } from "zod";

// Lo que sube el dispositivo para apartar (ADR-021). Solo los tipos que manda la cola de
// cambios, y cada uno a la ruta de su tipo: lo apartado nunca puede apuntar a otra ruta.
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
export const TIPOS_QUE_SE_APARTAN: Record<string, { metodos: string[]; ruta: RegExp }> = {
  "venta": { metodos: ["POST"], ruta: /^\/ventas$/ },
  "consulta": { metodos: ["POST"], ruta: /^\/consultas$/ },
  "stock.ajuste": { metodos: ["POST"], ruta: new RegExp(`^/stock/${UUID}/ajustes$`) },
  "producto.cambio": { metodos: ["PATCH"], ruta: new RegExp(`^/productos/${UUID}$`) },
  "conteo.renglon": { metodos: ["PUT", "DELETE"], ruta: new RegExp(`^/conteos/${UUID}/renglones/${UUID}$`) },
};
export const MAXIMO_POR_PEDIDO = 200;
const MAXIMO_DEL_CUERPO = 100_000;
const deUnTipoConocido = "Ese cambio no se puede apartar";

export const cambiosParaApartar = z.object({
  cambios: z.array(z.object({
    orden: z.number(deUnTipoConocido).int(deUnTipoConocido).nonnegative(deUnTipoConocido),
    creado_en: z.string(deUnTipoConocido),
    tipo: z.string(deUnTipoConocido),
    metodo: z.enum(["POST", "PUT", "PATCH", "DELETE"], deUnTipoConocido),
    ruta: z.string(deUnTipoConocido),
    cuerpo: z.unknown(),
  }).refine((c) => { const t = TIPOS_QUE_SE_APARTAN[c.tipo]; return Boolean(t && t.metodos.includes(c.metodo) && t.ruta.test(c.ruta)); }, deUnTipoConocido)
    .refine((c) => JSON.stringify(c.cuerpo ?? null).length <= MAXIMO_DEL_CUERPO, "Un cambio es demasiado grande para apartarlo"),
  "No hay cambios para apartar").min(1, "No hay cambios para apartar").max(MAXIMO_POR_PEDIDO, `Se apartan hasta ${MAXIMO_POR_PEDIDO} cambios por vez`),
});
