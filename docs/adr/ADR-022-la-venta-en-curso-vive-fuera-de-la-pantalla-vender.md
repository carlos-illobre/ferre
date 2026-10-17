# ADR-022: La venta en curso vive fuera de la pantalla Vender

**Estado:** Aceptado
**Fecha:** 2026-10-17
**Precisa:** `specs/015-catalogo-para-vender/` (RF-108) y la decisión 60

---

## Contexto

La venta que se está armando (renglones, medio de pago, cliente) es hoy el estado de la pantalla
Vender: existe mientras esa pantalla está abierta. El espejo con el otro dispositivo también se
engancha desde ahí. Eso alcanzaba porque solo Vender agregaba productos.

La funcionalidad 015 pide «Agregar» desde el Catálogo, con Vender cerrada: el producto tiene que
entrar a la venta en curso, el menú tiene que decir cuántos lleva, y con el espejo tiene que
aparecer en el otro dispositivo aunque ninguno de los dos esté en Vender.

## Alternativas

1. **Abrir Vender por detrás al agregar.** Se agrega yendo a Vender y volviendo. Contradice
   la decisión 103 (se sigue en el Catálogo) y mueve al otro dispositivo en espejo.
2. **Una cola de «productos para agregar»** que Vender toma al abrirse. Dos lugares con parte
   de la venta; el número del menú y el espejo no verían lo pendiente.
3. **La venta en curso en el negocio compartido, fuera de cualquier pantalla (elegida).**
   Un solo lugar con la venta mientras la aplicación está abierta; Vender la muestra y la
   cambia, el Catálogo le agrega, el menú la cuenta, y el espejo se engancha una vez para toda
   la aplicación.

## Decisión

- La venta en curso es un estado del negocio compartido por las dos interfaces (ADR-018), con
  las mismas reglas de siempre para agregar (cantidad 1, suma si ya está). Las pantallas se
  suscriben a ella; ninguna la tiene como propia.
- El espejo de la venta se engancha desde la aplicación (celular y computadora), no desde
  Vender: lo que se agrega en el Catálogo viaja al otro dispositivo como cualquier cambio de la
  venta.
- Vive en memoria mientras la aplicación está abierta. No se guarda en el dispositivo: recargar
  la aplicación la vacía, como hoy.

## Consecuencias

- Salir de Vender ya no pierde la venta a medio armar: al volver, está como se dejó, con o sin
  espejo (lo que la decisión 60 pedía y hoy solo pasaba en espejo).
- Vender deja de ser dueña de la venta: sus pruebas pasan a armar la venta desde el negocio.
- Quien cobra vacía la venta en el negocio, y el número del menú desaparece en los dos lados.
