# ADR-019: Procesos es un módulo aparte que se puede llevar a otro proyecto

**Estado:** Aceptado
**Fecha:** 2026-10-14
**Enmienda a:** [ADR-018](ADR-018-servicios-y-capas.md) (librerías compartidas)

---

## Contexto

Carlos pidió una pantalla «Procesos» para dibujar con BPMN los procesos del negocio
(decisión 87, `specs/011-procesos/`), y la quiere llevar después a otros proyectos. Si no
hubiera una sola base de datos, la pediría como un servicio aparte; como hay una sola, usa la
de Ferrebress. Las cuatro decisiones que siguen se las preguntó el agente y las eligió Carlos
el 2026-10-14.

## Decisión

Todo lo de Procesos vive en `microservices/procesos/`, en dos paquetes que no importan nada
de Ferrebress:

| Paquete | Qué es | Depende de |
|---|---|---|
| `procesos/servidor` (`procesos-servidor`) | Un servicio propio, en su contenedor (`procesos`), con su regla, sus datos y sus migraciones | Hono, `pg`, `bpmn-moddle` |
| `procesos/web` (`procesos-web`) | Las pantallas de computadora y celular, como componente de React que la aplicación pone donde quiere | React (lo pone la aplicación), `bpmn-js` |

1. **Servicio propio, no módulo del servidor de Ferrebress.** Elegido por Carlos. Llevarlo es
   copiar la carpeta y agregar el contenedor. Cuesta un contenedor más en la máquina.
2. **Quién llama lo dice la aplicación que lo usa.** El servicio no conoce sesiones, usuarios
   ni Google. El navegador nunca le habla directo: le habla al servidor de la aplicación
   (`/procesos/…`), que verifica la sesión y los permisos y le pasa el pedido por la red
   interna, con el token entre servicios y tres cabeceras: el identificador de quien llama, su
   nombre y lo que puede (`ver`, `dibujar`). Sin el token, el servicio no atiende. Así no hace
   falta otra dirección pública ni tocar el proxy de la máquina, y otro proyecto lo conecta
   igual, con su propia sesión. El servidor de Ferrebress además anota en «Quién hizo qué»
   cada cambio que pasa bien.
3. **Esquema propio en la misma base.** Sus tablas van en el esquema `procesos` de la base de
   Ferrebress, con su propia tabla de migraciones (`procesos.migracion`) y sin referencias a
   tablas de Ferrebress. Para llevarlo a otra base se copia el esquema entero.
4. **Se dibuja con `bpmn-js`** (bpmn.io, de Camunda). Hace arrastrar y soltar, deshacer,
   acercar y alejar, e importa y exporta BPMN 2.0, que es como se guarda cada versión. Su
   licencia exige dejar visible el logo chico «bpmn.io» en el dibujo: se deja. Pesa cerca de
   1 MB y se baja solo al entrar a Procesos.
5. **Las pantallas son un paquete de React,** no una mini-aplicación en un marco. La aplicación
   le da cómo pedir al servidor, qué puede quien la usa, en qué interfaz está (celular o
   computadora), la lista de pantallas propias que se pueden nombrar en un paso y, con
   variables de CSS, la paleta. Por eso se ve como el resto y respeta su teclado y su
   navegación. El otro proyecto tiene que usar React.

Los permisos se llaman `procesos.ver` y `procesos.dibujar` en Ferrebress, que los muestra con
los demás (ADR-017). Dentro del módulo son solo `ver` y `dibujar`: no sabe cómo los llama
cada aplicación.

## Alternativas descartadas

- **Un módulo que se monta dentro del servidor de Ferrebress:** menos piezas, pero el otro
  proyecto tendría que tener un servidor Node con Hono.
- **React Flow con figuras propias, o un dibujo hecho a mano:** sin logo, pero con mucho más
  código propio y menos fiel al estándar al importar archivos de otros programas.
- **Tablas con prefijo en el esquema de Ferrebress:** más simple, pero la separación depende de
  respetar el prefijo.
- **Una mini-aplicación en un marco (iframe):** independiente de la tecnología del otro
  proyecto, pero el teclado, el «volver» y la paleta se coordinan a mano.

## Consecuencias

- Es la excepción a «no hay librerías compartidas entre servicios» del ADR-018: la aplicación
  web importa `procesos-web` del workspace. No es una librería de Ferrebress que usen varios
  servicios, sino las pantallas de otro servicio.
- `pnpm capas` controla, en los dos paquetes, que no importen nada de fuera de
  `microservices/procesos/`.
- La CI construye y publica una imagen más (`procesos`) y el compose suma el servicio. No hay
  variables nuevas en el `.env`: usa la misma base y el mismo token entre servicios.
- Cómo llevarlo a otro proyecto está en `microservices/procesos/README.md`.

## Enmienda (2026-10-24): Procesos tiene su propia base

Procesos deja de usar la base de Ferrebress: tiene su base `procesos` en la misma instancia, con
su usuario (ADR-026). Sus tablas siguen en el esquema `procesos` dentro de ella, y sus migraciones
las aplica el migrador de Kysely (ADR-025). Para llevarlo a otro proyecto se copia su base entera.
