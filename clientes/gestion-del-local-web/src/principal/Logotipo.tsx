import { ISOTIPO_SOBRE_CLARO, ISOTIPO_SOBRE_OSCURO } from "./isotipo";
import "./logotipo.css";

// El logotipo: el isotipo hace de F en la palabra Ferrebress (decisión 48). `sobre` dice
// sobre qué fondo va, para elegir el isotipo que se lee. El tamaño lo da la letra del lugar.
export function Logotipo({ sobre = "oscuro" }: { sobre?: "oscuro" | "claro" }) {
  return (
    <span className="logotipo" role="img" aria-label="Ferrebress">
      <span className="logotipo-isotipo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: sobre === "oscuro" ? ISOTIPO_SOBRE_OSCURO : ISOTIPO_SOBRE_CLARO }} />
      <span aria-hidden="true">errebress</span>
    </span>
  );
}

// El isotipo solo, para donde no entra la palabra.
export function Isotipo({ sobre = "oscuro", lado = 32 }: { sobre?: "oscuro" | "claro"; lado?: number }) {
  return <span style={{ display: "inline-block", width: lado, height: lado }} role="img" aria-label="Ferrebress" dangerouslySetInnerHTML={{ __html: sobre === "oscuro" ? ISOTIPO_SOBRE_OSCURO : ISOTIPO_SOBRE_CLARO }} />;
}
