import { describe, expect, it } from "vitest";
import { problemaDelEvento } from "auditoria-kit";
import { enPalabras, personasDelDetalle } from "./en-palabras.js";

const persona = (id: unknown) => (id === "u-ana" ? "Ana" : "un usuario");

// Cada evento sale de Acceso con sus palabras: Auditoría no conoce los tipos (specs/027, 029).
describe("los eventos de Acceso en palabras", () => {
  it("entrar: con qué y desde dónde", () => {
    expect(enPalabras("sesion.iniciada", { medio: "huella", dispositivo: "Celular de Ana" }, persona))
      .toEqual({ titulo: "Entró", detalle: "Con la huella · Celular de Ana", grupo: "Entradas y salidas de la app", importancia: "normal" });
    expect(enPalabras("sesion.iniciada", { medio: "celular" }, persona).detalle).toBe("Con el celular");
    expect(enPalabras("sesion.iniciada", { medio: "google" }, persona).detalle).toBe("Con Google");
  });

  it("nombra a la persona sobre la que se hizo el cambio", () => {
    expect(personasDelDetalle("usuario.modificado", { id: "u-ana" })).toEqual(["u-ana"]);
    expect(personasDelDetalle("apartado.aceptado", { de: "u-ana" })).toEqual(["u-ana"]);
    expect(personasDelDetalle("sesion.iniciada", { id: "s1" })).toEqual([]);
    expect(enPalabras("usuario.modificado", { id: "u-ana", cambios: { activo: false } }, persona)).toMatchObject({ titulo: "Usuario desactivado", detalle: "Desactivó a Ana", grupo: "Usuarios" });
    expect(enPalabras("usuario.modificado", { id: "u-ana", cambios: { activo: true, roles: ["r"], nombre: "Ana P." } }, persona)).toMatchObject({ titulo: "Cambio en un usuario", detalle: "Reactivó a Ana · Cambió los roles de Ana · Ahora se llama Ana P." });
    expect(enPalabras("apartado.descartado", { de: "u-otro" }, persona).detalle).toBe("De un usuario");
    expect(enPalabras("usuario.creado", { email: "ana@ferre.test", roles: ["Vendedor"] }, persona).detalle).toBe("ana@ferre.test · con 1 rol");
  });

  it("los ajustes, de cuánto a cuánto", () => {
    expect(enPalabras("sistema.ajustes_cambiados", { antes: { sesion_segundos: 60, vinculo_dias: 30 }, despues: { sesion_segundos: 300, vinculo_dias: 45 } }, persona).detalle)
      .toBe("Sesión recordada: de 1 min a 5 min · Días del vínculo: de 30 a 45");
    expect(enPalabras("sistema.ajustes_cambiados", { antes: { celular_segundos: 30 }, despues: { celular_segundos: 0 } }, persona).detalle).toBe("Pregunta del celular: de 30 s a no recordarla");
    expect(enPalabras("vinculo.dias_cambiados", { dias: 7 }, persona).detalle).toBe("7 días");
  });

  it("un tipo sin palabras propias se lee igual, y sin detalle", () => {
    expect(enPalabras("cosa.rara_nueva", {}, persona)).toEqual({ titulo: "cosa rara nueva", detalle: null, grupo: "Otras", importancia: "normal" });
  });

  it("cada evento que anota Acceso cumple el contrato", () => {
    const tipos = ["usuario.creado", "usuario.modificado", "rol.creado", "rol.modificado", "rol.borrado", "apartado.aceptado", "apartado.descartado", "sesion.iniciada", "sesion.cerrada",
      "sesion.revocada", "credencial.vinculada", "credencial.quitada", "puesto.vinculado", "puesto.desvinculado", "vinculo.dias_cambiados", "sistema.ajustes_cambiados"];
    for (const tipo of tipos) {
      const palabras = enPalabras(tipo, { nombre: "X", dias: 7 }, persona);
      expect(palabras.titulo, tipo).not.toBe(tipo.replace(/[._]/g, " "));
      expect(palabras.grupo, tipo).not.toBe("Otras");
      expect(problemaDelEvento({ id: crypto.randomUUID(), servicio: "acceso", fecha: new Date().toISOString(), tipo, ...palabras }), tipo).toBeNull();
    }
  });
});
