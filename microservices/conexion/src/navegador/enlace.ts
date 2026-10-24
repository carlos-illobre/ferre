import { crearAvisos } from "../comun/avisos.js";
import { escribir, leer, type Mensaje, type Motivo } from "../comun/mensajes.js";
import { crearConfiable } from "./confiable.js";
import { intentarDirecta, type CanalDirecto, type IntentoDirecto } from "./directa.js";
import { almacenEnMemoria, crearMemoria, type Almacen } from "./memoria.js";
import { esperarReal, type Esperar } from "./reloj.js";
import { crearCaminoServidor, type EstadoDelServidor } from "./servidor.js";

// El enlace de un dispositivo con el otro (ADR-027): lo único que usa la aplicación. Escucha la
// sala en el servidor; cuando están los dos, prueba la conexión directa; si no se puede, sigue por
// el servidor y lo recuerda, sin volver a probar sola (decisión 152). Lo que se manda llega una
// sola vez y en orden por cualquiera de los dos caminos, y el estado dice cómo están.

// «solo»: el otro no está abierto. «conectando»: están los dos y se está probando la directa.
export type Conexion = "sin-conexion" | "conectando" | "solo" | "directa" | "servidor";
export type EstadoDelEnlace = {
  conexion: Conexion;
  // Por qué va por el servidor, si se sabe; y cuándo se probó la directa por última vez.
  motivo: Motivo | null;
  probadaEn: number | null;
  // Desde cuándo está en esta conexión, y la demora de la última confirmación.
  desde: number;
  demoraMs: number | null;
};

export type OpcionesDelEnlace = {
  // La dirección de la sala en el servidor: se escucha con GET y se manda con POST.
  url: string;
  // Quién arma la conexión directa: uno solo de los dos lados.
  inicia: boolean;
  cabeceras?: () => Record<string, string>;
  // Dónde recordar que la directa no se pudo (por omisión, en la memoria de la página).
  almacen?: Almacen;
  clave?: string;
  // Lo que se toma del navegador; se reemplaza en las pruebas.
  red?: Partial<{ fetch: typeof fetch; Conexion: typeof RTCPeerConnection | undefined; ahora: () => number; esperar: Esperar; epoca: string }>;
};

