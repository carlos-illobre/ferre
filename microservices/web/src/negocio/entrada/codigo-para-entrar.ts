import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, avisos, ErrorApi } from "../../datos/conexion";
import { useSesion } from "../../datos/sesion";
import { dispositivoId, guardarPuestoLocal } from "../../datos/vinculo";
import { describirDispositivo } from "../../plataforma/dispositivo";
import type { CodigoDeEntrada, ConsultaDeCodigo, EstadoDelCodigo, PedidoDeCodigo } from "@acceso/sesiones";

// El código para entrar lleva el isotipo en el centro (decisión 118). El isotipo tapa cerca del 5 % del
// código; con la corrección de errores más alta, que recupera hasta el 30 %, queda margen para una
// cámara real (reflejos, foco, la pantalla en ángulo). Una prueba comprueba que el escáner de la
// aplicación lo lee igual.
export const QR_DE_ENTRADA = { nivel: "H", isotipo: 0.22 } as const;

// El código para entrar con el celular (RF-76): se pide solo y se muestra como QR. Mientras está en
// pantalla, la computadora espera la aprobación por el canal (RF-141): se entera en el momento, sin
// preguntar a ritmo fijo. Al vencer (la cuenta regresiva de la pantalla) se pide otro; con la
// ventana tapada, al volver a ella. La clave que retira la sesión no sale de acá: el QR solo lleva
// el código.
type Codigo = { qr: string | null; error: string | null; vence: number | null; duracion: number };
type Paso = { vigente: () => boolean; esperar: (ms: number, que: () => void) => void; dejarDeEsperar: (dejar: () => void) => void; entrar: ReturnType<typeof useSesion>["entrar"]; mostrar: (c: Partial<Codigo>) => void };

const enlaceDe = (codigo: string) => `${location.origin}${location.pathname}#/entrar-compu?codigo=${encodeURIComponent(codigo)}`;
const qrDe = (enlace: string) => QRCode.toDataURL(enlace, { errorCorrectionLevel: QR_DE_ENTRADA.nivel, width: 440, margin: 0, color: { dark: "#17312b", light: "#ffffff" } });

// Aprobado, entra (y queda emparejado con el celular). Primero la sesión: guardar el emparejamiento
// conecta el espejo, y sin sesión el servidor lo rechaza.
function entrarSiLoAprobaron(p: Paso, r: EstadoDelCodigo | null) {
  if (!p.vigente() || r?.estado !== "aprobada" || !r.token || !r.usuario) return;
  p.entrar(r.token, r.usuario);
  if (r.puesto) guardarPuestoLocal(r.puesto);
}

const retirar = (c: CodigoDeEntrada) => api<EstadoDelCodigo>(`/sesiones/vinculaciones/${c.id}/estado`, { method: "POST", body: JSON.stringify({ clave: c.clave, dispositivo_id: dispositivoId() } satisfies ConsultaDeCodigo) }).catch(() => null);

// Al vencer se pide otro; si la ventana está tapada, al volver a ella (nadie está por entrar).
function alVencer(pedirOtro: () => void) {
  if (document.visibilityState !== "hidden") return pedirOtro();
  const alVolver = () => { document.removeEventListener("visibilitychange", alVolver); pedirOtro(); };
  document.addEventListener("visibilitychange", alVolver);
}

// Esperar la aprobación por el canal: el servidor avisa «listo» y recién ahí se retira la sesión,
// una vez. Si el código ya no vale (venció o se usó), se pide otro.
function esperarLaAprobacion(p: Paso, c: CodigoDeEntrada, pedirOtro: () => void) {
  p.dejarDeEsperar(avisos.vigilar({
    tema: `entrada:${c.id}`,
    temporaria: true,
    clave: c.clave,
    alAviso: (d) => { if ((d as { listo?: boolean } | null)?.listo) void retirar(c).then((r) => entrarSiLoAprobaron(p, r)); },
    alRechazo: () => { if (p.vigente()) pedirOtro(); },
  }));
}

