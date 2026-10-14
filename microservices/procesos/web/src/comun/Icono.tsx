// Los íconos del módulo: trazos simples, del color del texto. Los de los pasos repiten la forma
// de su figura BPMN para que se reconozcan en la paleta, en la tabla y en la lista.

const TRAZOS = {
  inicio: '<circle cx="12" cy="12" r="8"/>',
  fin: '<circle cx="12" cy="12" r="8" stroke-width="3.5"/>',
  espera: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5.5"/>',
  tarea: '<rect x="3" y="6" width="18" height="12" rx="3"/>',
  persona: '<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="8" cy="10.5" r="1.6"/><path d="M5.5 15 q2.5 -3 5 0"/>',
  sistema: '<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="8" cy="11" r="2.4"/>',
  decision: '<path d="M12 3 L21 12 L12 21 L3 12 Z"/><path d="M9 9 L15 15 M15 9 L9 15"/>',
  paralelo: '<path d="M12 3 L21 12 L12 21 L3 12 Z"/><path d="M12 8 V16 M8 12 H16"/>',
  subproceso: '<rect x="3" y="6" width="18" height="12" rx="3"/><rect x="9.5" y="13" width="5" height="5"/><path d="M12 14 v3 M10.5 15.5 h3"/>',
  carril: '<rect x="3" y="5" width="18" height="14"/><path d="M7 5 V19 M7 12 H21"/>',
  documento: '<path d="M6 3 H14 L18 7 V21 H6 Z M14 3 V7 H18"/>',
  nota: '<path d="M9 4 H5 V20 H9"/><path d="M12 9 H19 M12 13 H19"/>',
  flecha: '<path d="M4 12 H18 M14 8 L18 12 L14 16"/>',
  deshacer: '<path d="M9 7 L4 12 L9 17"/><path d="M4 12 H15 a5 5 0 0 1 0 10 H12"/>',
  rehacer: '<path d="M15 7 L20 12 L15 17"/><path d="M20 12 H9 a5 5 0 0 0 0 10 H12"/>',
  mas: '<path d="M12 5 V19 M5 12 H19"/>',
  menos: '<path d="M5 12 H19"/>',
  ajustar: '<path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15"/>',
  tacho: '<path d="M4 7 H20 M9 7 V4 H15 V7 M6 7 L7 20 H17 L18 7"/>',
  lapiz: '<path d="M4 20 L5 15 L16 4 L20 8 L9 19 Z"/>',
  bajar: '<path d="M12 4 V16 M7 11 L12 16 L17 11 M5 20 H19"/>',
  subir: '<path d="M12 16 V4 M7 9 L12 4 L17 9 M5 20 H19"/>',
  izquierda: '<path d="M15 5 L8 12 L15 19"/>',
  derecha: '<path d="M9 5 L16 12 L9 19"/>',
  abajo: '<path d="M5 9 L12 16 L19 9"/>',
  lista: '<path d="M9 6 H20 M9 12 H20 M9 18 H20"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/>',
  diagrama: '<rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M10 7 H17 V14"/>',
  arrastrar: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  buscar: '<circle cx="11" cy="11" r="6"/><path d="M16 16 L20 20"/>',
  puntos: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  reloj: '<circle cx="12" cy="12" r="8"/><path d="M12 8 V12 L15 14"/>',
  ok: '<path d="M5 12 L10 17 L19 7"/>',
} as const;

export type NombreDeIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tam = 20 }: { nombre: NombreDeIcono; tam?: number }) {
  return <svg className="procesos-icono" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: TRAZOS[nombre] }} />;
}
