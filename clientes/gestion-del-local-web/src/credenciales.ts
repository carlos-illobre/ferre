import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api } from "./api";
import type { Usuario } from "./sesion";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

// Passkeys (ADR-011, enmienda): vincular este celular con la huella, y entrar con ella.
export const hayHuella = () => browserSupportsWebAuthn();

export type Credencial = { id: string; dispositivo: string | null; creada_en: string; ultimo_uso_en: string | null };

// Quien muestre la lista de celulares se entera de un alta hecha en otro lado (la oferta
// al primer login, por ejemplo).
export const EVENTO_CREDENCIALES = "ferre.credenciales";
export async function vincularEsteDispositivo(dispositivo: string): Promise<Credencial> {
  const { desafioId, opciones } = await api<{ desafioId: string; opciones: PublicKeyCredentialCreationOptionsJSON }>("/credenciales/registro/opciones", { method: "POST", body: "{}" });
  const respuesta = await startRegistration({ optionsJSON: opciones });
  const c = await api<Credencial>("/credenciales/registro", { method: "POST", body: JSON.stringify({ desafioId, respuesta, dispositivo }) });
  window.dispatchEvent(new Event(EVENTO_CREDENCIALES));
  anotarHuellaAca();
  return c;
}

// Si este dispositivo ya vinculó o usó su huella con Ferrebress. La computadora ofrece «Entrar
// con la huella» solo en ese caso (RF-76): si no, el sistema operativo abre su propio diálogo
// para usar un teléfono, que es largo y confunde.
const CLAVE_HUELLA_ACA = "ferre.huella-en-este-dispositivo";
function anotarHuellaAca() { try { localStorage.setItem(CLAVE_HUELLA_ACA, "1"); } catch { /* sin almacenamiento */ } }
export function huellaVinculadaAca(): boolean { try { return localStorage.getItem(CLAVE_HUELLA_ACA) === "1"; } catch { return false; } }

export async function entrarConHuella(dispositivo: string): Promise<{ token: string; usuario: Usuario }> {
  const { desafioId, opciones } = await api<{ desafioId: string; opciones: PublicKeyCredentialRequestOptionsJSON }>("/credenciales/login/opciones", { method: "POST", body: "{}" });
  const respuesta = await startAuthentication({ optionsJSON: opciones });
  const r = await api<{ token: string; usuario: Usuario }>("/credenciales/login", { method: "POST", body: JSON.stringify({ desafioId, respuesta, dispositivo }) });
  anotarHuellaAca();
  return r;
}

export const listarCredenciales = () => api<Credencial[]>("/credenciales");
export const quitarCredencial = (id: string) => api<void>(`/credenciales/${encodeURIComponent(id)}`, { method: "DELETE" });
