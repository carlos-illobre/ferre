import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, ErrorApi } from "../../datos/conexion";
import { useSesion } from "../../datos/sesion";
import { dispositivoId, guardarPuestoLocal } from "../../datos/vinculo";
import { describirDispositivo } from "../../plataforma/dispositivo";
import type { CodigoDeEntrada, ConsultaDeCodigo, EstadoDelCodigo, PedidoDeCodigo } from "@servidor/sesiones";

// El código para entrar lleva el isotipo en el centro (decisión 118). El isotipo tapa cerca del 5 % del
// código; con la corrección de errores más alta, que recupera hasta el 30 %, queda margen para una
// cámara real (reflejos, foco, la pantalla en ángulo). Una prueba comprueba que el escáner de la
// aplicación lo lee igual.
export const QR_DE_ENTRADA = { nivel: "H", isotipo: 0.22 } as const;

// El código para entrar con el celular (RF-76): se pide solo, se muestra como QR, y cada dos
// segundos se pregunta si ya lo aprobaron. Al vencer se pide otro. La clave que retira la
// sesión no sale de acá: el QR solo lleva el código.
const CADA_MS = 2000;
type Codigo = { qr: string | null; error: string | null; vence: number | null; duracion: number };
type Paso = { vigente: () => boolean; esperar: (ms: number, que: () => void) => void; entrar: ReturnType<typeof useSesion>["entrar"]; mostrar: (c: Partial<Codigo>) => void };

const enlaceDe = (codigo: string) => `${location.origin}${location.pathname}#/entrar-compu?codigo=${encodeURIComponent(codigo)}`;
const qrDe = (enlace: string) => QRCode.toDataURL(enlace, { errorCorrectionLevel: QR_DE_ENTRADA.nivel, width: 440, margin: 0, color: { dark: "#17312b", light: "#ffffff" } });

// Aprobado, entra (y queda emparejado con el celular). Primero la sesión: guardar el emparejamiento
// conecta el espejo, y sin sesión el servidor lo rechaza. Devuelve si entró.
function entroSiLoAprobaron(p: Paso, r: EstadoDelCodigo | null): boolean {
  if (r?.estado !== "aprobada" || !r.token || !r.usuario) return false;
  p.entrar(r.token, r.usuario);
  if (r.puesto) guardarPuestoLocal(r.puesto);
  return true;
}

const consultar = (c: CodigoDeEntrada) => api<EstadoDelCodigo>(`/sesiones/vinculaciones/${c.id}/estado`, { method: "POST", body: JSON.stringify({ clave: c.clave, dispositivo_id: dispositivoId() } satisfies ConsultaDeCodigo) }).catch(() => null);

// Pregunta si ya lo aprobaron; vencido, pide otro. Con la ventana tapada no se pregunta: nadie está por entrar.
async function preguntar(p: Paso, c: CodigoDeEntrada, vence: number, pedirOtro: () => void) {
  if (!p.vigente()) return;
  if (Date.now() > vence) return pedirOtro();
  const deNuevo = () => p.esperar(CADA_MS, () => void preguntar(p, c, vence, pedirOtro));
  if (document.visibilityState === "hidden") return deNuevo();
  const r = await consultar(c);
  if (!p.vigente() || entroSiLoAprobaron(p, r)) return;
  if (r?.estado === "vencida") return pedirOtro();
  deNuevo();
}

async function pedir(p: Paso) {
  try {
    const c = await api<CodigoDeEntrada>("/sesiones/vinculaciones", { method: "POST", body: JSON.stringify({ dispositivo: describirDispositivo() } satisfies PedidoDeCodigo) });
    if (!p.vigente()) return;
    const enlace = enlaceDe(c.codigo);
    // Para las pruebas automáticas: el enlace que el celular abriría.
    (window as unknown as { __enlaceParaEntrar?: string }).__enlaceParaEntrar = enlace;
    p.mostrar({ qr: await qrDe(enlace), error: null });
    const vence = Date.now() + c.expiraEnSegundos * 1000;
    p.mostrar({ vence, duracion: c.expiraEnSegundos });
    p.esperar(CADA_MS, () => void preguntar(p, c, vence, () => void pedir(p)));
  } catch (e) {
    if (!p.vigente()) return;
    p.mostrar({ qr: null, error: e instanceof ErrorApi ? e.message : "No se pudo pedir el código. Reintentando…" });
    p.esperar(5000, () => void pedir(p));
  }
}

export function useCodigoParaEntrar(activo: boolean): Codigo {
  const { entrar } = useSesion();
  const [codigo, setCodigo] = useState<Codigo>({ qr: null, error: null, vence: null, duracion: 300 });
  useEffect(() => {
    if (!activo) { setCodigo((c) => ({ ...c, qr: null, vence: null })); return; }
    let vigente = true;
    let espera: ReturnType<typeof setTimeout> | null = null;
    void pedir({ vigente: () => vigente, esperar: (ms, que) => { espera = setTimeout(que, ms); }, entrar, mostrar: (c) => setCodigo((a) => ({ ...a, ...c })) });
    return () => { vigente = false; if (espera) clearTimeout(espera); };
  }, [activo, entrar]);
  return codigo;
}
