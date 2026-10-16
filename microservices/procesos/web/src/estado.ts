import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Proceso, ProcesoEnLista, Version, VersionEnHistorial } from "procesos-servidor/contrato";
import { esErrorDePedido, type GuardarLocal, type Pedir, type Puede } from "./tipos";

// Lo que pasa entre la pantalla y el servicio: la lista, el proceso abierto, el guardado del
// borrador (uno a la vez, con la revisión sobre la que se dibujó) y lo guardado para mirar sin
// conexión. Lo usan las dos interfaces.

export type EstadoDelGuardado = "guardado" | "guardando" | "sin-conexion" | "error";

const CLAVE_ULTIMO = "procesos.ultimo";
const CLAVE_LISTA = "procesos.lista";
const claveDe = (id: string) => `procesos.proceso.${id}`;

function leerGuardado<T>(local: GuardarLocal | null | undefined, clave: string): T | null {
  try {
    const texto = local?.getItem(clave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}
function guardar(local: GuardarLocal | null | undefined, clave: string, valor: unknown) {
  try {
    local?.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin lugar o sin permiso: se sigue sin guardar.
  }
}

/** El BPMN que se muestra: el borrador para quien dibuja, si hay; si no, el vigente. */
export const bpmnAMostrar = (p: Proceso, puede: Puede) => (puede.dibujar ? p.borrador?.bpmn ?? p.vigente?.bpmn : p.vigente?.bpmn) ?? null;

export function estadoDe(p: Pick<Proceso, "vigente" | "borrador">): "vigente" | "borrador" | "vigente-con-borrador" {
  if (p.vigente && p.borrador) return "vigente-con-borrador";
  return p.vigente ? "vigente" : "borrador";
}
export const TEXTO_DEL_ESTADO = { vigente: "Vigente", borrador: "Borrador", "vigente-con-borrador": "Vigente, con cambios en borrador" } as const;

export function useProcesos(props: { pedir: Pedir; puede: Puede; guardarLocal?: GuardarLocal | null }) {
  const { puede } = props;
  // `pedir` y el guardado pueden llegar distintos en cada render: se usan los últimos sin
  // volver a cargar todo cada vez.
  const ultimos = useRef(props);
  ultimos.current = props;
  const pedir = useCallback<Pedir>((ruta, init) => ultimos.current.pedir(ruta, init), []);
  const guardarLocal = useMemo<GuardarLocal>(() => ({
    getItem: (k) => ultimos.current.guardarLocal?.getItem(k) ?? null,
    setItem: (k, v) => ultimos.current.guardarLocal?.setItem(k, v),
    removeItem: (k) => ultimos.current.guardarLocal?.removeItem(k),
  }), []);
  const [lista, setLista] = useState<ProcesoEnLista[] | null>(null);
  const [abierto, setAbierto] = useState<Proceso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);
  const [guardado, setGuardado] = useState<EstadoDelGuardado>("guardado");
  const [aviso, setAviso] = useState<string | null>(null);
  const revision = useRef<number>(0);
  const enCurso = useRef<Promise<void> | null>(null);
  const pendiente = useRef<{ id: string; bpmn: string } | null>(null);

  const recordar = useCallback((p: Proceso) => {
    revision.current = p.revision;
    setAbierto(p);
    guardar(guardarLocal, claveDe(p.id), p);
    guardar(guardarLocal, CLAVE_ULTIMO, p.id);
  }, [guardarLocal]);

  const cargarLista = useCallback(async () => {
    try {
      const l = (await pedir("/procesos")) as ProcesoEnLista[];
      setLista(l);
      setSinConexion(false);
      guardar(guardarLocal, CLAVE_LISTA, l);
      return l;
    } catch (e) {
      if (esErrorDePedido(e) && e.estado === 0) {
        setSinConexion(true);
        const l = leerGuardado<ProcesoEnLista[]>(guardarLocal, CLAVE_LISTA) ?? [];
        setLista(l);
        return l;
      }
      setAviso(e instanceof Error ? e.message : "No se pudo traer la lista de procesos");
      setLista([]);
      return [];
    }
  }, [pedir, guardarLocal]);

  // Vale solo la respuesta del último proceso que se pidió abrir: si se toca uno mientras se abre
  // solo el último (E01), la respuesta que llega tarde no lo pisa.
  const ultimoPedido = useRef(0);
  const abrir = useCallback(async (id: string) => {
    const pedido = ++ultimoPedido.current;
    setCargando(true);
    try {
      const p = (await pedir(`/procesos/${id}`)) as Proceso;
      if (pedido !== ultimoPedido.current) return;
      recordar(p);
      setSinConexion(false);
    } catch (e) {
      if (pedido !== ultimoPedido.current) return;
      const enMemoria = leerGuardado<Proceso>(guardarLocal, claveDe(id));
      if (esErrorDePedido(e) && e.estado === 0) {
        setSinConexion(true);
        if (enMemoria) setAbierto(enMemoria);
        else setAviso("Sin conexión: este proceso no se abrió antes en este dispositivo. Hace falta conexión para verlo");
      } else setAviso(e instanceof Error ? e.message : "No se pudo abrir el proceso");
    } finally {
      if (pedido === ultimoPedido.current) setCargando(false);
    }
  }, [pedir, guardarLocal, recordar]);

  // Al entrar: la lista y el último proceso abierto en este dispositivo o, si nunca se abrió uno, el primero de la lista (E01).
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const l = await cargarLista();
      // Si mientras llegaba la lista ya se abrió uno, no se abre otro encima.
      if (!vivo || ultimoPedido.current > 0) return;
      const ultimo = leerGuardado<string>(guardarLocal, CLAVE_ULTIMO);
      const elegido = l.find((p) => p.id === ultimo)?.id ?? l[0]?.id;
      if (elegido) await abrir(elegido);
      else setCargando(false);
    })();
    return () => { vivo = false; };
  }, [cargarLista, abrir, guardarLocal]);

  // Guarda el borrador, uno a la vez: si llega otro cambio mientras se guarda, va después con
  // la revisión nueva (E10). Sin conexión, queda pendiente, se avisa y no se dibuja hasta que vuelva (E42).
  const guardarBorrador = useCallback((id: string, bpmn: string) => {
    if (!puede.dibujar) return;
    pendiente.current = { id, bpmn };
    if (enCurso.current) return;
    const siguiente = async (): Promise<void> => {
      const cambio = pendiente.current;
      if (!cambio) return;
      pendiente.current = null;
      setGuardado("guardando");
      try {
        const p = (await pedir(`/procesos/${cambio.id}/borrador`, { method: "PUT", body: JSON.stringify({ bpmn: cambio.bpmn, revision: revision.current }) })) as Proceso;
        recordar(p);
        setSinConexion(false);
        setGuardado("guardado");
      } catch (e) {
        if (esErrorDePedido(e) && e.estado === 409 && e.datos && typeof e.datos === "object" && "proceso" in e.datos) {
          pendiente.current = null;
          recordar((e.datos as { proceso: Proceso }).proceso);
          setAviso(e.message);
          setGuardado("guardado");
          return;
        }
        if (esErrorDePedido(e) && e.estado === 0) {
          // Sin conexión no se dibuja (aclaración «Sin conexión», E42): el dibujo queda para
          // mirar, con el último cambio a la vista, y ese cambio sale cuando vuelve la conexión.
          pendiente.current ??= cambio;
          setAbierto((a) => {
            const base = a?.borrador ?? a?.vigente;
            return a && base && a.id === cambio.id ? { ...a, borrador: { ...base, bpmn: cambio.bpmn } } : a;
          });
          setSinConexion(true);
          setGuardado("sin-conexion");
          return;
        }
        setGuardado("error");
        setAviso(e instanceof Error ? e.message : "No se pudo guardar");
        return;
      }
      return siguiente();
    };
    enCurso.current = siguiente().finally(() => { enCurso.current = null; });
  }, [pedir, puede.dibujar, recordar]);

  // Al volver la conexión, se manda lo que quedó sin guardar.
  useEffect(() => {
    const alVolver = () => {
      if (pendiente.current) guardarBorrador(pendiente.current.id, pendiente.current.bpmn);
    };
    window.addEventListener("online", alVolver);
    return () => window.removeEventListener("online", alVolver);
  }, [guardarBorrador]);

  const conAviso = useCallback(async <T,>(hacer: () => Promise<T>): Promise<T | null> => {
    try {
      return await hacer();
    } catch (e) {
      setAviso(esErrorDePedido(e) && e.estado === 0 ? "Sin conexión: no se hizo. Probá de nuevo cuando vuelva" : e instanceof Error ? e.message : "No se pudo");
      return null;
    }
  }, []);

  const acciones = {
    abrir,
    guardarBorrador,
    async crear(nombre: string, bpmn?: string) {
      const p = await conAviso(async () => (await pedir("/procesos", { method: "POST", body: JSON.stringify(bpmn === undefined ? { nombre } : { nombre, bpmn }) })) as Proceso);
      if (p) {
        recordar(p);
        await cargarLista();
      }
      return p;
    },
    async renombrar(nombre: string) {
      if (!abierto) return null;
      const p = await conAviso(async () => (await pedir(`/procesos/${abierto.id}`, { method: "PATCH", body: JSON.stringify({ nombre }) })) as Proceso);
      if (p) {
        recordar(p);
        await cargarLista();
      }
      return p;
    },
    async borrar() {
      if (!abierto) return false;
      const id = abierto.id;
      const hecho = await conAviso(async () => { await pedir(`/procesos/${id}`, { method: "DELETE" }); return true; });
      if (!hecho) return false;
      try { guardarLocal?.removeItem(claveDe(id)); } catch { /* sin guardado */ }
      setAbierto(null);
      const l = await cargarLista();
      if (l[0]) await abrir(l[0].id);
      return true;
    },
    async marcarVigente() {
      if (!abierto) return null;
      await enCurso.current;
      const p = await conAviso(async () => (await pedir(`/procesos/${abierto.id}/vigente`, { method: "POST", body: JSON.stringify({ revision: revision.current }) })) as Proceso);
      if (p) {
        recordar(p);
        await cargarLista();
      }
      return p;
    },
    async descartarBorrador() {
      if (!abierto) return null;
      await enCurso.current;
      const p = await conAviso(async () => (await pedir(`/procesos/${abierto.id}/borrador?revision=${revision.current}`, { method: "DELETE" })) as Proceso);
      if (p) {
        recordar(p);
        await cargarLista();
      }
      return p;
    },
    async historial() {
      if (!abierto) return [];
      return (await conAviso(async () => (await pedir(`/procesos/${abierto.id}/versiones`)) as VersionEnHistorial[])) ?? [];
    },
    async version(versionId: string) {
      if (!abierto) return null;
      return conAviso(async () => (await pedir(`/procesos/${abierto.id}/versiones/${versionId}`)) as Version);
    },
    cerrarAviso: () => setAviso(null),
    avisar: setAviso,
  };

  return { lista, abierto, cargando, sinConexion, guardado, aviso, ...acciones };
}

export type Procesos = ReturnType<typeof useProcesos>;
