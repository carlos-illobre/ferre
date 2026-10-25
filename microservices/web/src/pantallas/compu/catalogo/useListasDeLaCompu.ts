import { useEffect, useRef, useState } from "react";
import { buscarProveedores, mensajeDeLista, pendientes, retomar, situacionDelProveedor, ultimaAplicada, useListas, type Cargada, type ListaFila } from "../../../negocio/catalogo";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { useComandos } from "../../../plataforma/comandos";
import { hayUnaVentanaAbierta } from "../base/ui";

// El estado de Listas en la computadora: lo que se acaba de subir o la pendiente elegida (la
// primera, si no se eligió ninguna), el resultado de aplicar, los avisos y el proveedor buscado.
export type Resultado = { titulo: string; detalle: string };

export function useListasDeLaCompu() {
  const enLinea = useEnLinea();
  const { proveedores, historial, error: fallo, recargar } = useListas();
  const error = fallo && mensajeDeLista(fallo);
  // Al volver la conexión se recupera sola: el aviso desaparece cuando se corrige la causa.
  useEffect(() => { if (enLinea && error) void recargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cargada, setCargada] = useState<Cargada | null>(null);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const sinAplicar = pendientes(historial);
  const pendienteElegida = sinAplicar.find((l) => l.id === elegidaId) ?? sinAplicar[0] ?? null;
  const enRevision = cargada ?? (pendienteElegida ? retomar(pendienteElegida) : null);
  const abrir = (l: ListaFila) => { setResultado(null); setCargada(null); setElegidaId(l.id); };
  const terminar = () => { setCargada(null); setElegidaId(null); void recargar(); };
  return {
    enLinea, proveedores, historial, error, recargar, cargada, setCargada, resultado, setResultado, toast, setToast, altaAbierta, setAltaAbierta,
    sinAplicar, pendienteElegida, enRevision, abrir, terminar, elegirArchivo: useRef<() => void>(() => undefined), ...useBuscarProveedor(proveedores, historial),
  };
}
export type ListasDeLaCompu = ReturnType<typeof useListasDeLaCompu>;

// Los proveedores activos, los de lista vieja primero (son los que hay que pedir), y el buscado.
function useBuscarProveedor(proveedores: ReturnType<typeof useListas>["proveedores"], historial: ListaFila[]) {
  const [buscado, setBuscado] = useState<string | null>(null);
  const cajaProveedor = useRef<HTMLInputElement>(null);
  const activos = (proveedores ?? []).filter((p) => p.activo);
  const ultima = ultimaAplicada(historial);
  const vieja = (id: string) => Number(situacionDelProveedor(ultima.get(id)).estado === "vieja");
  const ordenados = [...activos].sort((a, b) => vieja(b.id) - vieja(a.id));
  const buscar = (abrir: (b: string | null) => string | null) => { setBuscado(abrir); requestAnimationFrame(() => cajaProveedor.current?.focus()); };
  return { activos, ultima, buscado, setBuscado, buscar, cajaProveedor, aLaVista: buscado === null ? ordenados : buscarProveedores(ordenados, buscado) };
}

// Lo que ofrece Listas: elegir el archivo, buscar un proveedor y abrir la pendiente de cada
// número (1 a 9). Nada con una ventana abierta.
export function useAccionesDeListas(x: ListasDeLaCompu) {
  const libre = (hacer: () => void) => () => (hayUnaVentanaAbierta() ? false : hacer());
  const abrirLa = (n: number) => () => { const pendiente = x.sinAplicar[n - 1]; if (!pendiente || hayUnaVentanaAbierta()) return false; x.abrir(pendiente); };
  useComandos({
    "listas.subir": libre(() => x.elegirArchivo.current()),
    "listas.buscar-proveedor": libre(() => x.buscar((b) => b ?? "")),
    ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`listas.pendiente.${n}`, abrirLa(n)])),
  });
}
