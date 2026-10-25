import { useCallback, useEffect, useRef, useState } from "react";
import { useComandos, type Acciones } from "../../../plataforma/comandos";
import { useCatalogo } from "../../../negocio/catalogo";
import { alApretarEnter, useBusquedaDeVenta, useCelularQueEscanea, useQuitarConDeshacer } from "../../../negocio/ventas";
import { MEDIOS, TEXTOS } from "../../textos";
import { useSugeridos } from "../../sugeridos";
import { useCamaraDeLaVenta } from "./useCamaraDeLaVenta";
import { useVentaDelCelular } from "./useVentaDelCelular";

// Todo lo que usa Vender en el celular, armado con las piezas del negocio. La búsqueda va en una
// hoja como la de la v2 (decisión 140); no toma el foco sola: abriría el teclado.
export function useVender() {
  const catalogo = useCatalogo();
  const busqueda = useBusquedaDeVenta(catalogo.buscarProductos);
  const caja = useRef<HTMLInputElement>(null);
  const [buscando, setBuscando] = useState(false);
  const [hoja, setHoja] = useState<"clientes" | "espejo" | null>(null);
  const [renglonAbierto, setRenglonAbierto] = useState<string | null>(null);
  const { setConsulta } = busqueda;
  const cerrarBusqueda = useCallback(() => { setBuscando(false); setConsulta(""); }, [setConsulta]);
  const venta = useVentaDelCelular({ cerrarBusqueda, alFaltarCliente: () => setHoja("clientes") });
  const deshacer = useQuitarConDeshacer({ ...venta, quitar: venta.quitar }, { vaciaste: TEXTOS.vender.vaciaste.corto, quitaste: TEXTOS.vender.quitaste.corto }, 5000);
  const celular = useCelularQueEscanea(venta.agregarPorCodigo);
  const camara = useCamaraDeLaVenta(catalogo.catalogo, venta.agregarPorCodigo, () => setBuscando(true));
  useMostrarLoRecien(camara.recien, venta.items);
  const alEnter = () => alApretarEnter(busqueda.consulta, busqueda.resultados, busqueda.elegido, { producto: venta.elegirSugerencia, codigo: venta.agregarPorCodigo, libre: (t) => venta.agregar(null, t) });
  // Elegir uno de lo encontrado; sin resultados a la vista no es para eso.
  const mover = (paso: 1 | -1) => () => (busqueda.resultados.length > 0 ? busqueda.mover(paso) : false);
  useComandos({
    ...Object.fromEntries(MEDIOS.map((m) => [`vender.medio.${m.valor}`, () => venta.elegirMedio(m.valor)])), "vender.cobrar": () => void venta.cobrar(),
    "vender.busqueda.siguiente": mover(1), "vender.busqueda.anterior": mover(-1),
  });
  const enLaCaja: Acciones = { "lista.siguiente": mover(1), "lista.anterior": mover(-1), "lista.elegir": alEnter };
  const { ultimos } = useSugeridos(catalogo.catalogo, venta.items.length === 0);
  const renglon = venta.items.find((i) => i.clave === renglonAbierto) ?? null;
  return { catalogo, busqueda, caja, buscando, setBuscando, cerrarBusqueda, hoja, setHoja, renglon, setRenglonAbierto, venta, deshacer, celular, camara, enLaCaja, ultimos };
}
export type EstadoDeVender = ReturnType<typeof useVender>;

// Lo que acaba de leer la cámara se trae a la vista en la lista.
function useMostrarLoRecien(recien: string | null, items: unknown) {
  useEffect(() => {
    if (recien) document.querySelector(`[data-producto="${recien}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [recien, items]);
}
