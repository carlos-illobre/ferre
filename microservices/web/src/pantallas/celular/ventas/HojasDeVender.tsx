import { irA } from "../../../rutas";
import { TEXTOS } from "../../textos";
import { Hoja, Icono } from "../componentes/base";
import { BuscarProducto } from "./BuscarProducto";
import { ElegirCliente } from "./ElegirCliente";
import { HojaDelRenglon } from "./HojaDelRenglon";
import type { EstadoDeVender } from "./useVender";
import hojas from "./hojas.module.css";

// Las hojas que se abren sobre la venta: buscar, el cliente, «En espejo» y la de un renglón.
export function HojasDeVender({ v }: { v: EstadoDeVender }) {
  const { venta, renglon, hoja, setHoja } = v;
  return (
    <>
      {v.buscando && <BuscarProducto v={v} />}
      {hoja === "clientes" && (
        <Hoja titulo={venta.medio === "cuenta_corriente" ? TEXTOS.vender.quienLleva.corto : "Cliente"} alCerrar={() => setHoja(null)} testId="hoja-clientes">
          <ElegirCliente clientes={v.catalogo.clientes} elegido={venta.clienteId} alElegir={(id) => { venta.elegirCliente(id); setHoja(null); }} />
        </Hoja>
      )}
      {hoja === "espejo" && <HojaEspejo alCerrar={() => setHoja(null)} />}
      {renglon && <HojaDelRenglon item={renglon} alCerrar={() => v.setRenglonAbierto(null)} alCambiar={(c) => venta.cambiarItem(renglon.clave, c)} alElegirMargen={(m) => venta.elegirMargen(renglon, m)}
        alCambiarUnidad={(u) => venta.cambiarUnidad(renglon, u)} alQuitar={() => { v.setRenglonAbierto(null); v.deshacer.quitar(renglon); }} />}
    </>
  );
}

// Emparejado con una computadora: qué es el espejo y, para leerle códigos, el lector.
function HojaEspejo({ alCerrar }: { alCerrar: () => void }) {
  return (
    <Hoja titulo={TEXTOS.vender.enEspejoConLaCompu.corto} alCerrar={alCerrar} testId="hoja-espejo">
      <p className={hojas.detalle}>{TEXTOS.vender.queEsElEspejo.corto}</p>
      <button type="button" className={`boton tinta ${hojas.ancho}`} onClick={() => { alCerrar(); irA("lector"); }} data-testid="celular-vinculado-remoto"><Icono nombre="escanear" tam={20} />{TEXTOS.vender.usarComoLector.corto}</button>
      <p className={hojas.detalle}>{TEXTOS.vender.queHaceElLector.corto}</p>
    </Hoja>
  );
}
