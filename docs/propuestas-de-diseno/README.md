# Propuestas de diseño

Maquetas del director de arte (2026-10-19): cómo podría verse cada pantalla de la aplicación,
en computadora y en celular, si se diseñara sin los límites de hoy. **No son decisiones ni
reglas**: lo decidido sigue en el `ux.md` y la `spec.md` de cada capacidad. Cuando Carlos
toma una idea, pasa por el flujo de siempre (maqueta crítica, aprobación, plan) y se anota en
su capacidad.

**Dónde están:** en `microservices/web/public/maquetas/`, para poder navegarlas en el ambiente de
pruebas (decisión 113): `/v2` muestra la variante 1 de cada pantalla (la evolución), `/v3` la 2 (la
reinvención) y `/v4` la 3 (la audaz). Las que todavía no tienen botones se ven quietas («solo
mirar»). Las navegables están en `maquetas/navegables.json`.

- `_comun/`: el lenguaje visual común a todas (paleta, tipografía, íconos, piezas y el marco
  de la aplicación), con su muestra.
- Una carpeta por pantalla, con `compu/` y `celu/`. Cada variante se abre sola
  (`index.html`) y tiene su `captura.png`; `comparacion-compu.png` y `comparacion-celu.png`
  las ponen lado a lado, y `resumen.md` explica cada variante y numera sus ideas.

**Lo que Carlos rechaza se borra** de esta carpeta; lo que queda está todavía en revisión.
Se hicieron con la skill `/director-de-arte` (`.claude/skills/director-de-arte/`), que corre solo cuando Carlos la pide.

## Las pantallas

| Parte | Pantalla | Carpeta |
|---|---|---|
| — | Entrar | [entrar](../../microservices/web/public/maquetas/entrar/resumen.md) |
| Vender | Vender | [vender](../../microservices/web/public/maquetas/vender/resumen.md) |
| Vender | Ventas de hoy | [ventas-de-hoy](../../microservices/web/public/maquetas/ventas-de-hoy/resumen.md) |
| Catálogo | Productos y su ficha | [productos](../../microservices/web/public/maquetas/productos/resumen.md) |
| Catálogo | Listas de precios | [listas](../../microservices/web/public/maquetas/listas/resumen.md) |
| Catálogo | Duplicados | [duplicados](../../microservices/web/public/maquetas/duplicados/resumen.md) |
| Depósito | Stock | [stock](../../microservices/web/public/maquetas/stock/resumen.md) |
| Depósito | Compras | [compras](../../microservices/web/public/maquetas/compras/resumen.md) |
| Depósito | Contar | [contar](../../microservices/web/public/maquetas/contar/resumen.md) |
| Negocio | Resumen | [resumen](../../microservices/web/public/maquetas/resumen/resumen.md) |
| Negocio | Usuarios | [usuarios](../../microservices/web/public/maquetas/usuarios/resumen.md) |
| Negocio | Quién hizo qué | [actividad](../../microservices/web/public/maquetas/actividad/resumen.md) |
| Más | Anomalías | [anomalias](../../microservices/web/public/maquetas/anomalias/resumen.md) |
| Más | Procesos | [procesos](../../microservices/web/public/maquetas/procesos/resumen.md) |
| Más | Mejoras y errores | [mejoras-y-errores](../../microservices/web/public/maquetas/mejoras-y-errores/resumen.md) |
| Más | Configuración | [configuracion](../../microservices/web/public/maquetas/configuracion/resumen.md) |

El manual de uso quedó afuera a propósito.
