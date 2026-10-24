import { useCallback, useEffect, useState } from "react";
import { borrarLoGuardado } from "../almacen";
import { apartados, pendientes } from "../cola";
import { cambiarPreferencia } from "../preferencias";
import { guardaEnElDispositivo } from "../guardado";
import { EVENTO_CREDENCIALES, hayHuella, listarCredenciales, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../credenciales";
import { pausarEspejo, useEspejo } from "../espejo";
import { puestoLocal, puestoRemoto, soltarEmparejamiento } from "../puesto";
import type { TiempoDeVersion } from "../preferencias";

// Configuración como la v2 (specs/009, decisión 148): lo que hacen las dos interfaces, una sola vez.
// Cada interfaz dibuja su pantalla con esto.
export const NOMBRE_DEL_TIEMPO: Record<TiempoDeVersion, string> = { 5: "5 min", 15: "15 min", 60: "1 hora", 1440: "24 horas" };

export function useReducirMovimiento(): boolean {
  const consulta = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [pedido, setPedido] = useState(consulta?.matches ?? false);
  useEffect(() => {
    if (!consulta) return;
    const alCambiar = () => setPedido(consulta.matches);
    consulta.addEventListener?.("change", alCambiar);
    return () => consulta.removeEventListener?.("change", alCambiar);
  }, [consulta]);
  return pedido;
}

// Trabajar sin conexión (RF-84): cambiarlo vuelve a abrir la aplicación. Deshabilitarlo borra lo
// guardado, también lo bajado a mano; si había cambios sin enviar se pierden, y antes se avisa.
export async function cambiarSinConexion(donde: string, alCambiar: () => void = () => location.reload()) {
  if (guardaEnElDispositivo()) {
    const sinEnviar = (await pendientes().catch(() => [])).length + (await apartados().catch(() => [])).length;
    const pregunta = sinEnviar > 0
      ? `Hay ${sinEnviar} ${sinEnviar === 1 ? "cambio que todavía no se envió" : "cambios que todavía no se enviaron"} al servidor. Si dejás de guardar en ${donde}, se ${sinEnviar === 1 ? "pierde" : "pierden"}. ¿Seguir?`
      : `Se va a borrar de ${donde} lo que estaba guardado, también los datos bajados para trabajar sin conexión. ¿Seguir?`;
    if (!window.confirm(pregunta)) return;
    cambiarPreferencia("sinConexion", false);
    await borrarLoGuardado();
  } else cambiarPreferencia("sinConexion", true);
  alCambiar();
}

// Mis celulares con huella (decisión 99): los míos, y quitar uno perdido.
export function useMisCelulares() {
  const [filas, setFilas] = useState<Credencial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(() => { listarCredenciales().then((f) => { setFilas(f); setError(null); }).catch((e: unknown) => setError((e as { estado?: number }).estado ? (e as Error).message : "Sin conexión: tus celulares se ven cuando vuelva internet.")); }, []);
  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_CREDENCIALES, cargar);
    window.addEventListener("online", cargar);
    return () => { window.removeEventListener(EVENTO_CREDENCIALES, cargar); window.removeEventListener("online", cargar); };
  }, [cargar]);
  async function quitar(c: Credencial) {
    if (!window.confirm(`¿Quitar «${c.dispositivo ?? "este celular"}»? Ya no va a poder entrar con la huella.`)) return;
    try { await quitarCredencial(c.id); cargar(); } catch (e) { setError((e as Error).message); }
  }
  const [mensaje, setMensaje] = useState<string | null>(null);
  async function vincular(sugerido: string) {
    setError(null); setMensaje(null);
    const nombre = window.prompt("¿Cómo llamamos a este celular?", sugerido.slice(0, 40));
    if (nombre === null) return;
    try { const c = await vincularEsteDispositivo(nombre); setMensaje(`Listo: «${c.dispositivo}» entra con la huella desde ahora.`); cargar(); }
    catch (e) { setError((e as Error).name === "NotAllowedError" ? "No se pudo leer la huella. Probá de nuevo." : (e as Error).message); }
  }
  return { filas, error, mensaje, quitar, cargar, vincular, puedeVincular: hayHuella() };
}

// El vínculo entre celular y computadora (decisiones 73, 74, 99 y 100): con qué, hasta cuándo,
// desconectarse un rato y desvincular, que es el corte definitivo y por eso pregunta.
export function useMiVinculo() {
  const e = useEspejo();
  const computadora = e.lado === "computadora";
  const vence = e.emparejado ? (computadora ? puestoLocal() : puestoRemoto())?.expira_en ?? null : null;
  function desvincular() {
    if (window.confirm(`¿Desvincular ${computadora ? "el celular de esta computadora" : "este celular de la computadora"}? Para volver a trabajar juntos vas a tener que escanear el código.`)) void soltarEmparejamiento();
  }
  return { ...e, computadora, vence, desvincular, alternarPausa: () => pausarEspejo(!e.pausado) };
}
