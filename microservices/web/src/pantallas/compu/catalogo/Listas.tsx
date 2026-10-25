import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { TEXTOS } from "../../textos";
import { subida } from "../../comun/catalogo/fechas-de-listas";
import { Aviso, Boton, Pagina, Toast, Vacio } from "../base/ui";
import { AltaDeProveedor } from "./AltaDeProveedor";
import { PendientesDeRevisar } from "./PendientesDeRevisar";
import { ProveedoresDeListas } from "./ProveedoresDeListas";
import { ResultadoDeLista } from "./ResultadoDeLista";
import { Revision } from "./Revision";
import { UltimasCargas } from "./UltimasCargas";
import { useListasDeLaCompu, useAccionesDeListas, type ListasDeLaCompu } from "./useListasDeLaCompu";
import { ZonaDeCarga } from "./ZonaDeCarga";
import css from "./Listas.module.css";

// Cargar una lista de precios (RF-01), como la v2 (decisión 148, «La bandeja y la revisión»): a la
// izquierda cargar, lo que espera revisión, las últimas cargas y los proveedores; a la derecha, la
// revisión de la lista elegida, con su resumen, la tabla y «Aplicar». Nada se guarda hasta «Aplicar».
// Teclado: Alt S elige el archivo, 1 a 9 abren la pendiente de ese número, ↑ ↓ recorren la tabla,
// Espacio pliega la explicación, Alt D descarta, Ctrl Enter aplica y «/» busca un proveedor.
const t = TEXTOS.listas;

export function Listas() {
  const x = useListasDeLaCompu();
  useAccionesDeListas(x);
  return (
    <Pagina titulo="Listas de precios" testId="listas" className={css.v2} acciones={<CabezaDeListas x={x} />}>
      <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={() => void x.recargar()}>Reintentar</Boton>}>{x.error}</Aviso>
      <Toast texto={x.toast} alCerrar={() => x.setToast(null)} />
      <div className="lv">
        <div className={css.izq}>
          <ZonaDeCarga proveedores={x.activos} enLinea={x.enLinea} elegir={x.elegirArchivo} alCargar={(c) => { x.setResultado(null); x.setCargada(c); }} />
          <PendientesDeRevisar x={x} />
          {/* El orden lo pidió Carlos: primero cargar, después las últimas tres cargas y al final los proveedores. */}
          <UltimasCargas historial={x.historial} hayProveedores={x.proveedores !== null} />
          <ProveedoresDeListas x={x} />
        </div>
        <ALaDerecha x={x} />
      </div>
      {x.altaAbierta && <AltaDeProveedor enLinea={x.enLinea} alCerrar={() => x.setAltaAbierta(false)} alAgregar={async (nombre) => { await x.recargar(); x.setAltaAbierta(false); x.setToast(`Proveedor ${nombre} agregado.`); }} />}
    </Pagina>
  );
}

function CabezaDeListas({ x }: { x: ListasDeLaCompu }) {
  return (
    <AlLadoDeLasPestanas>
      <div className={`fila ${css.arriba}`}>
        {x.activos.length > 0 && <Boton icono="edificio" onClick={() => x.setAltaAbierta(true)} data-testid="agregar-proveedor">{t.agregarProveedor.largo}</Boton>}
        <Boton icono="subir" disabled={!x.enLinea} onClick={() => x.elegirArchivo.current()} accion="listas.subir" data-testid="subir-lista">{t.subirLista.largo}</Boton>
      </div>
    </AlLadoDeLasPestanas>
  );
}

// A la derecha: lo que pasó al aplicar, la revisión de la lista o, sin nada para revisar, qué hacer.
function ALaDerecha({ x }: { x: ListasDeLaCompu }) {
  if (x.resultado) return <ResultadoDeLista resultado={x.resultado} alCerrar={() => x.setResultado(null)} />;
  const l = x.enRevision;
  if (!l) {
    return (
      <section className={`${css.der} ${css.vacia}`}>
        <Vacio icono="listas" titulo={t.sinListasParaRevisar.largo} accion={<Boton variante="principal" icono="subir" disabled={!x.enLinea} onClick={() => x.elegirArchivo.current()}>{t.subirLista.largo}</Boton>}>{t.queHacer.largo}</Vacio>
      </section>
    );
  }
  const deLaRevision = x.historial.find((h) => h.id === l.id);
  return (
    <Revision key={l.id} cargada={l} origen={deLaRevision ? `${deLaRevision.archivo_nombre} · subida ${subida(deLaRevision.creado_en)}` : "Recién subida"}
      alDescartar={() => { x.terminar(); x.setToast("Lista descartada. No se guardó ningún precio."); }}
      alAplicar={(r) => { x.terminar(); x.setResultado(r); }} />
  );
}
