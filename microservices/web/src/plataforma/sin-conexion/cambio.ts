// Una cola de cambios hechos sin conexión. Cada cambio es un pedido completo (método, ruta y
// cuerpo) que se guarda primero en el dispositivo y se manda en orden; lo que no sale por un
// corte de red queda esperando y se reenvía al reconectar. Sirve para cualquier aplicación:
// quien la usa dice dónde se guarda, cómo se manda un cambio y, si quiere, cómo se funden dos
// cambios del mismo tipo. Los identificadores los pone quien crea el cambio, así reenviar no duplica.
// `autor` es quien lo hizo: un cambio sale solo con la sesión de esa persona (los guardados antes
// de que existiera el dato no lo tienen y salen con cualquiera, como hasta entonces).
export type Cambio = { orden: number; creado_en: string; tipo: string; metodo: "POST" | "PUT" | "PATCH" | "DELETE"; ruta: string; cuerpo: unknown; autor?: string };
export type CambioNuevo = Omit<Cambio, "orden" | "creado_en" | "autor">;

export type OpcionesDeCola = {
  // La base local donde vive la cola y el nombre de su almacén (con la clave `orden`).
  abrirBase: () => Promise<IDBDatabase>;
  almacen: string;
  // Manda un cambio al servidor. Si falla, tira un error.
  enviar: (cambio: CambioNuevo) => Promise<void>;
  // El código de estado de un error del servidor, o nada si fue un corte de red.
  estadoDe: (error: unknown) => number | undefined;
  // Un cambio nuevo puede reemplazar a los anteriores del mismo tipo y ruta que sigan en la
  // cola, fundiendo los cuerpos: así nunca se reenvía un valor viejo después de uno nuevo.
  seFunde?: (cambio: CambioNuevo) => boolean;
  // Quién hace los cambios ahora (el usuario de la sesión), o nada sin sesión. Cada cambio se
  // guarda a su nombre y sale solo con su sesión: si entra otra persona en el dispositivo, lo
  // que dejó la anterior sin mandar queda apartado, no se manda a nombre de la nueva.
  autor?: () => string | null;
  // Después de cada cambio que salió.
  alEnviar?: () => Promise<void> | void;
  // Sin base local (un navegador sin IndexedDB, o guardado deshabilitado) el cambio se manda
  // directo. Si ese envío falla, este es el error que ve quien lo pidió.
  errorSinBase?: (error: unknown) => unknown;
};
