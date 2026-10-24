// Las capas del front (ADR-028, que enmienda ADR-018): `app/` arranca; `plataforma/` es técnica
// reutilizable en cualquier aplicación; `ui/` son las piezas de «Mostrador»; `negocio/` tiene las
// reglas; `pantallas/` dibuja, con `comun/` para lo que las dos interfaces dibujan igual. Cada capa
// usa solo las de abajo. Lo que hoy no cumple está en `.dependency-cruiser-known-violations.json`
// y sale de ahí al ordenarlo. Corre en cada subida.
const FUERA_DE_LAS_PRUEBAS = "\\.test\\.tsx?$";
// Un archivo de un módulo (una carpeta de primer nivel de plataforma, datos, ui o negocio) que no es su index.
const ADENTRO_DE_UN_MODULO = "^src/(plataforma|datos|ui|negocio)/[^/]+/(?!index\\.tsx?$)";

module.exports = {
  forbidden: [
    {
      name: "la-plataforma-no-depende-del-negocio",
      comment: "Lo que está en src/plataforma se tiene que poder copiar a otro proyecto: no importa nada de fuera de esa carpeta (salvo librerías).",
      severity: "error",
      from: { path: "^src/plataforma/", pathNot: FUERA_DE_LAS_PRUEBAS },
      to: { path: "^src/|^\\.\\./api/", pathNot: "^src/plataforma/" },
    },
    {
      name: "las-pruebas-de-la-plataforma-tampoco",
      severity: "error",
      from: { path: "^src/plataforma/.*\\.test\\.tsx?$" },
      to: { path: "^src/", pathNot: "^src/(plataforma|pruebas)/" },
    },
    {
      name: "los-datos-no-saben-del-negocio",
      comment: "src/datos es cómo habla Ferrebress con el servidor y qué guarda en el dispositivo: usa solo src/datos y src/plataforma.",
      severity: "error",
      from: { path: "^src/datos/", pathNot: FUERA_DE_LAS_PRUEBAS },
      to: { path: "^src/", pathNot: "^src/(datos|plataforma)/" },
    },
    {
      name: "las-pantallas-piden-los-datos-al-negocio",
      comment: "Las pantallas no llaman a la API ni a IndexedDB: usan los hooks de src/negocio.",
      severity: "error",
      from: { path: "^src/pantallas/", pathNot: FUERA_DE_LAS_PRUEBAS },
      to: { path: "^src/datos/" },
    },
    {
      name: "la-ui-no-sabe-del-negocio",
      comment: "Las piezas de src/ui no saben qué es una venta: usan solo src/ui y src/plataforma.",
      severity: "error",
      from: { path: "^src/ui/", pathNot: FUERA_DE_LAS_PRUEBAS },
      to: { path: "^src/", pathNot: "^src/(ui|plataforma)/" },
    },
    {
      name: "el-negocio-no-dibuja",
      comment: "La regla de cada proceso (src/negocio) la usan las pantallas; nunca al revés, ni con piezas visuales.",
      severity: "error",
      from: { path: "^src/negocio/", pathNot: FUERA_DE_LAS_PRUEBAS },
      to: { path: "^src/(pantallas|ui|app)/" },
    },
    {
      name: "lo-comun-no-es-de-una-interfaz",
      comment: "src/pantallas/comun lo usan el celular y la computadora: no puede usar a ninguna de las dos.",
      severity: "error",
      from: { path: "^src/pantallas/comun/" },
      to: { path: "^src/(pantallas/(celular|compu)|app)/" },
    },
    {
      name: "el-celular-no-usa-la-computadora",
      severity: "error",
      from: { path: "^src/pantallas/celular/" },
      to: { path: "^src/pantallas/compu/" },
    },
    {
      name: "la-computadora-no-usa-el-celular",
      severity: "error",
      from: { path: "^src/pantallas/compu/" },
      to: { path: "^src/pantallas/celular/" },
    },
    {
      name: "solo-el-arranque-usa-el-arranque",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/app/" },
      to: { path: "^src/app/" },
    },
    {
      name: "por-la-puerta-de-entrada",
      comment: "Fuera de su carpeta, un módulo de plataforma, datos, ui o negocio se usa solo por su index.ts (las pruebas pueden entrar, para reemplazarlo).",
      severity: "error",
      from: { path: "^src/(plataforma|datos|ui|negocio)/([^/]+)/", pathNot: FUERA_DE_LAS_PRUEBAS },
      to: { path: ADENTRO_DE_UN_MODULO, pathNot: "^src/$1/$2/" },
    },
    {
      name: "por-la-puerta-de-entrada-desde-afuera",
      comment: "Lo mismo para las pantallas, el arranque y lo que todavía está suelto.",
      severity: "error",
      from: { pathNot: ["^src/(plataforma|datos|ui|negocio)/[^/]+/", FUERA_DE_LAS_PRUEBAS] },
      to: { path: ADENTRO_DE_UN_MODULO },
    },
    {
      name: "sin-ciclos",
      comment: "Ningún archivo depende, a la larga, de sí mismo.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" } },
};
