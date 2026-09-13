# ferre

Sistema de gestión para una ferretería de barrio: un local, un empleado, ~50 proveedores
que mandan listas de precios en Excel, ventas que hoy se anotan en un cuaderno.

Objetivos, en orden:

1. Reemplazar el cuaderno de ventas sin retrasar al empleado.
2. Mantener los precios actualizados sin cargarlos a mano.
3. Saber cuánto stock hay y cuánto vale.
4. Que el dueño administre el negocio a distancia.

## Cómo se organiza el trabajo

- El backlog vive en [GitHub Issues](https://github.com/carlos-illobre/ferre/issues),
  agrupado por etapa en [milestones](https://github.com/carlos-illobre/ferre/milestones).
- Las decisiones técnicas se registran en `docs/adr/`.
- La carpeta `privado/` contiene listas de precios reales y otros datos de terceros.
  Está ignorada por git y **no debe subirse nunca**.
