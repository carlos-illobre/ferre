import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import "./anomalias.css";

// Anomalías (RF-59): el registro de cada vez que lo que dice el sistema no coincidió con lo
// que hay en la realidad. Hoy se anota una cuando se vende un producto que según el sistema
// no tenía stock (la venta se registra igual y el stock queda en cero). Es solo para leer:
// más adelante va a haber avisos. La misma pantalla en el celular y en la computadora.
type Anomalia = { id: string; tipo: string; cantidad: string; detalle: string; creado_en: string; producto: string; unidad: string | null; usuario: string | null };
type Pagina = { pagina: number; hay_mas: boolean; anomalias: Anomalia[] };
const TITULOS: Record<string, string> = { venta_sin_stock: "Venta sin stock" };
const cuando = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export function Anomalias() {
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<Pagina | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(() => {
    setError(null);
    api<Pagina>(`/anomalias?pagina=${pagina}`).then(setDatos).catch((e) => setError((e as { estado?: number }).estado ? (e as Error).message : "Sin conexión: las anomalías se ven cuando vuelva internet."));
  }, [pagina]);
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <main id="contenido" className="an" data-testid="anomalias" tabIndex={-1}>
      <h1>Anomalías</h1>
      <p className="an-bajada">Cada vez que lo que dice el sistema no coincide con lo que hay en el local queda anotado acá, con la fecha, el producto y quién estaba. Por ejemplo, cuando se vende algo que según el sistema no tenía stock.</p>
      {error && <p className="an-error" role="alert">{error} <button type="button" className="an-boton" onClick={cargar}>Reintentar</button></p>}
      {!datos && !error && <p className="an-bajada" aria-busy="true">Buscando las anomalías…</p>}
      {datos && datos.anomalias.length === 0 && <p className="an-vacio">{pagina === 1 ? "No hay ninguna anomalía anotada. Buena señal: el sistema y el local coinciden." : "No hay más anomalías."}</p>}
      {datos && datos.anomalias.length > 0 && (
        <ul className="an-lista" data-testid="lista-de-anomalias">
          {datos.anomalias.map((a) => (
            <li key={a.id} data-testid="anomalia">
              <span className="an-fecha">{cuando(a.creado_en)}</span>
              <strong className="an-producto">{a.producto}</strong>
              <span className="an-usuario">{a.usuario ?? "sin usuario"}</span>
              <span className="an-que"><b>{TITULOS[a.tipo] ?? a.tipo}.</b> {a.detalle}.</span>
            </li>
          ))}
        </ul>
      )}
      {datos && (pagina > 1 || datos.hay_mas) && (
        <nav className="an-paginas" aria-label="Páginas">
          <button type="button" className="an-boton" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Más nuevas</button>
          <span>Página {pagina}</span>
          <button type="button" className="an-boton" disabled={!datos.hay_mas} onClick={() => setPagina(pagina + 1)}>Más viejas</button>
        </nav>
      )}
    </main>
  );
}
