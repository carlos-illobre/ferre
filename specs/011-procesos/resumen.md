# Resumen: Procesos (011)

Lo primero que se lee de esta capacidad. Ante una diferencia, manda la `spec.md`; los
detalles de pantalla están en `ux.md` y la maqueta aprobada en `maquetas/elegida.html`.

## Qué es

Una pantalla en Más para dibujar con BPMN cómo se hace cada cosa en el negocio (la venta en
el mostrador, la compra, la recepción de mercadería), arrastrando y soltando. Por ahora solo
se dibuja; conectarla con lo que pasa en Ferrebress viene después. Va aparte del resto para
poder llevarla a otros proyectos (ADR-019).

## Requerimientos

- **RF-90:** «Procesos» en Más: crear, cambiar el nombre, buscar, abrir y borrar procesos.
- **RF-91:** Dibujar con BPMN arrastrando y soltando. Cada paso guarda nombre, tipo, quién lo hace, la pantalla de Ferrebress donde se hace, cómo se hace y con qué sigue. En la computadora, también como tabla.
- **RF-92:** En el celular, «Diagrama» (primero) y «Pasos», una lista que se ordena arrastrando.
- **RF-93:** Un vigente y un borrador por proceso; al marcar vigente, la versión anterior va al historial.
- **RF-94:** Exportar en PNG o en BPMN 2.0; importar BPMN 2.0 de otro programa.
- **RF-95:** «Ver procesos» y «Dibujar procesos» (que incluye ver). Sin ninguno, no aparece en Más.
- **RNF-61:** Se lleva a otro proyecto sin el resto de Ferrebress. La aplicación que lo usa le da la sesión, los permisos, la lista de pantallas y la paleta. Usa la misma base, con sus propias tablas sin unir a las de Ferrebress. Guarda en BPMN 2.0.

## Las reglas que más pesan

- **Guardado:** se guarda solo mientras se dibuja, sin botón «Guardar». Lo que se cambia es siempre el borrador.
- **Dos personas en el mismo borrador:** la segunda ve el de la otra, con aviso (E41).
- **Sin conexión:**
  - Se mira lo ya abierto en ese dispositivo, y no se dibuja (E42).
  - Si se corta mientras se dibuja, el último cambio sigue a la vista y sale cuando vuelve la conexión.
- **Borrar** es lo único que pregunta antes, porque no se recupera.
- **Al entrar** se abre el último proceso abierto en ese dispositivo. Si nunca se abrió uno, el primero de la lista, que es el último que alguien cambió (E01).
- **Al importar:** el proceso queda en borrador. Lo que el archivo trae y acá no se ve se avisa, y sale igual al exportarlo (E35).
- **«Quién hizo qué» anota:**
  - crear, cambiar el nombre, marcar vigente, descartar el borrador, importar y borrar, con el nombre del proceso;
  - el borrador, el primer cambio de cada persona y, si sigue, uno cada media hora.
- **Con solo «Ver procesos»** se ve el vigente, sin figuras, sin importar ni exportar, sin borradores.
- **Textos:** en el celular, mínimos; en la computadora, los que explican.
- **Palabras del negocio:** «paso», «carril», «decisión», «vigente», «borrador». Los nombres de BPMN en inglés no aparecen.

## Pantalla (decisiones de Carlos del 2026-10-14)

- **Computadora:** las figuras a la izquierda, el dibujo y el paso elegido a la derecha, con la tabla de pasos abajo.
  - Los tres paneles se pliegan y arrancan plegados.
  - Elegir un paso abre su panel.
- **Celular:** «Diagrama» primero y abierto, con la hoja «Agregar un paso».
  - Las doce figuras van del mismo tamaño, con nombres cortos.
  - La hoja se pliega.
  - Tocar un paso de «Pasos» abre una hoja con sus datos, en renglones. Tiene una cruz para cerrarla y «Agregar un paso después» con el color principal.
  - El botón de volver cierra lo que esté encima. Desde un proceso, vuelve a la lista.
- **El paso elegido** se marca con el naranja de la aplicación.
- **El logo de bpmn.io** queda a la vista, como pide su licencia, sin foco ni atajo.
  - En el celular flota abajo a la derecha del dibujo, sobre la hoja.
  - Los botoncitos del paso elegido quedan por debajo de los controles.
- **Los permisos:** los dos arrancan en el rol Gerente.

## Fuera de esta etapa

- Conectar los pasos con lo que pasa en Ferrebress.
- Más datos por paso.
- Ejecutar procesos.
- Comentarios.

## Preguntas abiertas que frenan

Ninguna.
