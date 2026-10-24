// Los íconos de la v2 que no tienen las piezas de cada interfaz (los de Lucide que usa el director de
// arte en Anomalías, Procesos, Mejoras y errores y Configuración). Los mismos trazos en el celular y
// en la computadora; se pintan con el color del texto.
const TRAZOS = {
  recibo: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.500v-11",
  balanza: "m16 16 3-8 3 8c-.870.650-1.920 1-3 1s-2.130-.350-3-1ZM2 16l3-8 3 8c-.870.650-1.920 1-3 1s-2.130-.350-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",
  porcentaje: "M19 5 5 19M6.500 9a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5ZM17.500 20a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5Z",
  unir: "M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21V9a9 9 0 0 0 9 9",
  bandeja: "M22 12h-6l-2 3h-4l-2-3H2M5.450 5.110 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.450-6.890A2 2 0 0 0 16.760 4H7.240a2 2 0 0 0-1.790 1.110Z",
  "persona-fuera": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 8l5 5M22 8l-5 5",
  "reloj-de-arena": "M5 22h14M5 2h14M17 22v-4.170a2 2 0 0 0-.590-1.410L12 12l-4.410 4.410A2 2 0 0 0 7 17.830V22M7 2v4.170a2 2 0 0 0 .590 1.410L12 12l4.410-4.410A2 2 0 0 0 17 6.170V2",
  historia: "M3 12a9 9 0 1 0 9-9 9.750 9.750 0 0 0-6.740 2.740L3 8M3 3v5h5M12 7v5l4 2",
  derecha: "m9 18 6-6-6-6",
  abajo: "m6 9 6 6 6-6",
  calendario: "M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM3 10h18",
  paquete: "M11 21.730a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.730l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.730ZM12 22V12M3.300 7l7.700 4.730a2 2 0 0 0 2 0L20.700 7M7.500 4.270l9 5.150",
  alerta: "m21.730 18-8-14a2 2 0 0 0-3.480 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.730-3ZM12 9v4M12 17h.010",
  cruz: "M18 6 6 18M6 6l12 12",
  tilde: "M20 6 9 17l-5-5",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.010",
  candado: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM7 11V7a5 5 0 0 1 10 0v4",
  celular: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM12 18h.010",
  "nube-subir": "M12 13v8M4 14.900A7 7 0 1 1 15.710 8h1.790a4.500 4.500 0 0 1 2.500 8.240M8 17l4-4 4 4",
  "lista-tildada": "m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8",
  repetir: "M3 12a9 9 0 0 1 9-9 9.750 9.750 0 0 1 6.740 2.740L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.750 9.750 0 0 1-6.740-2.740L3 16M8 16H3v5",
  carrito: "M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM2.050 2.050h2l2.660 12.420a2 2 0 0 0 2 1.580h9.780a2 2 0 0 0 1.950-1.570l1.650-7.430H5.120",
  "no-llevo": "M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM2.050 2.050h2l2.660 12.420a2 2 0 0 0 2 1.580h9.780a2 2 0 0 0 1.950-1.570l1.650-7.430H5.120M10 7l5 5M15 7l-5 5",
} as const;
export type IconoV2 = keyof typeof TRAZOS;

export function IconoDeLaV2({ nombre, tam = 20, grosor = 2, className }: { nombre: IconoV2; tam?: number; grosor?: number; className?: string }) {
  return (
    <svg className={className} width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
