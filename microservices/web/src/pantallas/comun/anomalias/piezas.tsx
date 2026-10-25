import { enMiles, type VistaDelCambio } from "../../../negocio/apartados";
import { horaDe, porDia, TITULOS_DE_ANOMALIA, type Anomalia } from "../../../negocio/anomalias";
import { urlDeFoto } from "../../../negocio/catalogo";
import { nombreDeProducto } from "../../../negocio/formato";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";

// Lo que dibujan igual las dos interfaces en Más → Anomalías (specs/014 y 005, la v2).
export const ICONO_DEL_CAMBIO: Record<VistaDelCambio["tipo"], NombreDeIcono> = { venta: "recibo", ajuste: "balanza", producto: "porcentaje", conteo: "unir", consulta: "no-llevo", otro: "info" };

// El importe con el «$» chico de la v2.
export const Pesos = ({ valor }: { valor: number }) => <><span className="mv-peso">$</span>{enMiles(valor)}</>;

export function FotoDeProducto({ foto, tam }: { foto: string | null; tam: number }) {
  return <span className="mv-foto">{foto ? <img src={urlDeFoto(foto) ?? ""} alt="" loading="lazy" /> : <Icono nombre="paquete" tam={tam} />}</span>;
}

// El registro, por día: la hora, el producto y qué pasó, con quién.
export function EntradasDelRegistro({ anomalias, clase, sinUsuario }: { anomalias: Anomalia[]; clase?: string; sinUsuario: string }) {
  return (
    <div className={clase} data-testid="lista-de-anomalias">
      {porDia(anomalias).map((d) => (
        <div key={d.dia}>
          <div className="dia">{d.dia}</div>
          {d.anomalias.map((a) => (
            <div key={a.id} className="ent" data-testid="anomalia">
              <span className="h">{horaDe(a.creado_en)}</span>
              <div><div className="n">{nombreDeProducto(a.producto)}</div><div className="d"><b>{TITULOS_DE_ANOMALIA[a.tipo] ?? a.tipo}.</b> {a.detalle} · {a.usuario ?? sinUsuario}</div></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// «Más nuevas» · «Página N» · «Más viejas».
export function PaginasDelRegistro({ clase, pagina, hayMas, textos, alCambiar }: { clase?: string; pagina: number; hayMas: boolean; textos: [string, string, string]; alCambiar: (p: number) => void }) {
  return (
    <nav className={clase} aria-label="Páginas">
      <button type="button" className="mv-btn chico" disabled={pagina === 1} onClick={() => alCambiar(pagina - 1)}>{textos[0]}</button>
      <span className="mv-detalle">{textos[1]} {pagina}</span>
      <button type="button" className="mv-btn chico" disabled={!hayMas} onClick={() => alCambiar(pagina + 1)}>{textos[2]}</button>
    </nav>
  );
}
