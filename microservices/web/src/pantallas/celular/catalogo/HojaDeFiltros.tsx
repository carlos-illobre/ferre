import { useState } from "react";
import { SIN_FILTROS, type Disponibilidad, type Filtros } from "../../../negocio/catalogo";
import { cuantosProductos, TEXTOS } from "../../textos";
import { Buscador, Hoja } from "../componentes/base";

// Los filtros, en una hoja que sube desde abajo (maqueta de 015): la disponibilidad y la marca,
// con su buscador. Se aplican mientras se eligen; «Ver N productos» cierra la hoja.
export function HojaDeFiltros({ filtros, marcas, cuantos, alCambiar, alCerrar }: { filtros: Filtros; marcas: string[]; cuantos: number; alCambiar: (f: Filtros) => void; alCerrar: () => void }) {
  const [buscarMarca, setBuscarMarca] = useState("");
  const t = TEXTOS.catalogo;
  const opciones: { valor: Disponibilidad; nombre: string }[] = [{ valor: "todos", nombre: t.todos.corto }, { valor: "con-stock", nombre: t.conStock.corto }, { valor: "sin-stock", nombre: t.sinStock.corto }];
  const visibles = marcas.filter((m) => m.toLocaleLowerCase("es-AR").includes(buscarMarca.trim().toLocaleLowerCase("es-AR")));
  const n = cuantos;
  return (
    <Hoja titulo={t.filtros.corto} extra={<button type="button" className="enlace" onClick={() => alCambiar(SIN_FILTROS)} data-testid="hoja-sacar-filtros">{t.sacarFiltros.corto}</button>} alCerrar={alCerrar} testId="hoja-filtros">
      <h3 className="filtros-titulo">{t.disponibilidad.corto}</h3>
      <div className="segmentos filtros-disponibilidad" role="radiogroup" aria-label={t.disponibilidad.corto}>
        {opciones.map((o) => <button key={o.valor} type="button" role="radio" aria-checked={filtros.disponibilidad === o.valor} className={filtros.disponibilidad === o.valor ? "activo" : ""} onClick={() => alCambiar({ ...filtros, disponibilidad: o.valor })} data-testid={`disponibilidad-${o.valor}`}>{o.nombre}</button>)}
      </div>
      <h3 className="filtros-titulo">{t.marca.corto}</h3>
      <Buscador chico valor={buscarMarca} alCambiar={setBuscarMarca} placeholder={t.buscarMarca.corto} testId="buscar-marca" />
      <ul className="filtros-marcas" role="radiogroup" aria-label={t.marca.corto}>
        {[null, ...visibles].map((m) => (
          <li key={m ?? ""}><button type="button" role="radio" aria-checked={filtros.marca === m} className={filtros.marca === m ? "elegida" : ""} onClick={() => alCambiar({ ...filtros, marca: m })} data-testid="marca"><i aria-hidden="true" />{m ?? t.todasLasMarcas.corto}</button></li>
        ))}
      </ul>
      <button type="button" className="boton coral principal centrado ver-productos" onClick={alCerrar} data-testid="ver-productos">{n === 0 ? t.sinProductosConFiltros.corto : `${t.ver.corto} ${cuantosProductos(n)}`}</button>
    </Hoja>
  );
}

