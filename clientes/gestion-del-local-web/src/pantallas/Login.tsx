import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import { useSesion, type Usuario } from "../sesion";
import { entrarConHuella, hayHuella } from "../credenciales";
import { marcarEntradaConGoogle } from "../componentes/OfrecerHuella";
import { AvisoError, Icono } from "../componentes/base";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Tres formas de entrar, sin contraseñas (ADR-011): la huella del celular vinculado, la
// cuenta de Google, o leyendo con el celular el QR que muestra la computadora.
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
      google.accounts.id.renderButton(boton.current, { theme: "filled_black", size: "large", text: "continue_with", locale: "es", width: 320 });
    }, 200);
    return () => clearInterval(intervalo);
  }, [entrar]);

  return (
    <>
      {GOOGLE_CLIENT_ID ? <div className="boton-google" ref={boton} /> : <p className="ayuda-clara">El botón de Google no está configurado en esta versión (falta VITE_GOOGLE_CLIENT_ID).</p>}
      {error && <div data-testid="error-google"><AvisoError texto={error} /></div>}
    </>
  );
}

export function Login() {
  return (
    <main className="entrar" data-testid="entrar">
      <div className="arriba">
        <div className="logo">fe</div>
        <h1>El cuaderno,<br />sin cuaderno.</h1>
        <p className="lema">Vendé, comprá y contá desde el celular o la computadora. Sin contraseñas: entrás con tu cuenta de Google autorizada, o con la huella del celular.</p>
      </div>
      <div className="abajo">
        <BotonHuella />
        <p className="ayuda-clara">Entrá con tu cuenta de Google.</p>
        <BotonGoogle />
        <LoginPorQr />
      </div>
    </main>
  );
}

// Entrar con la huella: solo en dispositivos que la tienen; el celular tiene que estar
// vinculado antes desde Negocio (entrando con Google una vez).
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
    <>
      <button type="button" className="boton blanco" onClick={conHuella} disabled={ocupado} data-testid="entrar-huella"><Icono nombre="huella" tam={22} />Entrar con la huella</button>
      {error && <div data-testid="error-huella"><AvisoError texto={error} /></div>}
    </>
  );
}

// La computadora muestra el QR; el celular lo lee con la cámara y abre /vincular?codigo=…
function LoginPorQr() {
  const { entrar } = useSesion();
  const [qr, setQr] = useState<string | null>(null);
  const [estado, setEstado] = useState<"inactivo" | "esperando" | "vencido">("inactivo");

  async function generar() {
    const { codigo, expiraEnSegundos } = await api<{ codigo: string; expiraEnSegundos: number }>("/sesiones/vinculaciones", {
      method: "POST",
      body: JSON.stringify({ dispositivo: describirDispositivo() }),
    });
    // Ruta por hash: en GitHub Pages una ruta real daría 404 al abrirla.
    const enlace = `${location.origin}${import.meta.env.BASE_URL}#/vincular?codigo=${encodeURIComponent(codigo)}`;
    setQr(await QRCode.toDataURL(enlace, { width: 220, margin: 1 }));
    setEstado("esperando");
    const fin = Date.now() + expiraEnSegundos * 1000;
    const consulta = setInterval(async () => {
      if (Date.now() > fin) { clearInterval(consulta); setEstado("vencido"); return; }
      try {
        const r = await api<{ estado: string; token?: string }>(`/sesiones/vinculaciones/${encodeURIComponent(codigo)}`);
        if (r.estado === "aprobada" && r.token) {
          clearInterval(consulta);
          const { usuario } = await fetch(`${import.meta.env.VITE_API_URL}/sesiones/actual`, { headers: { Authorization: `Bearer ${r.token}` } }).then((x) => x.json() as Promise<{ usuario: Usuario }>);
          entrar(r.token, usuario);
        }
      } catch {
        clearInterval(consulta);
        setEstado("vencido");
      }
    }, 2000);
  }

  return (
    <>
      {estado === "inactivo" && <button type="button" className="boton oscuro" onClick={generar}>Leer el código QR con el celular</button>}
      {estado === "esperando" && qr && (
        <div className="qr">
          <img src={qr} alt="Código para vincular" width={220} height={220} />
          <p>Abrí la cámara del celular, apuntá al código y tocá el enlace. Tiene que ser un celular donde ya entraste a ferre.</p>
        </div>
      )}
      {estado === "vencido" && <button type="button" className="boton oscuro" onClick={generar}>El código venció. Generar otro</button>}
    </>
  );
}

export function describirDispositivo(): string {
  const ua = navigator.userAgent;
  const tipo = /Android|iPhone|iPad/.test(ua) ? "celular" : "computadora";
  const navegador = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${tipo} · ${navegador}`;
}
