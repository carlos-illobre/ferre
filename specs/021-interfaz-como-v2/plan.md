# Plan: la aplicación como la v2

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-24) · **Maquetas**: la v2 (variante 1) de cada
pantalla, en las maquetas del director de arte · **Decisiones**: 148 y 149. No lleva ADR: no cambia
la arquitectura (ADR-015 y ADR-018 siguen); cambia el aspecto y dónde está cada pantalla en el menú.

## Summary

- **Cada pantalla** se rehace en su archivo de cada interfaz (celular y computadora por separado,
  decisión 46), con su propia hoja de estilos; las reglas siguen en `negocio/` y los textos en
  `textos` (largo y corto). Lo que la v2 muestra y el sistema no sabe queda con «—» (E02), sin datos
  inventados ni cambios en el servidor.
- **Los íconos de la v2** (Lucide, trazo de 2 px, del color del texto) se suman a las piezas de cada
  interfaz; los que se agregaron en paralelo en tres archivos se unifican en T010.
- **El marco** (decisión 149): el menú Vender · Catálogo · Depósito · Negocio · Más en las dos
  interfaces. Negocio agrupa Resumen, Usuarios y Quién hizo qué, y sus direcciones siguen siendo las
  de antes (en el celular, `mas/…`), para que los enlaces, el espejo y las pruebas no cambien de
  dirección. Depósito pasa a Stock · Compras · Contar: Compras es la dirección del escritorio de
  compras y el Ingreso pasa a `ingreso` en la computadora (en el celular ya era `deposito/ingreso`);
  el Ingreso y los Pedidos se ven con «Compras» marcada. En la computadora, el título de la parte va
  arriba de las pestañas; las pantallas que calculan su alto restan `--cabeza-extra`.
- **Las pruebas** (Carlos, decisión 148): las sesiones que programan no las escriben ni las corren;
  mientras dura el rediseño, las de pantallas no corren en el CI (`PANTALLAS_EN_PAUSA`). En T010 se
  arreglan todas juntas, unitarias y de punta a punta, y se saca la pausa.

## Seguridad

Nada cambia en lo que cada persona puede hacer: cada pantalla y cada pestaña siguen pidiendo los
mismos permisos (RF-72), y el servidor los sigue controlando en cada pedido. Compras se ve con
cualquiera de los permisos de compras, pedidos o ingresos; quien no ve las compras recientes entra
directo al Ingreso si puede registrar ingresos, y si no, a los Pedidos (revisión, decisión 153). Usuarios se ve con «Administrar usuarios» o «Administrar roles»; con solo el
segundo, muestra los roles. No se agregan datos nuevos a la vista ni se guardan en el dispositivo.