async function pedir(p: Paso) {
  try {
    const c = await api<CodigoDeEntrada>("/sesiones/vinculaciones", { method: "POST", body: JSON.stringify({ dispositivo: describirDispositivo() } satisfies PedidoDeCodigo) });
    if (!p.vigente()) return;
    const enlace = enlaceDe(c.codigo);
    // Para las pruebas automáticas: el enlace que el celular abriría.
    (window as unknown as { __enlaceParaEntrar?: string }).__enlaceParaEntrar = enlace;
    p.mostrar({ qr: await qrDe(enlace), error: null, vence: Date.now() + c.expiraEnSegundos * 1000, duracion: c.expiraEnSegundos });
    // Se pide otro una sola vez por código, venza o lo rechace el servidor (o las dos cosas).
    let pidioOtro = false;
    const otro = () => { if (!pidioOtro && p.vigente()) { pidioOtro = true; void pedir(p); } };
    esperarLaAprobacion(p, c, otro);
    p.esperar(c.expiraEnSegundos * 1000, () => alVencer(otro));
  } catch (e) {
    // Sin servidor no se insiste: se vuelve a pedir cuando vuelve la conexión (la pantalla se apaga y se prende).
    if (p.vigente()) p.mostrar({ qr: null, error: e instanceof ErrorApi ? e.message : "No se pudo pedir el código." });
  }
}

// `activo`: hay conexión. Sin código, se pide al haberla; con código, se sigue esperando aunque se
// corte (el canal vuelve solo y el servidor cuenta si lo aprobaron mientras tanto: 025-E06).
export function useCodigoParaEntrar(activo: boolean): Codigo {
  const { entrar } = useSesion();
  const [codigo, setCodigo] = useState<Codigo>({ qr: null, error: null, vence: null, duracion: 300 });
  const [intento, setIntento] = useState(0);
  const conCodigo = codigo.qr !== null;
  // Mientras se está pidiendo uno, no se pide otro (la conexión puede volver justo antes de que llegue).
  const pidiendo = useRef(false);
  useEffect(() => { if (activo && !conCodigo && !pidiendo.current) setIntento((i) => i + 1); }, [activo, conCodigo]);
  // Si no se pudo pedir (el servidor no contestó aunque haya red), se vuelve a pedir cuando alguien
  // toca la pantalla o vuelve a la ventana: sin reintentos a ritmo fijo.
  useEffect(() => {
    if (conCodigo || intento === 0) return;
    const otraVez = () => setIntento((i) => i + 1);
    const alVolver = () => { if (document.visibilityState === "visible") otraVez(); };
    window.addEventListener("pointerdown", otraVez);
    document.addEventListener("visibilitychange", alVolver);
    return () => { window.removeEventListener("pointerdown", otraVez); document.removeEventListener("visibilitychange", alVolver); };
  }, [conCodigo, intento]);
  useEffect(() => {
    if (intento === 0) return;
    pidiendo.current = true;
    let vigente = true;
    let espera: ReturnType<typeof setTimeout> | null = null;
    let dejar = () => {};
    const p: Paso = {
      vigente: () => vigente,
      esperar: (ms, que) => { if (espera) clearTimeout(espera); espera = setTimeout(que, ms); },
      dejarDeEsperar: (nuevo) => { dejar(); dejar = nuevo; },
      entrar,
      // Se deja de pedir cuando no se pudo; si se pudo, ya hay código.
      mostrar: (c) => { if (c.qr === null) pidiendo.current = false; setCodigo((a) => ({ ...a, ...c })); },
    };
    void pedir(p);
    return () => { vigente = false; if (espera) clearTimeout(espera); dejar(); };
    // Solo un intento nuevo pide otro código: que cambie la conexión no corta el que está.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento]);
  return codigo;
}
