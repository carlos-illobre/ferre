import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Mejoras y errores (RF-80 y RF-81): quien usa la app avisa de un error con una captura,
// todos lo ven en la lista, y se marca resuelto con una nota y se reabre.
const TOKEN = "token-e2e-tickets-escritorio";
const EMAIL = "e2e-tickets-escritorio@ferre.test";
const TEXTO = "Al cobrar quedó la pantalla en blanco (E2E escritorio)";
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  const delUsuario = `(SELECT id FROM usuario WHERE email = '${EMAIL}')`;
  psql(`DELETE FROM ticket_foto WHERE ticket_id IN (SELECT id FROM ticket WHERE usuario_id IN ${delUsuario})`);
  psql(`DELETE FROM ticket WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM sesion WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM evento WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Tickets E2E', 'mostrador')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
});

test("avisar de un error con una captura, verlo en la lista, marcarlo resuelto y reabrirlo", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/v5/#/tickets");
  const pantalla = page.getByTestId("tickets");
  await expect(pantalla.getByRole("heading", { name: "Mejoras y errores" })).toBeVisible();

  // Sin texto no se envía.
  await page.getByTestId("enviar").click();
  await expect(pantalla.getByRole("alert")).toContainText("Contá qué pasó");

  await page.getByTestId("tipo-error").click();
  await page.getByTestId("descripcion").fill(TEXTO);
  await page.getByTestId("archivo-foto").setInputFiles({ name: "captura.png", mimeType: "image/png", buffer: FOTO });
  await expect(pantalla.getByLabel("Fotos del ticket").getByRole("listitem")).toHaveCount(1);
  await page.getByTestId("enviar").click();
  await expect(page.getByTestId("mensaje")).toContainText("Ticket enviado");

  // Quedó en la base con su foto, a nombre de quien lo escribió.
  expect(psql(`SELECT count(*) FROM ticket t JOIN ticket_foto f ON f.ticket_id = t.id WHERE t.descripcion = '${TEXTO}' AND t.estado = 'abierto'`)).toBe("1");
  const ticket = page.getByTestId("ticket").filter({ hasText: TEXTO });
  await expect(ticket).toContainText("Tickets E2E");
  await expect(ticket).toContainText("Error");

  // Marcar resuelto con una nota: pasa a los resueltos.
  await ticket.getByTestId("resolver").click();
  await ticket.getByTestId("nota").fill("Corregido en la versión de hoy");
  await ticket.getByTestId("confirmar-resuelto").click();
  await expect(page.getByTestId("ticket").filter({ hasText: TEXTO })).toHaveCount(0);
  await pantalla.getByRole("button", { name: /^Resueltos/ }).click();
  const resuelto = page.getByTestId("ticket").filter({ hasText: TEXTO });
  await expect(resuelto).toContainText("Resuelto por Tickets E2E");
  await expect(resuelto).toContainText("Corregido en la versión de hoy");
  expect(psql(`SELECT estado FROM ticket WHERE descripcion = '${TEXTO}'`)).toBe("resuelto");

  // Reabrir lo devuelve a los abiertos.
  await resuelto.getByTestId("reabrir").click();
  await expect(page.getByTestId("ticket").filter({ hasText: TEXTO })).toHaveCount(0);
  expect(psql(`SELECT estado || ' ' || COALESCE(nota, 'sin nota') FROM ticket WHERE descripcion = '${TEXTO}'`)).toBe("abierto sin nota");
});
