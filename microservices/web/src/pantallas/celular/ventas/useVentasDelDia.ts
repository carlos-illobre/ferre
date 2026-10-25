import { useState } from "react";
import { buscarVentas, useResumenDelDia, type VentaDelDia } from "../../../negocio/ventas";
import { useSeVaSolo } from "../../../plataforma/tiempo";

// El estado de «Ventas de hoy» en el celular: el día, el panel de abajo que está abierto («Otro
// día» o «Buscar», decisión 141), lo buscado, la venta abierta, el cambio y el aviso.
export function useVentasDelDia(anulaHoy: boolean, anulaCualquierDia: boolean) {
  const [dia, setDia] = useState<string | null>(null);
  const r = useResumenDelDia(dia);
  const [panel, setPanel] = useState<"otro-dia" | "buscar" | null>(null);
  const [texto, setTexto] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [cambio, setCambio] = useState<{ venta: VentaDelDia | null } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useSeVaSolo(aviso, () => setAviso(null), 5000);
  const todas = r.ventas ?? [];
  return {
    r, todas, halladas: buscarVentas(todas, texto, null), venta: todas.find((v) => v.id === abierta) ?? null,
    // Anular: las de hoy con «Anular ventas del día»; las de otro día, solo con «de cualquier día».
    anula: r.esHoy ? anulaHoy : anulaCualquierDia,
    // El cambio lo registra quien anula las ventas del día, para cualquier venta de 15 días (decisión 135).
    cambia: anulaHoy || anulaCualquierDia,
    setDia, panel, setPanel, texto, setTexto, setAbierta, cambio, setCambio, aviso, setAviso,
    cerrarBusqueda: () => { setPanel(null); setTexto(""); },
  };
}
export type VentasDelDiaCelular = ReturnType<typeof useVentasDelDia>;
