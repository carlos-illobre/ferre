# Feature Specification: Lo que hizo sin conexión alguien a quien desactivaron, apartado para revisar

**Feature Branch**: `014-cambios-apartados`

**Created**: 2026-10-17

**Status**: Aprobada por Carlos (2026-10-17)

**Maquetas**: Aprobadas (2026-10-17): variante C, `maquetas/para-revisar-c-*.png`, con el submenú de pestañas de las otras pantallas, primero «Para revisar» y después «Anotadas», y la cantidad a la derecha del nombre (pedidos de Carlos al ver la A, la B y la primera C: `maquetas/para-revisar-a-*.png`, `maquetas/para-revisar-b-*.png`)

**Input**: Decisión 97: lo que una persona hizo sin conexión antes de que la desactivaran y
todavía no llegó al servidor no se registra solo ni se pierde, queda apartado para que alguien
decida si lo acepta. Después: «hacé la pantalla».

## Clarifications

### Session 2026-10-17

- Q: ¿Qué se hace con una venta cobrada sin conexión por alguien a quien se desactivó antes de que el dispositivo reconecte? → A: Ni se registra sola ni se rechaza: queda apartada para que un Administrador decida si la acepta (decisión 97; respondió P8 de 007).
- Q: ¿Dónde se revisa? → A: Dentro de Anomalías, en Más: es otro caso en que el sistema y la realidad no coinciden.
- Q: ¿Se revisa en el dispositivo donde quedó o en el servidor? → A: En el servidor. El dispositivo lo sube solo aunque su sesión ya no valga, y queda apartado sin aplicarse; se revisa desde cualquier dispositivo. Sirve aunque el dispositivo sea el celular propio de quien se fue y no vuelva al local.
- Q: Al aceptar, ¿a nombre de quién queda? → A: De quien lo hizo, con la fecha y la hora en que lo hizo. El registro dice además quién lo aceptó y cuándo.
- Q: ¿Quién lo revisa? → A: Quien tiene «Administrar usuarios», el mismo permiso que desactiva a las personas.
- Q: ¿Cómo se ve dentro de Anomalías? → A: Con el submenú de pestañas de las otras pantallas: primero «Para revisar», con la cantidad pendiente a la derecha del nombre, y después «Anotadas», las anomalías de siempre.

## User Scenarios & Testing

### User Story 1 - Lo que quedó sin mandar llega al servidor, apartado (Priority: P1)

Ana cobra dos ventas en el celular del local sin conexión. Mientras tanto, Carlos la desactiva.
Cuando el celular recupera la conexión, el servidor ya no acepta la sesión de Ana: el celular
vuelve a la entrada (007, decisión 97) y, en vez de quedarse con las dos ventas guardadas, se las
manda al servidor, que las aparta sin registrarlas.

**Why this priority**: Sin esto lo apartado nunca sale del dispositivo y nadie lo puede revisar.

**Independent Test**: Con un dispositivo que tiene dos ventas sin mandar de una persona
desactivada, recuperar la conexión y ver que el dispositivo ya no las tiene y que el servidor
las tiene apartadas, sin que cambien las ventas del día ni el stock.

**Acceptance Scenarios** (los completa el paso 4):

- **E01** **Given** un dispositivo con cambios sin mandar de una persona a la que desactivaron, **When** recupera la conexión, **Then** los manda al servidor, que los guarda apartados; el dispositivo ya no los tiene y vuelve a la entrada.
- **E02** **Given** cambios apartados, **When** se miran las ventas del día, el stock o los precios, **Then** no figuran: apartados no cuentan para nada hasta que se aceptan.
- **E03** **Given** un dispositivo con cambios sin mandar de una persona cuya sesión se cerró a distancia pero sigue activa, **When** recupera la conexión, **Then** no se apartan: quedan en el dispositivo y salen solos cuando esa persona vuelve a entrar ahí (007, decisión 97).
- **E04** **Given** alguien que no tiene una sesión de esa persona desactivada (otro dispositivo, una sesión inventada o de otra persona), **When** intenta mandar cambios para apartar, **Then** el servidor los rechaza.

### User Story 2 - Revisar y decidir en Anomalías (Priority: P1)

Carlos abre Más → Anomalías y ve «Para revisar»: las dos ventas de Ana, cada una con lo que
tiene (productos, cantidades, importe, medio de pago), cuándo la hizo y en qué dispositivo.
Acepta una: queda registrada como venta de Ana, con la hora en que la cobró, y baja el stock. La
otra la descarta. Las dos dejan de figurar en «Para revisar» y quedan en el registro.

**Why this priority**: Es la decisión que pidió Carlos: que nada se registre ni se pierda solo.

**Independent Test**: Con dos ventas apartadas, aceptar una y descartar la otra; ver la aceptada
en las ventas del día de su fecha, a nombre de quien la hizo; ver que la descartada no figura en
ningún lado salvo en el registro.

**Acceptance Scenarios** (los completa el paso 4):

