// En el celular las tablas se muestran como tarjetas (una por fila) y cada celda lleva
// delante el nombre de su columna. Ese nombre sale del <th> correspondiente: acá se copia
// a `data-etiqueta` de cada <td>, para toda tabla que aparezca, ahora o después.
export function etiquetarTablas(raiz: ParentNode = document): void {
  for (const tabla of raiz.querySelectorAll<HTMLTableElement>("table")) {
    const titulos = Array.from(tabla.tHead?.rows[0]?.cells ?? []).map((th) => th.textContent?.trim() ?? "");
    if (!titulos.length) continue;
    for (const cuerpo of Array.from(tabla.tBodies)) {
      for (const fila of Array.from(cuerpo.rows)) {
        if (fila.parentElement?.closest("table") !== tabla) continue; // tablas anidadas: cada una con lo suyo
        let columna = 0;
        for (const celda of Array.from(fila.cells)) {
          if (!celda.hasAttribute("data-etiqueta")) celda.setAttribute("data-etiqueta", celda.colSpan > 1 ? "" : (titulos[columna] ?? ""));
          columna += celda.colSpan;
        }
      }
    }
  }
}

// Vuelve a etiquetar cada vez que cambia el DOM (React agrega y saca filas todo el tiempo).
export function observarTablas(): () => void {
  etiquetarTablas();
  const observador = new MutationObserver(() => etiquetarTablas());
  observador.observe(document.body, { childList: true, subtree: true });
  return () => observador.disconnect();
}
