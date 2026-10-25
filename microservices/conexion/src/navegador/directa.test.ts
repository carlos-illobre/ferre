import { describe, expect, it } from "vitest";
import { intentarDirecta, PLAZO_DE_LA_DIRECTA_MS, type CanalDirecto } from "./directa.js";
import { relojDePrueba, soltar } from "../pruebas/red.js";
import { redRTC } from "../pruebas/rtc.js";

// Dos intentos, el de la computadora (arma) y el del celular, con las señales cruzadas.
function dosLados(red = redRTC()) {
  const reloj = relojDePrueba();
  const visto: string[] = [];
  const canales: CanalDirecto[] = [];
  const lados: Record<"compu" | "celu", ReturnType<typeof intentarDirecta>> = {} as never;
  const crear = (yo: "compu" | "celu", otro: "compu" | "celu") => intentarDirecta({
    inicia: yo === "compu", Conexion: red.Conexion, esperar: reloj.esperar,
    mandarSenal: (s) => lados[otro].recibirSenal(s),
    alAbrir: (c) => { visto.push(`${yo} abierto`); canales.push(c); },
    alFallar: (m) => visto.push(`${yo} falla ${m}`),
  });
  lados.celu = crear("celu", "compu");
  lados.compu = crear("compu", "celu");
  return { red, reloj, visto, canales, lados };
}

