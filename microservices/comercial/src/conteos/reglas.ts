import { randomUUID } from "node:crypto";
import { base } from "../persistencia/conexion.js";
import { Deshacer, enTransaccion } from "../persistencia/transaccion.js";
import { anotarEvento } from "../eventos/anotar.js";
import * as datos from "../persistencia/conteos.js";
import type { Conteo, ConteoAbierto, ConteoCerrado, Sector } from "../contratos/conteos.js";
import type { Enviable } from "../enviable.js";

// Sectores y conteos (issue #31). Se cuenta de a un sector; el conteo queda abierto hasta que
// se cierra; al cerrar, cada diferencia contra el stock teórico es un ajuste con la nota
// «conteo de <sector> del <fecha>», y los productos del sector que no se contaron se pueden
// poner en cero de una vez o dejar como están.
export const sectores = (): Promise<Enviable<Sector>[]> => datos.sectores(base);

// `null` si ya hay uno con ese nombre.
export async function crearSector(nombre: string, usuarioId: string): Promise<string | null> {
  const id = randomUUID();
  try { await datos.insertarSector(base, id, nombre); }
  catch (e) { if ((e as { code?: string }).code === "23505") return null; throw e; }
  await anotarEvento(base, { tipo: "sector.creado", usuarioId, contenido: { id, nombre } });
  return id;
}

// Abrir el conteo de un sector, o retomar el que quedó abierto.
export async function abrir(sectorId: string, usuarioId: string): Promise<ConteoAbierto> {
  const abierto = await datos.conteoAbiertoDe(base, sectorId);
  if (abierto) return { id: abierto, retomado: true };
  const id = randomUUID();
  await datos.abrirConteo(base, id, sectorId, usuarioId);
  await anotarEvento(base, { tipo: "conteo.abierto", usuarioId, contenido: { id, sectorId } });
  return { id, retomado: false };
}

export async function conteo(id: string): Promise<Enviable<Conteo> | null> {
  const cab = await datos.cabecera(base, id);
  if (!cab) return null;
  const [renglones, sinContar] = await Promise.all([datos.contados(base, id), datos.sinContar(base, id, cab.sector_id)]);
  return { ...cab, renglones, sin_contar: sinContar };
}

// Contar un producto (o corregir lo contado). `false` si el conteo no existe o ya se cerró.
export async function contar(conteoId: string, productoId: string, cantidad: number, usuarioId: string): Promise<boolean> {
  const sectorId = await datos.sectorDelConteoAbierto(base, conteoId);
  if (!sectorId) return false;
  await datos.contar(base, conteoId, productoId, cantidad, usuarioId, sectorId);
  return true;
}

export const descontar = (conteoId: string, productoId: string) => datos.descontar(base, conteoId, productoId);

// Cerrar: las diferencias pasan a ser ajustes. Con `faltantesEnCero`, los productos del sector
// que no se contaron se dan por inexistentes (ajuste a cero). `null` si ya estaba cerrado.
export async function cerrar(id: string, faltantesEnCero: boolean, usuarioId: string): Promise<ConteoCerrado | null> {
  return enTransaccion(async (trx) => {
    const cab = await datos.abiertoParaCerrar(trx, id);
    if (!cab) throw new Deshacer(null);
    const nota = `conteo de ${cab.sector} del ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
    const renglones = await datos.contadosParaCerrar(trx, id);
    const resumen = { contados: renglones.length, ajustados: 0, sin_contar: 0, puestos_en_cero: 0, diferencia_unidades: 0 };
    for (const r of renglones) {
      const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
      if (Math.abs(dif) < 0.0005) continue;
      await datos.ajuste(trx, r.producto_id, dif, id, `${nota}: había ${Number(r.stock_teorico)}, hay ${Number(r.cantidad_contada)}`);
      resumen.ajustados++;
      resumen.diferencia_unidades += dif;
    }
    const sinContar = await datos.sinContarParaCerrar(trx, id, cab.sector_id);
    resumen.sin_contar = sinContar.length;
    if (faltantesEnCero) {
      for (const p of sinContar) {
        const teorico = Number(p.stock_teorico);
        if (Math.abs(teorico) < 0.0005) continue;
        await datos.ajuste(trx, p.id, -teorico, id, `${nota}: no se encontró ninguno (había ${teorico})`);
        resumen.puestos_en_cero++;
        resumen.diferencia_unidades -= teorico;
      }
    }
    await datos.marcarCerrado(trx, id, usuarioId, resumen);
    await anotarEvento(trx, { tipo: "conteo.cerrado", usuarioId, contenido: { id, sector: cab.sector, ...resumen } });
    return { id, sector: cab.sector, ...resumen };
  });
}