- **E05** **Given** alguien con «Administrar usuarios», **When** abre Anomalías, **Then** ve «Para revisar» con cada cambio apartado: qué es (una venta, un ajuste de stock, un cambio de margen…), de quién, cuándo lo hizo y en qué dispositivo, de lo más viejo a lo más nuevo.
- **E06** **Given** una venta apartada, **When** la acepta, **Then** queda registrada a nombre de quien la hizo, con la fecha y la hora en que la hizo, baja el stock como cualquier venta, y el registro de quién hizo qué dice quién la aceptó y cuándo.
- **E07** **Given** un cambio apartado, **When** lo descarta, **Then** no se registra, deja de figurar en «Para revisar» y el registro dice quién lo descartó y cuándo.
- **E08** **Given** un cambio apartado que hoy ya no se puede aplicar (un producto que se unió con otro o se dio de baja), **When** lo acepta, **Then** no se registra, la pantalla dice por qué y el cambio sigue apartado para descartarlo.
- **E09** **Given** varios cambios apartados de la misma persona, **When** se revisan, **Then** se aceptan o descartan de a uno; aceptar uno no acepta los demás.
- **E10** **Given** nada para revisar, **When** se abre Anomalías, **Then** «Para revisar» dice que no hay nada y no ocupa lugar.

### User Story 3 - Quién lo ve (Priority: P1)

**Acceptance Scenarios** (los completa el paso 4):

- **E11** **Given** alguien con «Administrar usuarios» y sin el permiso de ver las anomalías, **When** abre Más, **Then** ve Anomalías, y adentro solo «Para revisar».
- **E12** **Given** alguien con el permiso de ver las anomalías y sin «Administrar usuarios», **When** abre Anomalías, **Then** ve las anomalías de siempre y no «Para revisar».
- **E13** **Given** alguien sin «Administrar usuarios», **When** le pide al servidor lo apartado, o aceptarlo o descartarlo, **Then** el servidor lo niega.

### User Story 4 - Que no se pueda abusar (Priority: P1)

**Acceptance Scenarios** (paso 4, QA):

- **E14** **Given** la sesión cerrada de una persona desactivada, **When** con ella se intenta cualquier otra cosa que subir lo apartado, **Then** el servidor contesta «Hay que iniciar sesión», como hasta ahora.
- **E15** **Given** un cambio para apartar que no es de un tipo que el dispositivo manda (o apunta a otra ruta que la de su tipo, por ejemplo la administración de usuarios), **When** se sube, **Then** el servidor rechaza el pedido entero y no aparta nada.
- **E16** **Given** más de 200 cambios en un solo pedido, **When** se suben, **Then** el servidor lo rechaza; el dispositivo los manda de a 200.
- **E17** **Given** el mismo cambio subido dos veces, **When** llega la segunda, **Then** no se guarda de nuevo y el servidor contesta igual que la primera.
- **E18** **Given** un cambio ya aceptado o descartado, **When** alguien intenta aceptarlo o descartarlo de nuevo (dos personas a la vez, o una pantalla vieja), **Then** no se aplica dos veces y la pantalla dice que ya se decidió.
- **E19** **Given** un cambio aceptado, **When** quien lo hizo ya no tiene el permiso para hacerlo (le cambiaron los roles), **Then** no se registra y la pantalla dice qué permiso le falta: lo aceptado tiene los mismos límites que si hubiera llegado a tiempo.

### Edge Cases

- **Reactivan a la persona antes de revisar.** Lo apartado sigue apartado: se acepta o se descarta igual. Lo que todavía no llegó al servidor sale con su sesión cuando vuelve a entrar.
- **Dos personas revisan a la vez.** Un cambio se acepta o se descarta una sola vez: el segundo ve que ya se decidió.
- **El mismo cambio llega dos veces** (el dispositivo lo mandó y se cortó la conexión antes de enterarse). Queda apartado una sola vez.
- **La hora del dispositivo está mal.** Se muestra la hora que dice el dispositivo y cuándo llegó al servidor, para que se note.
- **Cambios que se funden.** Si la persona cambió el margen de un producto dos veces, llega uno solo, con el último valor, como en la cola de siempre.
- **Sin conexión, quien revisa** no puede aceptar ni descartar: la pantalla lo dice.
- **La fecha de lo aceptado.** Una venta queda con la fecha y la hora en que se cobró, porque la venta la trae. Un ajuste de stock, un cambio de margen o un renglón de conteo quedan con la fecha en que se aceptan, porque esa fecha la pone el servidor al recibirlos; la pantalla de revisión y el registro guardan cuándo se hicieron (aclarado al planificar, 2026-10-17).

## Requirements

### Functional Requirements

- **RF-102**: Lo que una persona hizo sin conexión y no llegó al servidor antes de que la desactivaran se manda al servidor apenas el dispositivo reconecta, aunque la sesión ya no valga, y queda apartado sin aplicarse.
- **RF-103**: Lo apartado se revisa en Más → Anomalías, en «Para revisar», con lo que es, de quién, cuándo y en qué dispositivo. Cada cambio se acepta o se descarta de a uno.
- **RF-104**: Un cambio aceptado se registra a nombre de quien lo hizo, con la fecha y la hora en que lo hizo, como si hubiera llegado en ese momento; uno descartado no se registra. El registro de quién hizo qué dice quién aceptó o descartó cada uno y cuándo.
- **RF-105**: Lo apartado lo ve, lo acepta y lo descarta solo quien tiene «Administrar usuarios». Con ese permiso, Anomalías aparece en Más aunque no se tenga el de ver las anomalías.

## Success Criteria

- **SC-01**: Ninguna venta cobrada sin conexión por alguien a quien se desactivó se pierde ni se registra sin que alguien la acepte.
- **SC-02**: Lo apartado no cambia ningún número del negocio hasta que se acepta.
