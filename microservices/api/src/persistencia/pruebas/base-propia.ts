import { randomUUID } from "node:crypto";
import { afterAll, inject } from "vitest";
import { cadena, comoAdmin } from "./admin.js";

// La base de este archivo de pruebas: una copia vacía de la plantilla migrada, que se borra al
// terminar. Así los archivos corren a la vez sin pisarse.
const nombre = `prueba_${randomUUID().replaceAll("-", "")}`;
await comoAdmin(`CREATE DATABASE ${nombre} TEMPLATE ${inject("plantilla")}`);
process.env.DATABASE_URL = cadena(nombre);

afterAll(async () => {
  const { cerrar } = await import("../conexion.js");
  await cerrar();
  await comoAdmin(`DROP DATABASE ${nombre} WITH (FORCE)`);
});
