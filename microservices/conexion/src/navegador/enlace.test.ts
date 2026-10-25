import { describe, expect, it } from "vitest";
import { dispositivos, TEMA } from "../pruebas/dispositivos.js";
import { vistaDePrueba } from "../pruebas/vista.js";
import { CanalDePrueba, redRTC } from "../pruebas/rtc.js";
import { soltar } from "../pruebas/red.js";
import { PLAZO_DE_LA_DIRECTA_MS } from "./directa.js";
import { ESPERA_PARA_RECONECTAR_MS } from "./flujo.js";
import { crearCentral, crearEnlace } from "./index.js";

// Deja correr todo lo pendiente (los pedidos, el flujo, la conexión directa de mentira).
const asentar = async () => { for (let i = 0; i < 30; i++) await soltar(); };
// Los datos que pasaron por el servidor (no las señales ni los saludos).
const datosPorElServidor = (posts: string[]) => posts.flatMap((p) => JSON.parse(p) as string[]).filter((m) => m.includes('"t":"dato"'));

describe("enlace entre dos dispositivos", () => {
  it("con los dos abiertos y una red que deja, se hablan directo, sin pasar por el servidor (023-E01, 023-E02, 023-E03)", async () => {
    const rtc = redRTC();
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora");
    await asentar();
    expect(compu.conexion()).toBe("solo");
    const celu = t.abrir("celular");
    await asentar();
    expect([compu.conexion(), celu.conexion()]).toEqual(["directa", "directa"]);
    const confirmado = celu.enlace.mandar({ tipo: "codigo", codigo: "779" });
    void celu.enlace.mandar({ tipo: "codigo", codigo: "780" });
    await asentar();
    await confirmado;
    expect(compu.recibido).toEqual([{ tipo: "codigo", codigo: "779" }, { tipo: "codigo", codigo: "780" }]);
    expect(datosPorElServidor(t.red.posts)).toEqual([]);
    expect(celu.enlace.estado().demoraMs).toBe(0);
  });

  it("sin mensajes, no le pregunta nada al servidor (023-E05)", async () => {
    const rtc = redRTC();
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    t.abrir("computadora"); t.abrir("celular");
    await asentar();
    const antes = t.red.posts.length;
    t.reloj.avanzar(60 * 60 * 1000);
    await asentar();
    expect(t.red.posts.length).toBe(antes);
  });

  it("armada la directa, los dos dejan el canal con el servidor y siguen hablándose (025-E21)", async () => {
    const rtc = redRTC();
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    expect([compu.conexion(), celu.conexion()]).toEqual(["directa", "directa"]);
    expect(t.red.canales.cuantos()).toBe(0);
    void compu.enlace.mandar("sin canal");
    await asentar();
    expect(celu.recibido).toEqual(["sin canal"]);
  });

  it("si el otro se va, se entera por la directa y vuelve al canal a esperarlo (025-E22, E23)", async () => {
    const rtc = redRTC();
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    compu.enlace.cerrar();
    const directa = rtc.conexiones.find((c) => (c as unknown as { canal: unknown }).canal) as unknown as { canal: { otro: { cerrarDesdeAfuera(): void } } };
    directa.canal.otro.cerrarDesdeAfuera();
    await asentar();
    expect(celu.conexion()).toBe("solo");
    expect(t.red.canales.cuantos()).toBe(1);
  });

  it("por el servidor, con la aplicación oculta deja el canal y lo vuelve a abrir al volver (025-E24)", async () => {
    const t = dispositivos({});
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    expect(compu.conexion()).toBe("servidor");
    celu.vista.poner(false);
    await asentar();
    expect([compu.conexion(), celu.conexion(), t.red.canales.cuantos()]).toEqual(["solo", "sin-conexion", 1]);
    void compu.enlace.mandar("mientras tanto");
    await asentar();
    expect(celu.recibido).toEqual([]);
    celu.vista.poner(true);
    await asentar();
    expect([compu.conexion(), celu.conexion()]).toEqual(["servidor", "servidor"]);
    expect(celu.recibido).toEqual(["mientras tanto"]);
  });

  it("si el canal de uno se vuelve a abrir mientras se arma la directa, los dos la empiezan de nuevo y la arman (025-E25)", async () => {
    const rtc = redRTC();
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora");
    await asentar();
    // La computadora hace la oferta solo cuando ve llegar al celular: ahí, con la directa a medio armar…
    const celu = t.abrir("celular");
    for (let i = 0; i < 30 && compu.conexion() !== "conectando"; i++) await soltar();
    expect(compu.conexion()).toBe("conectando");
    // …a la computadora le aparece otra espera (otra pantalla): su canal se vuelve a abrir con más temas.
    compu.central.vigilar({ tema: "otra", temporaria: true });
    await asentar();
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    await asentar();
    expect([compu.conexion(), celu.conexion()]).toEqual(["directa", "directa"]);
    expect(compu.enlace.estado().probadaEn).toBeNull();
  });

  it("si el otro aparece en el servidor mientras uno cree tener la directa (se recargó), la dejan y la vuelven a armar (025-E23)", async () => {
    const rtc = redRTC();
    // El celular no llega a oír a la computadora por la directa: sigue escuchando el servidor.
    const enviar = CanalDePrueba.prototype.send;
    CanalDePrueba.prototype.send = function (this: CanalDePrueba, texto: string) {
      if (this !== rtc.conexiones.map((c) => (c as unknown as { canal: CanalDePrueba | null }).canal).find(Boolean)) enviar.call(this, texto);
    };
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    let compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    CanalDePrueba.prototype.send = enviar;
    expect([compu.conexion(), celu.conexion(), t.red.canales.cuantos()]).toEqual(["directa", "directa", 1]);
    // La computadora se recarga: el celular no se entera por la directa, pero la ve llegar al servidor.
    compu.enlace.cerrar();
    compu = t.abrir("computadora");
    await asentar();
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    await asentar();
    expect([compu.conexion(), celu.conexion()]).toEqual(["directa", "directa"]);
    expect(compu.enlace.estado().probadaEn).toBeNull();
  });

  it("con la directa armada, si se corta internet, siguen hablándose (023-E04)", async () => {
    const rtc = redRTC();
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    t.red.caer();
    await asentar();
    void celu.enlace.mandar("sin internet");
    await asentar();
    expect(compu.recibido).toEqual(["sin internet"]);
    expect(compu.conexion()).toBe("directa");
  });

  it("si la red no deja, a los 5 segundos van por el servidor, lo dicen, y los mensajes llegan igual (023-E06, 023-E08)", async () => {
    const rtc = redRTC({ deja: false });
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    expect(compu.conexion()).toBe("conectando");
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    await asentar();
    expect([compu.enlace.estado(), celu.enlace.estado()].map((e) => [e.conexion, e.motivo, e.probadaEn])).toEqual([["servidor", "red", 5000], ["servidor", "red", 5000]]);
    void celu.enlace.mandar("uno"); void celu.enlace.mandar("dos");
    await asentar();
    expect(compu.recibido).toEqual(["uno", "dos"]);
  });

  it("si un navegador no tiene la directa, van por el servidor enseguida (023-E07)", async () => {
    const rtc = redRTC();
    const t = dispositivos({ compu: rtc.Conexion, celu: undefined });
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    expect([compu.enlace.estado().motivo, celu.enlace.estado().motivo]).toEqual(["navegador", "navegador"]);
    expect([compu.conexion(), celu.conexion()]).toEqual(["servidor", "servidor"]);
  });

  it("lo que no se pudo se recuerda: al volver a abrir no se prueba de nuevo (023-E09)", async () => {
    const rtc = redRTC({ deja: false });
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    let compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    await asentar();
    compu.enlace.cerrar();
    await asentar();
    expect(celu.conexion()).toBe("solo");
    const intentos = rtc.conexiones.length;
    compu = t.abrir("computadora");
    await asentar();
    expect([compu.conexion(), celu.conexion()]).toEqual(["servidor", "servidor"]);
    expect(rtc.conexiones.length).toBe(intentos);
  });

  it("si se borra lo que se recordaba, sigue por el servidor sin decir por qué", async () => {
    const t = dispositivos({});
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    expect(compu.enlace.estado().motivo).toBe("navegador");
    t.almacenes.computadora.removeItem("conexion:/canal/vinculo");
    void compu.enlace.mandar("algo"); // la confirmación vuelve a armar el estado
    await asentar();
    expect([compu.conexion(), compu.enlace.estado().motivo]).toEqual(["servidor", null]);
  });

  it("«Probar conexión directa» la prueba una vez en los dos (023-E22)", async () => {
    const rtc = redRTC({ deja: false });
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    await asentar();
    // Sigue sin poderse: queda por el servidor, con la hora nueva.
    celu.enlace.probarDirecta();
    await asentar();
    expect(compu.conexion()).toBe("conectando");
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    await asentar();
    expect([compu.enlace.estado().probadaEn, celu.enlace.estado().probadaEn]).toEqual([10000, 10000]);
    expect(compu.conexion()).toBe("servidor");
  });

  it("si la directa andaba y se corta, vuelven al canal, se reencuentran y la rearman (023-E23, 025-E23)", async () => {
    const rtc = redRTC();
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    const canalDeLaCompu = rtc.conexiones.find((c) => (c as unknown as { canal: unknown }).canal) as unknown as { canal: { cerrarDesdeAfuera(): void; otro: { cerrarDesdeAfuera(): void } }; cambiarEstado(e: string): void };
    // La directa se corta en los dos lados.
    canalDeLaCompu.canal.cerrarDesdeAfuera();
    canalDeLaCompu.canal.otro.cerrarDesdeAfuera();
    canalDeLaCompu.cambiarEstado("failed"); // el segundo aviso de cierre no cambia nada
    void compu.enlace.mandar("en el medio");
    await asentar();
    expect([compu.conexion(), celu.conexion()]).toEqual(["directa", "directa"]);
    expect(compu.enlace.estado().motivo).toBeNull();
    expect(celu.recibido).toEqual(["en el medio"]);
    expect(t.red.canales.cuantos()).toBe(0);
  });

  it("mientras se prueba la directa, probar de nuevo, irse o cerrar cortan el intento en curso", async () => {
    const rtc = redRTC({ deja: false });
    const t = dispositivos({ compu: rtc.Conexion, celu: rtc.Conexion });
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    compu.enlace.probarDirecta();
    await asentar();
    celu.enlace.cerrar();
    await asentar();
    expect(compu.conexion()).toBe("solo");
    t.reloj.avanzar(PLAZO_DE_LA_DIRECTA_MS);
    await asentar();
    // Nadie llegó a fallar: no quedó anotado que no se puede.
    expect(compu.enlace.estado().probadaEn).toBeNull();
    expect(rtc.conexiones.every((c) => (c as unknown as { cerrada: boolean }).cerrada)).toBe(true);
  });

  it("con el otro cerrado, lo que se manda espera y llega al abrirlo, una sola vez (023-E18, 023-E32)", async () => {
    const t = dispositivos({});
    const celu = t.abrir("celular");
    await asentar();
    let llego = false;
    void celu.enlace.mandar("779").then(() => { llego = true; });
    await asentar();
    expect([celu.conexion(), llego]).toEqual(["solo", false]);
    const compu = t.abrir("computadora");
    await asentar();
    expect(compu.recibido).toEqual(["779"]);
    expect(llego).toBe(true);
  });

  it("sin el servidor y sin la directa, dice «sin conexión», y vuelve sola", async () => {
    const t = dispositivos({});
    t.red.caer();
    const compu = t.abrir("computadora");
    await asentar();
    expect(compu.conexion()).toBe("sin-conexion");
    t.red.volver();
    t.reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    await asentar();
    expect(compu.conexion()).toBe("solo");
  });

  it("si se cierra el tema mientras van por el servidor, los dos se enteran y el enlace deja de servir (023-E26)", async () => {
    const t = dispositivos({});
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    const cerrados: string[] = [];
    compu.enlace.cerrada.escuchar(() => cerrados.push("compu"));
    celu.enlace.cerrada.escuchar(() => cerrados.push("celu"));
    t.red.canales.cerrarTema(TEMA);
    await asentar();
    expect(cerrados).toEqual(["compu", "celu"]);
  });

  it("descarta lo que llega y no entiende, sin cortar (023-E28)", async () => {
    const t = dispositivos({});
    const compu = t.abrir("computadora"); const celu = t.abrir("celular");
    await asentar();
    t.red.canales.recibir(TEMA, "celular", JSON.stringify(["basura", '{"t":"senal","d":{}}']));
    void celu.enlace.mandar("sigue");
    await asentar();
    expect(compu.recibido).toEqual(["sigue"]);
  });

  it("si el servidor no lo deja escuchar, lo avisa", async () => {
    const fetch = (async () => new Response(null, { status: 404 })) as unknown as typeof globalThis.fetch;
    const central = crearCentral({ url: "/canal", entorno: { fetch, vista: vistaDePrueba(), red: { alCambiar: () => () => {} } } });
    const enlace = crearEnlace({ central, tema: "v", lado: "computadora", url: "/s", inicia: true });
    const rechazos: number[] = [];
    enlace.rechazado.escuchar((e) => rechazos.push(e));
    await asentar();
    expect(rechazos).toEqual([404]);
  });

  it("sin nada propio, usa lo del navegador", async () => {
    const central = crearCentral({ url: "http://127.0.0.1:9/canal" });
    const enlace = crearEnlace({ central, tema: "v", lado: "celular", url: "http://127.0.0.1:9/canal/v", inicia: false });
    await new Promise((ok) => setTimeout(ok, 200));
    expect(enlace.estado().conexion).toBe("sin-conexion");
    enlace.cerrar();
  });
});
