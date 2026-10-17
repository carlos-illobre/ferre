# Pruebas manuales

Lo que Carlos prueba a mano, con equipos de verdad, en el ambiente de pruebas: sobre todo lo que
las pruebas automáticas no pueden cubrir (el botón de Google, la huella, un celular y una
computadora reales). Cada caso dice de qué escenario de la especificación sale, para que no se
aparten de la regla: si la regla cambia, se cambia primero la `spec.md` y después el caso.

Cuando se ejecuta una, se anota en `proyecto/estado.yml`, en el requerimiento que prueba, qué se
probó, cuándo y con qué equipos; lo que falle se anota como defecto.

| Qué | Escenarios |
|---|---|
| [Entrar a la aplicación](entrar.md): con Google, con la huella y con el código de la computadora | `specs/007-usuarios-y-acceso/`, historias 1, 2, 4, 4b, 4c y 5 |
