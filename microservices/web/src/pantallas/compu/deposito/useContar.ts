import { useCallback, useEffect, useMemo, useState } from "react";
import { abrirConteo, ordenarSectores, resumenDeSectores, useSectores, type Conteo } from "../../../negocio/deposito";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { mensajeDe } from "./deposito-comun";

// El estado de Contar en la computadora: los sectores (los que tienen un conteo en curso primero),
// el elegido (de entrada el primero) y su conteo abierto. Un sector con el conteo en curso se retoma
// solo al elegirlo: no cambia nada, solo lo trae. Empezar uno nuevo se pide con su botón.
const SIN_SECTORES = "Sin conexión: no se pudieron traer los sectores. Revisá internet y tocá «Reintentar».";
const SIN_ABRIR = "No se pudo abrir el conteo: empezar o retomar un sector necesita internet. Una vez abierto, se cuenta sin conexión.";

export function useContar() {
  const enLinea = useEnLinea();
  const { sectores, error: fallo, recargar: cargarSectores } = useSectores();
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [errorAlAbrir, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  useEffect(() => { if (enLinea && sectores === null) void cargarSectores(); }, [enLinea, sectores, cargarSectores]);
  const ordenados = useMemo(() => ordenarSectores(sectores ?? []), [sectores]);
  const elegido = ordenados.find((s) => s.id === elegidoId) ?? ordenados[0] ?? null;
  const abrir = useCallback(async (sectorId: string) => {
    setAbriendo(sectorId);
    try { setConteo(await abrirConteo(sectorId)); setError(null); }
    catch (e) { setError(mensajeDe(e, SIN_ABRIR)); }
    finally { setAbriendo(null); }
  }, []);
  useEffect(() => {
    if (!elegido || conteo?.sector_id === elegido.id) return;
    setConteo(null);
    if (elegido.conteo_abierto && enLinea) void abrir(elegido.id);
  }, [elegido, conteo?.sector_id, enLinea, abrir]);
  const crear = async (idNuevo: string) => { setNuevo(false); await cargarSectores(); setElegidoId(idNuevo); await abrir(idNuevo); };
  // Al terminar, el siguiente sector sin conteo en curso.
  const otro = () => { setConteo(null); setElegidoId(ordenados.find((s) => s.id !== elegido?.id && !s.conteo_abierto)?.id ?? null); };
  return {
    enLinea, sectores, cargarSectores, ordenados, resumen: resumenDeSectores(ordenados), elegido, setElegidoId, conteo, setConteo, abriendo, abrir, nuevo, setNuevo, crear, otro,
    error: errorAlAbrir ?? (fallo && sectores === null ? mensajeDe(fallo, SIN_SECTORES) : null),
  };
}
export type Contar = ReturnType<typeof useContar>;
