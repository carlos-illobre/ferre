# Pantallas: Usuarios y acceso

Las dos interfaces (ADR-014) usan la misma API. La de celular vive en
`clientes/gestion-del-local-web/src/` (`App.tsx`, `pantallas/`, `componentes/`) y la de
computadora en `clientes/gestion-del-local-web/src/escritorio/`. Se elige por el ancho de
la pantalla al abrir (900 px, `src/vista.ts`). La sesión, el token y las llamadas de huella
son comunes: `src/sesion.tsx`, `src/api.ts`, `src/credenciales.ts`.

## Celular

| Pantalla | Archivo | Qué muestra |
|---|---|---|
| Entrar | `pantallas/Login.tsx` | Logo «fe», «El cuaderno, sin cuaderno.» y el lema. Abajo: «Entrar con la huella» (solo si el dispositivo tiene huella), «Entrá con tu cuenta de Google.» y el botón de Google. Los errores de cada botón salen debajo del suyo |
| Oferta de huella | `componentes/OfrecerHuella.tsx` | Hoja que sube desde abajo la primera vez que se entra con Google en un celular con huella: «¿Entrar con la huella?», «Sí, usar la huella» y «Ahora no»; al vincular dice «Listo» y «Entendido». Tocar afuera vale como «Ahora no». Una sola vez por dispositivo |
| Negocio | `pantallas/Negocio.tsx` | Tarjeta con el nombre, el rol, el estado de conexión y «Salir». Para todos: ventas de hoy, gastos de la semana (de otras capacidades) y «Mis celulares con huella» (lista con «Quitar» y «Vincular este celular con mi huella»). Solo para quien administra: «Quién puede entrar» (lista con selector de rol, «Desactivar» o «Reactivar», y «+ Autorizar otro correo de Google», que abre una hoja con nombre, correo y rol), «Sesiones abiertas» (cada una con «Cerrar»; la propia dice «esta sesión» y su botón es coral) y «Quién hizo qué» (de a 10, con «← Anteriores», «Página N de M · T acciones» y «Siguientes →») |
| Vincular celular como lector | `pantallas/VincularCelular.tsx` | Se abre al leer el QR de la computadora (RF-08, capacidad de catálogo). Sin sesión pide entrar con Google ahí mismo, sin botón de huella; con sesión avisa que el celular quedó vinculado 12 horas y ofrece «Ir a vender» |

La ruta vieja `#/administracion` abre Negocio.

## Computadora

| Pantalla | Archivo | Qué muestra |
|---|---|---|
| Entrar | `escritorio/pantallas/Login.tsx` | La marca «ferre», «Entrar con la huella» con su aclaración (solo si el dispositivo tiene huella), «Entrá con tu cuenta de Google.» y el botón de Google |
| Barra de arriba | `escritorio/App.tsx` | Nombre y rol del usuario («Dueño E2E · dueño») y «Salir». Las entradas «Duplicados» y «Administración» solo aparecen para quien administra |
| Administración | `escritorio/pantallas/Administracion.tsx` | Solo para quien administra. Cuatro bloques con tablas: «Usuarios autorizados» (nombre, correo, selector de rol, estado, «Desactivar» o «Reactivar», y debajo el alta en una línea: nombre, correo, rol, «Autorizar»), «Mis celulares con huella» (celular, vinculado el, último uso, «Quitar», y «Vincular este celular con mi huella»), «Sesiones abiertas» (quién, dispositivo, último uso, «Cerrar»: rojo el de la propia, azul los demás) y «Quién hizo qué» (cuándo, quién, qué, detalle; de a 10 con el mismo paginado) |
| Vincular celular como lector | `escritorio/pantallas/VincularCelular.tsx` | La misma página que en el celular, con los estilos de la computadora |

El QR que la computadora muestra para vincular el celular como lector está en
`componentes/VincularCelular.tsx`, dentro de Vender (RF-08, capacidad de catálogo).

## Diferencias entre las dos

- La oferta de huella solo existe en el celular; en la computadora se vincula a mano.
- En el celular todo usuario ve «Mis celulares con huella»; en la computadora está dentro
  de Administración, que un usuario «mostrador» no ve.
- En el celular, autorizar a alguien es una hoja; en la computadora, un formulario en línea.
- Quitar un celular vinculado pide confirmación y vincularlo a mano pide el nombre, las dos
  con ventanas del navegador (`confirm` y `prompt`).
- En las dos, un Administrador con rol «admin» ve la fila de un dueño con el selector
  deshabilitado y el texto «solo el dueño».

## Mockup

`mockups/Entrar.png` es la pantalla de entrada de la computadora de antes del 2026-10-09:
«Entrá con tu cuenta de Google», el botón y, debajo, «O entrá con el celular» con un código
QR. **Quedó vieja:** entrar leyendo un QR se quitó (decisión 10 del dueño) y lo construido
no tiene ese bloque; en su lugar está «Entrar con la huella». No hay mockup de Negocio ni
de Administración.
