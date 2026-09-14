import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api } from "./api";
import type { Usuario } from "./sesion";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

// Passkeys (ADR-011, enmienda): vincular este celular con la huella, y entrar con ella.
export const hayHuella = () => browserSupportsWebAuthn();

export type Credencial = { id: string; dispositivo: string | null; creada_en: string; ultimo_uso_en: string | null };

export async function vincularEsteDispositivo(dispositivo: string): Promise<Credencial> {
  const { desafioId, opciones } = await api<{ desafioId: string; opciones: PublicKeyCredentialCreationOptionsJSON }>("/credenciales/registro/opciones", { method: "POST", body: "{}" });
  const respuesta = await startRegistration({ optionsJSON: opciones });
  return api<Credencial>("/credenciales/registro", { method: "POST", body: JSON.stringify({ desafioId, respuesta, dispositivo }) });
}

export async function entrarConHuella(dispositivo: string): Promise<{ token: string; usuario: Usuario }> {
  const { desafioId, opciones } = await api<{ desafioId: string; opciones: PublicKeyCredentialRequestOptionsJSON }>("/credenciales/login/opciones", { method: "POST", body: "{}" });
  const respuesta = await startAuthentication({ optionsJSON: opciones });
  return api<{ token: string; usuario: Usuario }>("/credenciales/login", { method: "POST", body: JSON.stringify({ desafioId, respuesta, dispositivo }) });
}

export const listarCredenciales = () => api<Credencial[]>("/credenciales");
export const quitarCredencial = (id: string) => api<void>(`/credenciales/${encodeURIComponent(id)}`, { method: "DELETE" });