export function crearEnlace(o: OpcionesDelEnlace) {
  const red = {
    fetch: ((...a) => fetch(...a)) as typeof fetch,
    Conexion: (globalThis as { RTCPeerConnection?: typeof RTCPeerConnection }).RTCPeerConnection,
    ahora: Date.now,
    esperar: esperarReal,
    epoca: Math.random().toString(36).slice(2),
    ...o.red,
  };
  const recibidos = crearAvisos<unknown>();
  const cambios = crearAvisos<EstadoDelEnlace>();
  const cerrada = crearAvisos<void>();
  const memoria = crearMemoria(o.almacen ?? almacenEnMemoria(), o.clave ?? `conexion:${o.url}`);
  const servidor = crearCaminoServidor({ url: o.url, cabeceras: o.cabeceras ?? (() => ({})), fetch: red.fetch, esperar: red.esperar });
  let conectado = false;
  let otro = false;
  let porServidor = false;
  let canal: CanalDirecto | null = null;
  let intento: IntentoDirecto | null = null;
  let demoraMs: number | null = null;
  let estado: EstadoDelEnlace = { conexion: "sin-conexion", motivo: null, probadaEn: null, desde: red.ahora(), demoraMs };

  // Lo confiable va por la directa si está abierta; si no, por el servidor si el otro está. Si no
  // está, no se manda: queda pendiente y sale al saludarse.
  const confiable = crearConfiable({
    epoca: red.epoca,
    ahora: red.ahora,
    enviar: (texto) => (canal ? canal.mandar(texto) : otro && servidor.mandar(texto)),
  });
  const controlar = (m: Mensaje) => servidor.mandar(escribir(m));

  function actualizar() {
    const anotada = memoria.leer();
    const conexion: Conexion = canal ? "directa" : !conectado ? "sin-conexion" : !otro ? "solo" : porServidor ? "servidor" : "conectando";
    const nuevo = {
      conexion,
      motivo: conexion === "servidor" ? (anotada?.motivo ?? null) : null,
      probadaEn: anotada?.en ?? null,
      desde: conexion === estado.conexion ? estado.desde : red.ahora(),
      demoraMs,
    };
    if (JSON.stringify(nuevo) === JSON.stringify(estado)) return;
    estado = nuevo;
    cambios.avisar(estado);
  }

  // ---- La conexión directa ----
  function probar() {
    intento?.cancelar();
    intento = intentarDirecta({ inicia: o.inicia, Conexion: red.Conexion, esperar: red.esperar, mandarSenal: (d) => controlar({ t: "senal", d }), alAbrir: abrio, alFallar: fallo });
  }
  function abrio(c: CanalDirecto) {
    intento = null;
    canal = c;
    porServidor = false;
    c.mensajes.escuchar(alTexto);
    c.cerrado.escuchar(() => seCerro(c));
    confiable.saludar();
    actualizar();
  }
  // La directa que andaba se cortó: se sigue por el servidor; al volver a encontrarse, se rearma.
  function seCerro(c: CanalDirecto) {
    if (canal !== c) return;
    canal = null;
    c.cerrar();
    porServidor = true;
    confiable.saludar();
    actualizar();
  }
  // No se pudo: se recuerda, se le avisa al otro y se sigue por el servidor.
  function fallo(motivo: Motivo) {
    intento = null;
    memoria.anotar({ motivo, en: red.ahora() });
    controlar({ t: "sin-directa", motivo });
    sinDirecta();
  }
  function sinDirecta() {
    intento?.cancelar();
    intento = null;
    porServidor = true;
    actualizar();
  }

  // ---- El servidor ----
  // Llegó el otro: si ya se sabe que la directa no anda, se lo recuerda; si no, se la prueba.
  function seEncontraron() {
    const anotada = memoria.leer();
    porServidor = anotada !== null;
    if (anotada) controlar({ t: "sin-directa", motivo: anotada.motivo });
    else probar();
    confiable.saludar();
  }
  function alServidor(e: EstadoDelServidor) {
    const llego = e.otro && !otro;
    conectado = e.conectado;
    otro = e.otro;
    if (!otro) intento?.cancelar();
    if (llego && !canal) seEncontraron();
    actualizar();
  }

  // ---- Lo que llega, por cualquiera de los dos caminos ----
  const atender: { [T in Mensaje["t"]]: (m: Extract<Mensaje, { t: T }>) => void } = {
    hola: confiable.alSaludo,
    dato: confiable.alDato,
    ok: confiable.alConfirmacion,
    senal: (m) => intento?.recibirSenal(m.d),
    "sin-directa": (m) => {
      memoria.anotar({ motivo: m.motivo, en: red.ahora() });
      sinDirecta();
    },
    probar: () => {
      memoria.olvidar();
      porServidor = false;
      probar();
      actualizar();
    },
  };
  function alTexto(texto: string) {
    const m = leer(texto);
    if (m) (atender[m.t] as (m: Mensaje) => void)(m);
  }

  confiable.entregas.escuchar((texto) => recibidos.avisar(JSON.parse(texto)));
  confiable.demoras.escuchar((ms) => {
    demoraMs = ms;
    actualizar();
  });
  servidor.estado.escuchar(alServidor);
  servidor.mensajes.escuchar(alTexto);

  function cerrar() {
    const c = canal;
    canal = null;
    c?.cerrar();
    intento?.cancelar();
    servidor.cerrar();
  }
  servidor.cerrada.escuchar(() => {
    cerrar();
    cerrada.avisar();
  });

  return {
    // Lo que el otro manda (cualquier valor que se pueda pasar a JSON), en orden y una vez.
    recibidos,
    // Cada cambio de estado; `estado()` dice el de ahora.
    cambios,
    estado: () => estado,
    // La central cerró la sala (se soltó el emparejamiento): el enlace ya no sirve.
    cerrada,
    // El servidor no deja escuchar la sala (401, 403 o 404).
    rechazado: servidor.rechazado,
    // Mandar un valor; la promesa se cumple cuando el otro lo recibió.
    mandar: (dato: unknown) => confiable.mandar(JSON.stringify(dato)),
    // «Probar conexión directa»: olvida que no se pudo y la prueba una vez, en los dos lados.
    probarDirecta() {
      controlar({ t: "probar" });
      atender.probar({ t: "probar" });
    },
    cerrar,
  };
}

export type Enlace = ReturnType<typeof crearEnlace>;
