import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, avisos, ErrorApi } from "../../datos/conexion";
import { dispositivoId, guardarPuestoLocal, guardarPuestoRemoto } from "../../datos/vinculo";
import type { ClienteDeGoogle, EntradaConGoogle, SesionNueva } from "@acceso/sesiones";
import type { PuestoNuevo, PuestoParaVincular, Vinculacion, Vinculado } from "@acceso/puestos";

// El vínculo entre el celular y la computadora (decisiones 58 y 73) y la entrada con Google,
// una sola vez para las dos interfaces (RNF-60). Las pantallas solo muestran.

export type { Vinculado };

// En el celular, al leer el código de la computadora. El código vale una sola vez: si la
// pantalla se monta dos veces, el segundo pedido lo encontraría usado, así que se comparte el
// pedido en curso de cada código. Queda anotado en el celular con qué computadora quedó.
const pedidos = new Map<string, Promise<Vinculado>>();
export function vincularConCodigo(codigo: string): Promise<Vinculado> {
  let pedido = pedidos.get(codigo);
  if (!pedido) {
    pedido = api<Vinculado>(`/puestos/${encodeURIComponent(codigo)}/vincular`, { method: "POST", body: JSON.stringify({ dispositivo_id: dispositivoId() } satisfies Vinculacion) })
      .then((r) => { guardarPuestoRemoto({ id: r.id, nombre: r.nombre, expira_en: r.expira_en }); return r; });
    pedidos.set(codigo, pedido);
    pedido.catch(() => pedidos.delete(codigo));
  }
  return pedido;
}

// En la computadora: pide un código, lo muestra como QR y espera por el canal a que el celular lo
// lea (RF-141): se entera en el momento, sin preguntar a ritmo fijo. Vence a los 5 minutos (lo dice
// el servidor; la cuenta no usa la red) y deja de esperar al vencer, al cerrarse o al desmontarse.
export function useCodigoParaVincular(alVincular: (puestoId: string) => void, qr: { ancho: number; oscuro?: string }) {
  const [imagen, setImagen] = useState<string | null>(null);
  const [vencido, setVencido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const espera = useRef<() => void>(() => {});
  const parar = () => { espera.current(); espera.current = () => {}; };
  useEffect(() => parar, []);

  // Vinculado: queda anotado en la computadora y deja de esperar.
  function vinculado(id: string, datos: unknown) {
    const expira = (datos as { expira_en?: string } | null)?.expira_en;
    if (!expira) return;
    parar(); setImagen(null);
    guardarPuestoLocal({ id, expira_en: expira });
    alVincular(id);
  }
  const vencio = () => { parar(); setImagen(null); setVencido(true); };

  async function generar() {
    parar(); setError(null); setVencido(false); setImagen(null);
    try {
      const { id, codigo, expiraEnSegundos } = await api<PuestoParaVincular>("/puestos", { method: "POST", body: JSON.stringify({ nombre: "computadora del mostrador" } satisfies PuestoNuevo) });
      const enlace = `${location.origin}${location.pathname}#/vincular-celular?codigo=${encodeURIComponent(codigo)}`;
      setImagen(await QRCode.toDataURL(enlace, { width: qr.ancho, margin: 1, ...(qr.oscuro ? { color: { dark: qr.oscuro, light: "#ffffff" } } : {}) }));
      // Para las pruebas automáticas: el enlace que el celular abriría.
      (window as unknown as { __enlaceVinculacion?: string }).__enlaceVinculacion = enlace;
      const dejar = avisos.vigilar({ tema: `puesto:${id}`, temporaria: true, alAviso: (d) => vinculado(id, d), alRechazo: vencio });
      const reloj = setTimeout(vencio, expiraEnSegundos * 1000);
      espera.current = () => { dejar(); clearTimeout(reloj); };
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Sin conexión: para vincular el celular hace falta internet.");
    }
  }
  return { qr: imagen, vencido, error, generar, cerrar: () => { parar(); setImagen(null); } };
}

// El identificador de esta aplicación en Google lo tiene el servidor, que verifica las credenciales
// con él: se le pide una vez por apertura de la aplicación. Así no puede haber uno distinto en la
// aplicación y en el servidor (007-T043).
let clienteDeGoogle: Promise<string> | null = null;
export function pedirClienteDeGoogle(): Promise<string> {
  clienteDeGoogle ??= api<ClienteDeGoogle>("/sesiones/google/cliente").then((r) => r.clienteId).catch((e: unknown) => { clienteDeGoogle = null; throw e; });
  return clienteDeGoogle;
}
// Para el botón de Google: el identificador, o nada mientras llega. Si no se pudo pedir (sin
// conexión), `fallo` lo dice y se vuelve a pedir a los 5 segundos.
export function useClienteDeGoogle(): { clienteId: string | null; fallo: boolean } {
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vigente = true;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const pedir = () => {
      pedirClienteDeGoogle()
        .then((id) => { if (vigente) { setClienteId(id); setFallo(false); } })
        .catch(() => { if (vigente) { setFallo(true); espera = setTimeout(pedir, 5000); } });
    };
    pedir();
    return () => { vigente = false; clearTimeout(espera); };
  }, []);
  return { clienteId, fallo };
}

// Entrar con la credencial que devolvió el botón de Google.
export const entrarConGoogle = (credencial: string, dispositivo: string) =>
  api<SesionNueva>("/sesiones/google", { method: "POST", body: JSON.stringify({ credencial, dispositivo } satisfies EntradaConGoogle) });
