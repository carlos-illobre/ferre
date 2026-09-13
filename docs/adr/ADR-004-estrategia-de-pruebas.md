# ADR-004: Pruebas E2E de los caminos principales como red de seguridad; sin compuerta de cobertura ni mutation testing

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

Dos personas desarrollan. La skill `microservicios-base` exigía 100 % de cobertura y
mutation testing. Experiencia del dueño en proyectos anteriores: no aportaban valor
proporcional y retrasaban mucho el desarrollo. La skill se actualizó en esta misma fecha.

## Opciones consideradas

### 1. 100 % de cobertura con compuerta y mutation testing
Detecta pruebas decorativas, pero el costo de alcanzar y sostener el 100 % en cada cambio
superaba el de los errores que encontraba.

### 2. Sin pruebas automáticas, probar a mano
Rápido al principio; cada cambio grande obliga a volver a probar todo a mano y algo se
saltea siempre.

### 3. E2E de los happy paths, unitarias e integración solo donde ahorran tiempo (elegida)

## Decisión

- **E2E obligatorios** para los caminos principales del negocio, corridos tras cualquier
  cambio grande y en CI antes de desplegar. Lista inicial: cargar una lista de precios,
  buscar y vender, ingresar mercadería, contar un sector, y ver el stock valorizado. Se
  amplía cuando aparece un flujo nuevo que da de comer al negocio.
- **Unitarias solo donde aceleran el desarrollo:** cálculo de precios y su explicación,
  parsers de listas, reglas con muchas ramas.
- **Integración solo sobre lo estable:** cuando una verificación manual valió la pena y se
  va a repetir, se guarda como script. Si lo que verifica cambia seguido, no se guarda.
- **Sin compuerta de cobertura ni mutation testing.** La cobertura se puede mirar como
  información, nunca como objetivo.

## Consecuencias

### Positivas
- El desarrollo avanza al ritmo de dos personas.
- Después de un cambio grande hay una respuesta en minutos a "¿se rompió algo en otro
  lado?".

### Negativas
- Un caso borde sin unitaria puede romperse sin que nadie lo note hasta que un usuario lo
  vea. Se acepta: el piloto con el empleado y la trazabilidad de los números lo mitigan.

### Lo que no cambia
La prueba de paridad de los `.env` sigue siendo obligatoria: es barata y atrapa el error
más caro.

## Cuándo revisar esta decisión

- Si en el piloto aparecen regresiones que un E2E no atrapó y una unitaria sí habría
  atrapado, agregar unitarias en esa zona, no en general.

## Referencias

Skill `microservicios-base`, `referencias/pruebas.md`.
