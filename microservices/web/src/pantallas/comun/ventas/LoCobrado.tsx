import { NOMBRE_DE_MEDIO, type Cobro } from "../../../negocio/ventas";
import { IconoDeMedio } from "../../IconoDeMedio";
import { hora } from "./textos-del-dia";

// Debajo del total de la venta registrada, igual en las dos interfaces: el medio, el cliente,
// cuántos productos y la hora. En la computadora (largo) agrega que el stock ya se descontó.
export function LoCobrado({ cobro, tam, largo = false }: { cobro: Cobro; tam: number; largo?: boolean }) {
  const cuantos = `${cobro.productos} ${cobro.productos === 1 ? "producto" : "productos"}`;
  return (
    <>
      <IconoDeMedio medio={cobro.medio} tam={tam} />{NOMBRE_DE_MEDIO[cobro.medio]}{cobro.cliente ? ` · ${cobro.cliente}` : ""} · <span data-testid="exito-cuantos">{cuantos}</span> · {hora(cobro.fecha)}
      {largo && !cobro.encolado ? ". El stock ya se descontó." : ""}
    </>
  );
}
