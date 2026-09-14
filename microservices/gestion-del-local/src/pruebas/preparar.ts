import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// La configuración exige todas las variables al importar: acá valen para las unitarias.
process.env.PORT ??= "0";
process.env.DATABASE_URL ??= "postgres://prueba";
process.env.TOKEN_SERVICIO ??= "token-servicio";
process.env.LISTAS_DE_PROVEEDORES_URL ??= "http://listas.prueba";
process.env.ORIGEN_WEB ??= "http://web.prueba";
process.env.GOOGLE_CLIENT_ID ??= "cliente-google";
process.env.CARPETA_LISTAS ??= mkdtempSync(path.join(tmpdir(), "ferre-listas-"));