describe("conexión directa", () => {
  it("se arma sin servidores de terceros y abre un canal en los dos (023-E01, 023-E31)", async () => {
    const t = dosLados();
    for (let i = 0; i < 5; i++) await soltar();
    expect(t.visto.sort()).toEqual(["celu abierto", "compu abierto"]);
    expect(t.red.conexiones.map((c) => (c as unknown as { config: object }).config)).toEqual([{ iceServers: [] }, { iceServers: [] }]);
    // Lo que se manda por un canal llega al otro (023-E02).
    const recibido: string[] = [];
    t.canales[1]!.mensajes.escuchar((m) => recibido.push(m));
    t.canales[0]!.mandar("hola");
    await soltar();
    expect(recibido).toEqual(["hola"]);
    // Pasado el plazo no falla: ya abrió.
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    expect(t.visto).toHaveLength(2);
  });

  it("lo que llega antes de abrir no se pierde: se entrega apenas quien lo usa empieza a escuchar", async () => {
    const red = redRTC();
    const recibido: string[] = [];
    const intento = intentarDirecta({
      inicia: true, Conexion: red.Conexion, esperar: relojDePrueba().esperar, mandarSenal: () => {},
      alAbrir: (c) => { recibido.push("abierto"); c.mensajes.escuchar((m) => recibido.push(m)); },
      alFallar: () => recibido.push("falla"),
    });
    const canal = (red.conexiones[0] as unknown as { canal: { onmessage: (e: { data: string }) => void; onopen: () => void } }).canal;
    canal.onmessage({ data: "antes" });
    canal.onmessage({ data: "también" });
    canal.onopen();
    canal.onmessage({ data: "después" });
    expect(recibido).toEqual(["abierto", "antes", "también", "después"]);
    intento.cancelar();
  });

  it("descarta las señales de otro intento: un intento nuevo no aplica la respuesta al anterior", async () => {
    const red = redRTC();
    const reloj = relojDePrueba();
    const visto: string[] = [];
    const base = { Conexion: red.Conexion, esperar: reloj.esperar, alAbrir: () => visto.push("abierto"), alFallar: (m: string) => visto.push(`falla ${m}`) };
    let nuevo!: ReturnType<typeof intentarDirecta>;
    // El celular contesta la oferta del intento viejo, pero su respuesta le llega al nuevo.
    const celu = intentarDirecta({ ...base, inicia: false, mandarSenal: (sn) => nuevo.recibirSenal(sn) });
    intentarDirecta({ ...base, inicia: true, mandarSenal: (sn) => celu.recibirSenal(sn) });
    nuevo = intentarDirecta({ ...base, inicia: true, mandarSenal: () => {} });
    for (let i = 0; i < 5; i++) await soltar();
    expect((red.conexiones[1] as unknown as { remota: boolean }).remota).toBe(false);
    expect(visto).not.toContain("falla red");
  });

  it("el que contesta se pasa a una oferta más nueva, y descarta una vieja que llega tarde", async () => {
    const red = redRTC();
    const reloj = relojDePrueba();
    const visto: string[] = [];
    const senales = { viejo: [] as object[], nuevo: [] as object[] };
    const base = { Conexion: red.Conexion, esperar: reloj.esperar };
    const intento = (quien: "viejo" | "nuevo") => intentarDirecta({ ...base, inicia: true, alFallar: (m) => visto.push(`${quien} falla ${m}`), alAbrir: () => visto.push(`${quien} abierto`), mandarSenal: (sn) => senales[quien].push(sn) });
    // Dos intentos de la computadora: el viejo y el nuevo, cada uno con su oferta.
    intento("viejo");
    const nuevo = intento("nuevo");
    for (let i = 0; i < 3; i++) await soltar();
    const celu = intentarDirecta({ ...base, inicia: false, alFallar: (m) => visto.push(`celu falla ${m}`), alAbrir: () => visto.push("celu abierto"), mandarSenal: (sn) => nuevo.recibirSenal(sn) });
    const oferta = (de: object[]) => de.find((x) => "sdp" in x)!;
    // Al celular le llega primero la vieja: la contesta; después la nueva: deja la vieja y contesta esa.
    celu.recibirSenal(oferta(senales.viejo));
    celu.recibirSenal(oferta(senales.nuevo));
    // La vieja que llega otra vez, tarde, no cambia nada.
    celu.recibirSenal(oferta(senales.viejo));
    for (let i = 0; i < 5; i++) await soltar();
    expect(red.conexiones.filter((c) => (c as unknown as { cerrada: boolean }).cerrada)).toHaveLength(1);
    expect(visto.filter((v) => v.includes("falla"))).toEqual([]);
    celu.cancelar();
  });

  it("sin WebRTC falla enseguida por el navegador (023-E07)", () => {
    const visto: string[] = [];
    const intento = intentarDirecta({ inicia: true, Conexion: undefined, esperar: relojDePrueba().esperar, mandarSenal: () => {}, alAbrir: () => {}, alFallar: (m) => visto.push(m) });
    intento.recibirSenal({});
    intento.cancelar();
    expect(visto).toEqual(["navegador"]);
  });

  it("si la red no deja, a los 5 segundos falla por la red (023-E06)", async () => {
    const t = dosLados(redRTC({ deja: false }));
    await soltar();
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    expect(t.visto.sort()).toEqual(["celu falla red", "compu falla red"]);
    expect(t.red.conexiones.every((c) => (c as unknown as { cerrada: boolean }).cerrada)).toBe(true);
  });

  it("si falla armar la oferta o aplicar una señal, falla por la red", async () => {
    const t = dosLados(redRTC({ fallaEn: "oferta" }));
    await soltar();
    expect(t.visto).toEqual(["compu falla red"]);
    const u = dosLados(redRTC({ fallaEn: "remota" }));
    await soltar(); await soltar();
    expect(u.visto).toEqual(["celu falla red"]);
  });

  it("cancelado, no abre ni falla, y descarta las señales que llegan después", async () => {
    const t = dosLados();
    t.lados.celu.cancelar();
    t.lados.celu.recibirSenal({ sdp: { type: "offer", sdp: "x" } });
    await soltar(); await soltar();
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    expect(t.visto).toEqual(["compu falla red"]);
  });

  it("si se cancela mientras atiende una señal que después falla, no falla", async () => {
    const red = redRTC({ fallaEn: "remota" });
    const visto: string[] = [];
    const intento = intentarDirecta({ inicia: false, Conexion: red.Conexion, esperar: relojDePrueba().esperar, mandarSenal: () => {}, alAbrir: () => {}, alFallar: (m) => visto.push(m) });
    intento.recibirSenal({ sdp: { type: "offer", sdp: "x" } });
    await Promise.resolve(); await Promise.resolve();
    intento.cancelar();
    await soltar();
    expect(visto).toEqual([]);
  });

  it("el canal avisa si se cierra o si se cae la conexión, y se puede cerrar", async () => {
    const t = dosLados();
    for (let i = 0; i < 5; i++) await soltar();
    let cerrados = 0;
    t.canales[0]!.cerrado.escuchar(() => { cerrados += 1; });
    const compu = t.red.conexiones.find((c) => (c as unknown as { canal: unknown }).canal) as unknown as { cambiarEstado(e: string): void; canal: { cerrarDesdeAfuera(): void }; cerrada: boolean } | undefined;
    compu!.cambiarEstado("connected");
    compu!.cambiarEstado("disconnected");
    compu!.canal.cerrarDesdeAfuera();
    t.canales[0]!.cerrar();
    expect(cerrados).toBe(2);
    expect(compu!.cerrada).toBe(true);
  });
});
