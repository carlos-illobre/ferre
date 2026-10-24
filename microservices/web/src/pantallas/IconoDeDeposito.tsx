// Los íconos de las pantallas de Depósito como la v2 (Stock, Compras y Contar, decisión 148): los
// mismos de sus maquetas, de Lucide 0.460 (licencia ISC), con trazo de 2 px y el color del texto.
// Los usan el celular y la computadora; los trazos son fijos, escritos acá.
const TRAZOS = {
  "arrow-right": "<path d='M5 12h14'/><path d='m12 5 7 7-7 7'/>",
  "ban": "<circle cx='12' cy='12' r='10'/><path d='m4.9 4.9 14.2 14.2'/>",
  "barcode": "<path d='M3 5v14'/><path d='M8 5v14'/><path d='M12 5v14'/><path d='M17 5v14'/><path d='M21 5v14'/>",
  "calendar": "<path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/>",
  "calendar-check": "<path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/><path d='m9 16 2 2 4-4'/>",
  "camera": "<path d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'/><circle cx='12' cy='13' r='3'/>",
  "chart-column": "<path d='M3 3v16a2 2 0 0 0 2 2h16'/><path d='M18 17V9'/><path d='M13 17V5'/><path d='M8 17v-3'/>",
  "check": "<path d='M20 6 9 17l-5-5'/>",
  "chevron-right": "<path d='m9 18 6-6-6-6'/>",
  "circle-alert": "<circle cx='12' cy='12' r='10'/><line x1='12' x2='12' y1='8' y2='12'/><line x1='12' x2='12.01' y1='16' y2='16'/>",
  "circle-check": "<circle cx='12' cy='12' r='10'/><path d='m9 12 2 2 4-4'/>",
  "circle-dashed": "<path d='M10.1 2.182a10 10 0 0 1 3.8 0'/><path d='M13.9 21.818a10 10 0 0 1-3.8 0'/><path d='M17.609 3.721a10 10 0 0 1 2.69 2.7'/><path d='M2.182 13.9a10 10 0 0 1 0-3.8'/><path d='M20.279 17.609a10 10 0 0 1-2.7 2.69'/><path d='M21.818 10.1a10 10 0 0 1 0 3.8'/><path d='M3.721 6.391a10 10 0 0 1 2.7-2.69'/><path d='M6.391 20.279a10 10 0 0 1-2.69-2.7'/>",
  "clipboard-list": "<rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/>",
  "clock": "<circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>",
  "coins": "<circle cx='8' cy='8' r='6'/><path d='M18.09 10.37A6 6 0 1 1 10.34 18'/><path d='M7 6h1v4'/><path d='m16.71 13.88.7.71-2.82 2.82'/>",
  "file-spreadsheet": "<path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/><path d='M14 2v4a2 2 0 0 0 2 2h4'/><path d='M8 13h2'/><path d='M14 13h2'/><path d='M8 17h2'/><path d='M14 17h2'/>",
  "hash": "<line x1='4' x2='20' y1='9' y2='9'/><line x1='4' x2='20' y1='15' y2='15'/><line x1='10' x2='8' y1='3' y2='21'/><line x1='16' x2='14' y1='3' y2='21'/>",
  "history": "<path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/><path d='M3 3v5h5'/><path d='M12 7v5l4 2'/>",
  "image": "<rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/>",
  "info": "<circle cx='12' cy='12' r='10'/><path d='M12 16v-4'/><path d='M12 8h.01'/>",
  "keyboard": "<path d='M10 8h.01'/><path d='M12 12h.01'/><path d='M14 8h.01'/><path d='M16 12h.01'/><path d='M18 8h.01'/><path d='M6 8h.01'/><path d='M7 16h10'/><path d='M8 12h.01'/><rect width='20' height='16' x='2' y='4' rx='2'/>",
  "landmark": "<line x1='3' x2='21' y1='22' y2='22'/><line x1='6' x2='6' y1='18' y2='11'/><line x1='10' x2='10' y1='18' y2='11'/><line x1='14' x2='14' y1='18' y2='11'/><line x1='18' x2='18' y1='18' y2='11'/><polygon points='12 2 20 7 4 7'/>",
  "layers-3": "<path d='m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z'/><path d='m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59'/><path d='m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59'/>",
  "lock": "<rect width='18' height='11' x='3' y='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>",
  "map-pin": "<path d='M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0'/><circle cx='12' cy='10' r='3'/>",
  "minus": "<path d='M5 12h14'/>",
  "monitor": "<rect width='20' height='14' x='2' y='3' rx='2'/><line x1='8' x2='16' y1='21' y2='21'/><line x1='12' x2='12' y1='17' y2='21'/>",
  "notebook-pen": "<path d='M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4'/><path d='M2 6h4'/><path d='M2 10h4'/><path d='M2 14h4'/><path d='M2 18h4'/><path d='M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z'/>",
  "package": "<path d='M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z'/><path d='M12 22V12'/><path d='m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7'/><path d='m7.5 4.27 9 5.15'/>",
  "package-check": "<path d='m16 16 2 2 4-4'/><path d='M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14'/><path d='m7.5 4.27 9 5.15'/><polyline points='3.29 7 12 12 20.71 7'/><line x1='12' x2='12' y1='22' y2='12'/>",
  "package-minus": "<path d='M16 16h6'/><path d='M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14'/><path d='m7.5 4.27 9 5.15'/><polyline points='3.29 7 12 12 20.71 7'/><line x1='12' x2='12' y1='22' y2='12'/>",
  "pause": "<rect x='14' y='4' width='4' height='16' rx='1'/><rect x='6' y='4' width='4' height='16' rx='1'/>",
  "plus": "<path d='M5 12h14'/><path d='M12 5v14'/>",
  "printer": "<path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'/><path d='M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6'/><rect x='6' y='14' width='12' height='8' rx='1'/>",
  "qr-code": "<rect width='5' height='5' x='3' y='3' rx='1'/><rect width='5' height='5' x='16' y='3' rx='1'/><rect width='5' height='5' x='3' y='16' rx='1'/><path d='M21 16h-3a2 2 0 0 0-2 2v3'/><path d='M21 21v.01'/><path d='M12 7v3a2 2 0 0 1-2 2H7'/><path d='M3 12h.01'/><path d='M12 3h.01'/><path d='M12 16v.01'/><path d='M16 12h1'/><path d='M21 12v.01'/><path d='M12 21v-1'/>",
  "scan-barcode": "<path d='M3 7V5a2 2 0 0 1 2-2h2'/><path d='M17 3h2a2 2 0 0 1 2 2v2'/><path d='M21 17v2a2 2 0 0 1-2 2h-2'/><path d='M7 21H5a2 2 0 0 1-2-2v-2'/><path d='M8 7v10'/><path d='M12 7v10'/><path d='M17 7v10'/>",
  "search": "<circle cx='11' cy='11' r='8'/><path d='m21 21-4.3-4.3'/>",
  "send": "<path d='M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z'/><path d='m21.854 2.147-10.94 10.939'/>",
  "shopping-cart": "<circle cx='8' cy='21' r='1'/><circle cx='19' cy='21' r='1'/><path d='M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12'/>",
  "smartphone": "<rect width='14' height='20' x='5' y='2' rx='2' ry='2'/><path d='M12 18h.01'/>",
  "square-check-big": "<path d='M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5'/><path d='m9 11 3 3L22 4'/>",
  "square-pen": "<path d='M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z'/>",
  "tags": "<path d='m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19'/><path d='M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z'/><circle cx='6.5' cy='9.5' r='.5' fill='currentColor'/>",
  "trending-down": "<polyline points='22 17 13.5 8.5 8.5 13.5 2 7'/><polyline points='16 17 22 17 22 11'/>",
  "triangle-alert": "<path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'/><path d='M12 9v4'/><path d='M12 17h.01'/>",
  "truck": "<path d='M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2'/><path d='M15 18H9'/><path d='M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14'/><circle cx='17' cy='18' r='2'/><circle cx='7' cy='18' r='2'/>",
  "user-round": "<circle cx='12' cy='8' r='5'/><path d='M20 21a8 8 0 0 0-16 0'/>",
  "x": "<path d='M18 6 6 18'/><path d='m6 6 12 12'/>",
} as const satisfies Record<string, string>;
export type IconoDeDepositoNombre = keyof typeof TRAZOS;

export function IconoDeDeposito({ nombre, tam = 20, grosor = 2, className }: { nombre: IconoDeDepositoNombre; tam?: number; grosor?: number; className?: string }) {
  return (
    <svg className={className} width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: TRAZOS[nombre] }} />
  );
}
