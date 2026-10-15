import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, ErrorApi } from "../api";
import { dispositivoId, guardarPuestoLocal, guardarPuestoRemoto } from "../puesto";
import type { EntradaConGoogle, SesionNueva } from "@servidor/sesiones";

// El vínculo entre el celular y la computadora (decisiones 58 y 73) y la entrada con Google,
// una sola vez para las dos interfaces (RNF-60). Las pantallas solo muestran.

export type Vinculado = { id: string; nombre: string | null; expira_en: string; dias: number };

// En el celular, al leer el código de la computadora. El código vale una sola vez: si la
// pantalla se monta dos veces, el segundo pedido lo encontraría usado, así que se comparte el
// pedido en curso de cada código. Queda anotado en el celular con qué computadora quedó.
const pedidos = new Map<string, Promise<Vinculado>>();
export function vincularConCodigo(codigo: string): Promise<Vinculado> {
  let pedido = pedidos.get(codigo);
  if (!pedido) {
    pedido = api<Vinculado>(`/puestos/${encodeURIComponent(codigo)}/vincular`, { method: "POST", body: JSON.stringify({ dispositivo_id: dispositivoId() }) })
      .then((r) => { guardarPuestoRemoto({ id: r.id, nombre: r.nombre, expira_en: r.expira_en }); return r; });
    pedidos.set(codigo, pedido);
    pedido.catch(() => pedidos.delete(codigo));
  }
  return pedido;
}

// En la computadora: pide un código, lo muestra como QR y consulta cada 2 s si el celular ya
// lo leyó. Vence a los 5 minutos (lo dice el servidor) y deja de consultar al vencer, al
// cerrarse o al desmontarse la pantalla.
export function useCodigoParaVincular(alVincular: (puestoId: string) => void, qr: { ancho: number; oscuro?: string }) {
  const [imagen, setImagen] = useState<string | null>(null);
  const [vencido, setVencido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consulta = useRef<ReturnType<typeof setInterval> | null>(null);
  const parar = () => { if (consulta.current) clearInterval(consulta.current); consulta.current = null; };
  useEffect(() => parar, []);

  async function generar() {
    parar(); setError(null); setVencido(false); setImagen(null);
    try {
      const { id, codigo, expiraEnSegundos } = await api<{ id: string; codigo: string; expiraEnSegundos: number }>("/puestos", { method: "POST", body: JSON.stringify({ nombre: "computadora del mostrador" }) });
      const enlace = `${location.origin}${location.pathname}#/vincular-celular?codigo=${encodeURIComponent(codigo)}`;
      setImagen(await QRCode.toDataURL(enlace, { width: qr.ancho, margin: 1, ...(qr.oscuro ? { color: { dark: qr.oscuro, light: "#ffffff" } } : {}) }));
      // Para las pruebas automáticas: el enlace que el celular abriría.
      (window as unknown as { __enlaceVinculacion?: string }).__enlaceVinculacion = enlace;
      const fin = Date.now() + expiraEnSegundos * 1000;
      consulta.current = setInterval(async () => {
        if (Date.now() > fin) { parar(); setImagen(null); setVencido(true); return; }
        const estado = await api<{ vinculado_en: string | null; expira_en: string }>(`/puestos/${id}`).catch(() => null);
        if (estado?.vinculado_en) { parar(); guardarPuestoLocal({ id, expira_en: estado.expira_en }); setImagen(null); alVincular(id); }
      }, 2000);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Sin conexión: para vincular el celular hace falta internet.");
    }
  }
  return { qr: imagen, vencido, error, generar, cerrar: () => { parar(); setImagen(null); } };
}

// Entrar con la credencial que devolvió el botón de Google.
export const entrarConGoogle = (credencial: string, dispositivo: string) =>
  api<SesionNueva>("/sesiones/google", { method: "POST", body: JSON.stringify({ credencial, dispositivo } satisfies EntradaConGoogle) });
