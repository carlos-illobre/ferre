# Poner ferre online en la máquina de Oracle, paso a paso

Para alguien que nunca usó Oracle Cloud. Una sola máquina corre los dos ambientes,
**pruebas** y **producción**, cada uno con su propia base en Supabase. El cliente web
vive en GitHub Pages. Después de esta guía, cada push a `master` actualiza pruebas y cada
push a `produccion` actualiza producción, solos (ADR-012).

La máquina: Ampere A1, 2 núcleos, 12 GB, 200 GB de disco. Es ARM: las imágenes se
construyen para ARM en CI, no hay nada que hacer al respecto.

## 1. Conectarse a la máquina

Desde tu computadora, con la clave privada que bajaste al crear la instancia:

```bash
ssh -i ~/.ssh/oracle.key ubuntu@<ip-publica>
```

**Bien:** ves un prompt `ubuntu@...`. **Mal:** "Permission denied": la clave no es la de
la instancia, o el usuario no es `ubuntu` (en Oracle Linux es `opc`). "Connection timed
out": el puerto 22 no está abierto en la Security List (paso 3).

## 2. Verificar la máquina sin tocar nada

Desde tu computadora, dentro del repo:

```bash
ssh -i ~/.ssh/oracle.key ubuntu@<ip-publica> 'bash -s' < deployment/oracle-single/preflight.sh
```

Dice qué falta y cómo resolverlo. Repetilo después de cada paso hasta que quede en verde.

## 3. Abrir los puertos en la Security List

El firewall que vale es el de la red virtual de Oracle, no el de la máquina.

1. Consola de Oracle → **Redes** → **Redes virtuales en la nube** → tu VCN → **Listas de
   seguridad** → la lista por defecto.
2. **Reglas de entrada** → **Agregar reglas de entrada**, tres veces, con origen
   `0.0.0.0/0`, protocolo TCP y puerto de destino: `22`, `80` y `443`.

**Bien:** las tres reglas aparecen en la lista. Ningún otro puerto: el compose solo
publica 80 y 443 (Caddy); el resto es interno.

Además, las imágenes de Ubuntu de Oracle traen reglas de `iptables` que descartan
tráfico entrante. En la máquina:

```bash
sudo iptables -L INPUT -n --line-numbers
```

Si hay un `REJECT` general antes de los puertos 80 y 443, agregá las reglas y
persistilas:

```bash
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 4. Instalar Docker

En la máquina:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Volvé a entrar por SSH (para que el grupo `docker` aplique) y verificá:

```bash
docker compose version
```

**Bien:** imprime una versión 2.x o superior.

## 5. El dominio

Hacen falta dos nombres que apunten a la IP pública de la máquina, con registros A:

| Nombre | Para |
|---|---|
| `api.<tu-dominio>` | API de producción |
| `api-pruebas.<tu-dominio>` | API de pruebas |

Si no tenés dominio, un dominio dinámico gratuito (DuckDNS, por ejemplo) sirve igual:
Caddy emite el certificado para cualquier nombre que resuelva a la máquina.

Comprobá la propagación antes de seguir, desde tu computadora:

```bash
dig +short api.<tu-dominio>
```

**Bien:** devuelve la IP de la máquina. Si no, esperá: Caddy reintenta solo, pero cada
intento fallido antes de que el DNS resuelva consume uno de los pocos que Let's Encrypt
permite por hora.

## 6. Las dos bases en Supabase

1. En [supabase.com](https://supabase.com/), crear **dos proyectos** en la región
   **South America (São Paulo)**: `ferre-produccion` y `ferre-pruebas`. El plan gratuito
   permite dos.
2. En cada uno: **Project Settings** → **Database** → **Connection string**, modo
   **Session**, y copiar la URL `postgres://...`. Reemplazar `[YOUR-PASSWORD]` por la
   contraseña que elegiste al crear el proyecto.

## 7. La configuración de cada ambiente en la máquina

En la máquina, dos carpetas, una por ambiente:

```bash
mkdir -p ~/ferre/produccion ~/ferre/pruebas
```

Desde tu computadora, copiá las plantillas:

```bash
scp -i ~/.ssh/oracle.key deployment/oracle-single/produccion/.env.oracle ubuntu@<ip-publica>:ferre/produccion/.env
scp -i ~/.ssh/oracle.key deployment/oracle-single/pruebas/.env.oracle ubuntu@<ip-publica>:ferre/pruebas/.env
```

Y en la máquina, editá cada uno (`nano ~/ferre/produccion/.env`) reemplazando **todos**
los marcadores `<...>`: los dos dominios, el ID de Google (`docs/google-cloud.md`), la
URL de Supabase de ese ambiente, y un token de servicio generado con:

```bash
openssl rand -hex 32
```

