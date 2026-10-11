import type { ReactNode } from "react";

// Íconos de trazo, en la misma línea que los de Figma (24 × 24, trazo 1,9, puntas redondas).
const TRAZOS = {
  // ---- Uno distinto por destino
  vender: <><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  ventas: <><path d="M5 3v18l2.3-1.5L9.7 21l2.3-1.5 2.3 1.5 2.4-1.5L19 21V3H5Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  productos: <><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" /><path d="m4 7 8 4 8-4M12 11v10" /></>,
  recibir: <><path d="M3 5h11v11H3V5ZM14 9h4l3 4v3h-7V9Z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  menu: <path d="M5 7h14M5 12h14M5 17h14" />,
  listas: <><path d="M6 3h9l3 3v15H6V3Z" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
  duplicados: <><rect x="8.5" y="8.5" width="12" height="12" rx="2" /><path d="M15.5 5.5v-.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2H6" /></>,
  stock: <><path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></>,
  contar: <><rect x="8" y="2.5" width="8" height="4" rx="1" /><path d="M16 4.5h2a2 2 0 0 1 2 2V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4.5" /></>,
  negocio: <><path d="M4 4v16h16" /><path d="M8.5 16v-4M12.5 16V8M16.5 16v-6" /></>,
  usuarios: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6" /><path d="M18 14.6a6.5 6.5 0 0 1 3.5 5.4" /></>,
  actividad: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" /><path d="M3.5 3.5v5h5" /><path d="M12 7.5V12l3 2" /></>,
  // ---- Acciones
  buscar: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
  escanear: <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10" />,
  camara: <><path d="M4 8h3.5l1.8-3h5.4l1.8 3H20v11H4V8Z" /><circle cx="12" cy="13" r="3.5" /></>,
  huella: <><path d="M12 10a2 2 0 0 0-2 2c0 1-.1 2.5-.3 4" /><path d="M14 13.1c0 2.4 0 6.4-1 8.9" /><path d="M17.3 21c.1-.6.4-2.3.5-3" /><path d="M2 12a10 10 0 0 1 18-6" /><path d="M2 16h.01" /><path d="M21.8 16c.2-2 .1-5.4 0-6" /><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .3-2" /><path d="M8.7 22c.2-.7.4-1.3.5-2" /><path d="M9 6.8a6 6 0 0 1 9 5.2v2" /></>,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  tilde: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  flecha: <path d="m9 18 6-6-6-6" />,
  "flecha-izquierda": <path d="m15 18-6-6 6-6" />,
  "flecha-abajo": <path d="m6 9 6 6 6-6" />,
  "flecha-arriba": <path d="m6 15 6-6 6 6" />,
  subir: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  bajar: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>,
  basura: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="m6 7 1 13h10l1-13" /><path d="M10 11v5M14 11v5" /></>,
  deshacer: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
  editar: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  unir: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  separar: <><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 21v-7.3a4 4 0 0 0-1.2-2.9L3 3" /><path d="m15 9 6-6" /></>,
  filtro: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  salir: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  // ---- Cosas
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  celular: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  computadora: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  plata: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>,
  etiqueta: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><path d="M7.5 8.5h.01" /></>,
  "codigo-de-barras": <path d="M4 6v12M7.5 6v12M11 6v12M13.5 6v12M17 6v12M20 6v12" />,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M20 20v.01M14 20h3M20 17v.01" /></>,
  candado: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  // ---- Estados
  alerta: <><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></>,
  informacion: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  error: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  conexion: <><path d="M4 9a12 12 0 0 1 16 0M7 13a7.5 7.5 0 0 1 10 0M10 17a3 3 0 0 1 4 0" /><path d="M12 20h.01" /></>,
  "sin-conexion": <><path d="M8.5 12a7.5 7.5 0 0 1 1.6-1M4.5 9A12 12 0 0 1 7 7.2M12.5 5.5A12 12 0 0 1 20 9M15.5 11.6c.5.4 1 .8 1.5 1.4M10 17a3 3 0 0 1 4 0" /><path d="M12 20h.01" /><path d="m4 3 16 18" /></>,
  guardado: <><path d="M7 18.5a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.6 3.8 3.8 0 0 1-.5 7.4H7Z" /><path d="m9.5 13.5 2 2 3.5-3.5" /></>,
} satisfies Record<string, ReactNode>;

export type NombreDeIcono = keyof typeof TRAZOS | "google";

type Props = {
  nombre: NombreDeIcono;
  /** Lado en píxeles. Por defecto 22. */
  tam?: number;
  /** Grosor del trazo. Por defecto 1,9. */
  grosor?: number;
  className?: string;
};

/** Ícono decorativo (no se lee): el texto siempre va al lado, o en `aria-label` del botón. */
export function Icono({ nombre, tam = 22, grosor = 1.9, className }: Props) {
  if (nombre === "google") {
    // El logo de Google va en sus cuatro colores, no en el color del texto.
    return (
      <svg className={className} width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    );
  }
  return (
    <svg className={className} width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TRAZOS[nombre]}
    </svg>
  );
}

/** Todos los nombres, para mostrarlos o validarlos. */
export const NOMBRES_DE_ICONOS = [...Object.keys(TRAZOS), "google"] as NombreDeIcono[];
