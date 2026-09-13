# ADR-001: Stack tecnológico: TypeScript para API y PWA, Python para el importador

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

Un local, un empleado, una laptop antigua en la que no se instala nada, internet con
microcortes. Dos personas desarrollan: el dueño y Claude. El sistema tiene que funcionar
desde el navegador, seguir vendiendo sin internet, y leer ~50 listas de precios en Excel
y PDF con formatos que cambian sin aviso.

Criterio del dueño: la mejor tecnología para cada problema; ante empate, TypeScript.

## Opciones consideradas

### 1. Todo en TypeScript
Un solo lenguaje. Descartado para el importador: para Excel sucio (encabezados en la fila
8, marcas intercaladas, textos rellenos de espacios), PDF con tablas y detección de
formato, openpyxl, pandas y pdfplumber no tienen equivalente en el ecosistema JS.

### 2. Todo en Python
FastAPI para la API es una opción sólida, pero el frontend igual es JavaScript, y la lógica
de cálculo de precios con su explicación (issue #47) tiene que ejecutarse también en el
navegador cuando no hay internet. Dos implementaciones del mismo cálculo se desfasan.

### 3. TypeScript para API y PWA, Python para el importador (elegida)
Cada problema con su herramienta. El cálculo de precios vive en un paquete TypeScript
compartido entre API y navegador. El importador es un servicio aparte con su propia API
que devuelve filas normalizadas.

### 4. App instalada en la laptop
Fue la primera propuesta. Descartada porque la laptop es antigua y el dueño no quiere
instalar nada en ella.

## Decisión

- **API del mostrador:** Node con Hono, TypeScript.
- **Frontend:** React con Vite, TypeScript, como PWA offline-first: service worker para
  abrir sin conexión, IndexedDB para catálogo, ventas del día y cola de cambios pendientes
  (ver ADR-005).
- **Paquete compartido `precios`:** cálculo de costo neto, margen y precio de venta, que
  devuelve siempre el resultado junto con su explicación paso a paso.
- **Importador:** Python, servicio aparte, con openpyxl/pandas y pdfplumber.
- **Contratos:** OpenAPI para la API; eventos de dominio en JSON (ver ADR-003).
- **Requisito del cliente:** un navegador actualizado (Chrome o Firefox). Nada más.

## Consecuencias

### Positivas
- El mostrador sigue vendiendo con internet cortado.
- El importador crece por configuración, no por código, cuando entren los 50 proveedores.
- El precio calculado sin conexión es idéntico al del servidor.

### Negativas
- Dos lenguajes: dos toolchains, dos Dockerfiles, dos formas de testear.
- La PWA depende de que el navegador no borre sus datos; se mitiga sincronizando apenas
  hay conexión y avisando cuando hay cambios pendientes (ADR-002).

### Lo que no cambia
El empleado sigue vendiendo con el mismo gesto que el cuaderno; el sistema no le pide más
datos que los que hoy anota.

## Cuándo revisar esta decisión

- Si el navegador de la laptop no soporta service workers o IndexedDB.
- Si el importador termina necesitando lógica de negocio del mostrador (señal de que el
  límite está mal puesto).

## Referencias

ADR-002, ADR-003, ADR-005. Issues #2, #18, #19, #47.
