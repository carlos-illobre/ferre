import { useState } from "react";
import { useSesion } from "../../datos/sesion";
import { entrarConHuella } from "../../datos/credenciales";
import { describirDispositivo } from "../../plataforma/dispositivo";
import { entrarConGoogle } from "../vinculo";
import { marcarEntradaConGoogle } from "./ofrecer-huella";
import { olvidarSesionCerrada } from "./sesion-cerrada";

export { hayHuella, huellaVinculadaAca } from "../../datos/credenciales";

// Entrar con la credencial que devolvió el botón de Google: si el servidor no la acepta, el error
// sale para que la pantalla lo diga.
export function useEntrarConGoogle() {
  const { entrar } = useSesion();
  return async (credencial: string) => {
    const r = await entrarConGoogle(credencial, describirDispositivo());
    marcarEntradaConGoogle();
    olvidarSesionCerrada();
    entrar(r.token, r.usuario);
  };
}

// Entrar con la huella del dispositivo vinculado; `explicar` dice el error como lo dice cada pantalla.
export function useEntrarConHuella<E>(explicar: (e: unknown) => E) {
  const { entrar } = useSesion();
  const [error, setError] = useState<E | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function conHuella() {
    setOcupado(true); setError(null);
    try {
      const r = await entrarConHuella(describirDispositivo());
      olvidarSesionCerrada();
      entrar(r.token, r.usuario);
    } catch (e) { setError(explicar(e)); }
    finally { setOcupado(false); }
  }
  return { error, ocupado, conHuella };
}
