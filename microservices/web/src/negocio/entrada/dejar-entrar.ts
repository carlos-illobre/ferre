import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../datos/conexion";
import { irA } from "../../rutas";
import { dispositivoId, sincronizarEmparejamiento } from "../../puesto";
import { avisarEnEsteDispositivo } from "../../espejo";
import type { AprobacionDeCodigo } from "@servidor/sesiones";

// El celular leyó el código de una computadora y ya tiene sesión (RF-76): la deja entrar con su
// usuario. Cuando entró, el celular sigue a su pantalla de siempre con un aviso breve.
export type EstadoDeLaCompu = "preguntar" | "entrando" | "error";

// El emparejamiento nace cuando la computadora retira su sesión, un par de segundos después.
async function esperarElEmparejamiento() {
  for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 1500)); if ((await sincronizarEmparejamiento())?.comoCelular) break; }
}

export function useDejarEntrarALaCompu(codigo: string, automatico: boolean, nombre: string) {
  const [estado, setEstado] = useState<EstadoDeLaCompu>(automatico ? "entrando" : "preguntar");
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(false);
  const dejarEntrar = useCallback(async () => {
    if (pedido.current) return;
    pedido.current = true;
    setEstado("entrando");
    try {
      await api("/sesiones/vinculaciones/aprobar", { method: "POST", body: JSON.stringify({ codigo, dispositivo_id: dispositivoId() } satisfies AprobacionDeCodigo) });
      avisarEnEsteDispositivo(`Listo: la computadora entró como ${nombre}`);
      irA("catalogo");
      void esperarElEmparejamiento();
    }
    catch (e) { pedido.current = false; setError((e as { estado?: number }).estado ? (e as Error).message : "Sin conexión: para dejar entrar a la computadora hace falta internet."); setEstado("error"); }
  }, [codigo, nombre]);
  useEffect(() => { if (automatico) void dejarEntrar(); }, [automatico, dejarEntrar]);
  return { estado, error, dejarEntrar, seguir: () => irA("catalogo") };
}

// A dónde lleva un código de Ferrebress leído con la cámara: solo los que la aplicación muestra
// para el celular (entrar a la computadora o vincularla). La foto ya no se pide con un código: le
// llega al celular emparejado (specs/023).
export function destinoDelCodigo(leido: string): string | null {
  const m = /#\/(entrar-compu|vincular-celular)\?codigo=[\w.~%-]+$/.exec(leido.trim());
  return m ? m[0] : null;
}