Un token distinto por ambiente. `IMAGEN_TAG` dejalo como está: lo escribe el despliegue.

**Bien:** el preflight ya no avisa de marcadores sin reemplazar.

## 8. Lo que GitHub necesita para desplegar solo

En el repositorio, **Settings → Secrets and variables → Actions**:

**Secrets** (pestaña Secrets → New repository secret):

| Nombre | Valor |
|---|---|
| `ORACLE_HOST` | la IP pública de la máquina |
| `ORACLE_USUARIO` | `ubuntu` |
| `ORACLE_SSH_KEY` | el contenido completo de la clave privada (`cat ~/.ssh/oracle.key`), incluidas las líneas BEGIN y END |

**Variables** (pestaña Variables → New repository variable):

| Nombre | Valor |
|---|---|
| `API_URL` | `https://api.<tu-dominio>` |
| `API_URL_PRUEBAS` | `https://api-pruebas.<tu-dominio>` |
| `GOOGLE_CLIENT_ID` | el ID de cliente de Google |

Y en **Settings → Environments**, crear `produccion` y `pruebas` (vacíos alcanza; en
`produccion` podés exigir tu aprobación antes de cada despliegue si querés).

## 9. El primer despliegue

Basta con un push a `master`: CI corre las pruebas, publica las imágenes ARM y despliega
**pruebas**. Para producción, avanzá la rama `produccion` (paso 11).

Para mirar cómo va: pestaña **Actions** del repositorio. El job `desplegar` muestra cada
paso con ✓ y, si algo falla, el comando para volver atrás.

**Bien:** desde tu computadora, `curl https://api-pruebas.<tu-dominio>/health` devuelve
`{"ok":true,...}` y el candado del navegador está en verde.

## 10. El primer usuario

Una vez por ambiente, en la máquina:

```bash
cd ~/ferre/produccion && docker compose exec gestion-del-local node dist/crear-usuario.js tu@gmail.com "Tu nombre" dueño
```

Después entrás con Google en la app y das de alta al empleado desde ahí.

- Producción: `https://carlos-illobre.github.io/ferre/`
- Pruebas: `https://carlos-illobre.github.io/ferre/pruebas/`

## 11. Pasar algo a producción

Cuando lo que está en pruebas te convence:

```bash
git push origin master:produccion
```

CI vuelve a correr sobre ese commit y despliega producción. La rama `produccion` es un
puntero a "lo que está vivo"; no se trabaja sobre ella.

## 12. Volver atrás

Producción se vuelve al commit anterior con el mismo script y el SHA que el job
`desplegar` mostró como "corriendo ahora":

```bash
cp deployment/oracle-single/.env.despliegue.ejemplo deployment/oracle-single/.env   # una vez; completar SSH
bash deployment/oracle-single/deploy.sh produccion <sha-anterior>
```

Lo que la reversión **no** revierte: los datos. Si una versión migró el esquema, volver
la imagen no vuelve la base; para eso está el respaldo (ADR-002).

## 13. Operación de todos los días

```bash
# qué está corriendo y con qué versión (IMAGEN_TAG es el SHA)
ssh ubuntu@<ip> 'cd ferre/produccion && docker compose ps && grep IMAGEN_TAG .env'

# logs de un servicio
ssh ubuntu@<ip> 'cd ferre/produccion && docker compose logs -f --tail 100 gestion-del-local'

# cuánto consume cada contenedor
ssh ubuntu@<ip> 'docker stats --no-stream'

# disco
ssh ubuntu@<ip> 'df -h / && docker system df'

# reiniciar un servicio
ssh ubuntu@<ip> 'cd ferre/produccion && docker compose restart gestion-del-local'

# apagar pruebas cuando no se use (producción sigue)
ssh ubuntu@<ip> 'cd ferre/pruebas && docker compose down'
```

## Qué se pierde si se pierde cada volumen

| Volumen (por ambiente) | Qué guarda | Si se pierde |
|---|---|---|
| `caddy-data` | certificados y estado de Let's Encrypt | Caddy vuelve a emitir; solo duele si se agota el cupo de intentos |
| `listas-data` | los Excel originales de cada lista cargada | No se pueden reprocesar listas viejas; los precios ya aplicados están en la base |

La base de datos no está en la máquina: está en Supabase, con el respaldo del ADR-002.

## Los límites del plan gratuito que importan

- Oracle puede apagar una instancia que considere ociosa. El monitor externo (issue #19)
  la mantiene con actividad y avisa si deja de responder.
- La transferencia de salida tiene tope mensual; con esta app no se acerca.
- No hay garantía de servicio: si la máquina cae, el mostrador sigue vendiendo desde la
  PWA y el dueño pierde visibilidad hasta levantarla en otra (ADR-002).
