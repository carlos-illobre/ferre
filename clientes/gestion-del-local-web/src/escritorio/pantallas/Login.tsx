import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { useSesion, type Usuario } from "../../sesion";
import { entrarConHuella, hayHuella } from "../../credenciales";
import { marcarEntradaConGoogle } from "../../componentes/OfrecerHuella";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Dos formas de entrar, sin contraseñas (ADR-011): con la cuenta de Google o, si el
// dispositivo está vinculado, con la huella.
// El botón oficial de Google. Al entrar, el servidor acepta solo los correos que el
// dueño autorizó en Administración; si no, devuelve "no está autorizado".
export function BotonGoogle() {
  const { entrar } = useSesion();
  const [error, setError] = useState<string | null>(null);
  const boton = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !boton.current) return;
    const intervalo = setInterval(() => {
      const google = window.google;
      if (!google || !boton.current) return;
      clearInterval(intervalo);
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: "popup",
        callback: async ({ credential }) => {
          try {
            const r = await api<{ token: string; usuario: Usuario }>("/sesiones/google", {
              method: "POST",
              body: JSON.stringify({ credencial: credential, dispositivo: describirDispositivo() }),
            });
            marcarEntradaConGoogle();
            entrar(r.token, r.usuario);
          } catch (e) {
            setError((e as Error).message);
          }
        },
      });
      google.accounts.id.renderButton(boton.current, { theme: "outline", size: "large", text: "signin_with", locale: "es" });
    }, 200);
    return () => clearInterval(intervalo);
  }, [entrar]);

  return (
    <>
      {GOOGLE_CLIENT_ID ? <div ref={boton} /> : <p className="aviso">El botón de Google no está configurado en esta versión (falta VITE_GOOGLE_CLIENT_ID).</p>}
      {error && <p className="error" role="alert" data-testid="error-google">{error}</p>}
    </>
  );
}

// Dos formas de entrar, sin contraseñas (ADR-011): con la cuenta de Google o, si el
// dispositivo está vinculado, con la huella.
export function Login() {
  return (
    <main className="pantalla-centrada">
      <h1 className="marca">ferre</h1>
      <BotonHuella />
      <p>Entrá con tu cuenta de Google.</p>
      <BotonGoogle />
    </main>
  );
}

// Entrar con la huella: solo en dispositivos que la tienen; el celular tiene que estar
// vinculado antes desde Administración (entrando con Google una vez).
export function BotonHuella() {
  const { entrar } = useSesion();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (!hayHuella()) return null;
  async function conHuella() {
    setOcupado(true); setError(null);
    try { const r = await entrarConHuella(describirDispositivo()); entrar(r.token, r.usuario); }
    catch (e) { setError((e as Error).name === "NotAllowedError" ? "No se leyó la huella. Probá de nuevo." : (e as Error).message); }
    finally { setOcupado(false); }
  }
  return (
    <section className="entrar-huella">
      <button className="grande" onClick={conHuella} disabled={ocupado} data-testid="entrar-huella">👆 Entrar con la huella</button>
      <p className="ayuda">Si este celular ya está vinculado a tu cuenta.</p>
      {error && <p className="error" role="alert" data-testid="error-huella">{error}</p>}
    </section>
  );
}

export function describirDispositivo(): string {
  const ua = navigator.userAgent;
  const tipo = /Android|iPhone|iPad/.test(ua) ? "celular" : "computadora";
  const navegador = /Firefox/.test(ua) ? "Firefox" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "navegador";
  return `${tipo} · ${navegador}`;
}
