import { useEffect, useState, type FormEvent } from "react";
import { cambiarAlmacen, nuevoId, useAlmacen } from "../almacen";
import { YO, type Sesion, type Tono, type Usuario } from "../datos";
import { useConexion } from "../estructura/conexion";
import {
  Aviso, avisar, Boton, Campo, Cargando, clases, ErrorDeCarga, Figura, Hoja, Iniciales, Pagina, Pastilla, TituloDeSeccion, useEstadoDeMaqueta,
  type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro, ir, useEsCelular } from "../ruta";
import "../estilos/usuarios.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "cargando", nombre: "Cargando" },
  { clave: "error", nombre: "No se pudo cargar" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
];

// ---------------------------------------------------------------- Datos propios de la pantalla

type Celular = { id: string; nombre: string; detalle: string; este: boolean };

/** Los celulares con huella de quien mira. Viven acá (no en el almacén común) y duran mientras se recorre la maqueta. */
let celularesGuardados: Celular[] = [
  { id: "cel-1", nombre: "Motorola del depósito", detalle: "Se usó hace 2 meses", este: false },
];

const TONOS: Tono[] = ["amarillo", "azul", "violeta", "verde", "naranja"];
const CORREO_BIEN_ESCRITO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cambiarActivo(usuario: Usuario, activo: boolean) {
  cambiarAlmacen((a) => ({
    ...a,
    usuarios: a.usuarios.map((u) => (u.id === usuario.id ? { ...u, activo } : u)),
    // Al desactivar a alguien se le cierran las sesiones abiertas.
    sesiones: activo ? a.sesiones : a.sesiones.filter((s) => s.usuarioId !== usuario.id),
  }));
  if (activo) avisar(`${usuario.nombre} puede entrar de nuevo`);
  else avisar(`${usuario.nombre} ya no puede entrar`, { detalle: "Se le cerraron las sesiones abiertas." });
}

// ---------------------------------------------------------------- Pantalla

export default function Usuarios() {
  const estado = useEstadoDeMaqueta();
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const usuarios = useAlmacen((a) => a.usuarios);
  const sesiones = useAlmacen((a) => a.sesiones);

  const [hoja, setHoja] = useState<"autorizar" | "vincular" | null>(null);
  const [celulares, setCelulares] = useState(celularesGuardados);
  useEffect(() => { celularesGuardados = celulares; }, [celulares]);

  if (estado === "cargando" || estado === "error") {
    return (
      <Pagina titulo="Usuarios y sesiones" estados={ESTADOS}>
        {estado === "cargando"
          ? <Cargando texto="Trayendo los usuarios y las sesiones…" />
          : <ErrorDeCarga titulo="No se pudieron traer los usuarios" alReintentar={() => cambiarParametro("estado", null)}>Revisá la conexión y probá de nuevo.</ErrorDeCarga>}
      </Pagina>
    );
  }

  // La sesión propia es la del dispositivo desde el que se mira: en el celular, la del celular.
  const propia = sesiones.find((s) => s.usuarioId === YO.usuarioId && s.tipo === (esCelular ? "celular" : "computadora"));
  const ordenadas = [...sesiones].sort((a, b) => Number(b.id === propia?.id) - Number(a.id === propia?.id));
  const esteVinculado = celulares.some((c) => c.este);

  function cerrarSesion(s: Sesion) {
    if (s.id === propia?.id) { ir("entrar"); return; }
    cambiarAlmacen((a) => ({ ...a, sesiones: a.sesiones.filter((x) => x.id !== s.id) }));
    avisar("Sesión cerrada", { detalle: `${nombreDe(s.usuarioId, usuarios)} tiene que volver a entrar en «${comoSeLlama(s, false, esCelular)}».` });
  }

  function quitarCelular(c: Celular) {
    setCelulares((antes) => antes.filter((x) => x.id !== c.id));
    avisar(`«${c.nombre}» ya no entra con la huella`);
  }

  return (
    <Pagina titulo="Usuarios y sesiones" estados={ESTADOS}>
      {!enLinea && (
        <div className="usuarios__aviso">
          <Aviso tipo="alerta" titulo="Para cambiar usuarios hace falta internet">
            Tampoco se pueden cerrar sesiones ni vincular celulares. Lo que ves puede no estar al día.
          </Aviso>
        </div>
      )}

      <div className="usuarios">
        {/* ---- 1. Personas autorizadas ---- */}
        <section className="usuarios__personas" aria-label="Personas autorizadas">
          <TituloDeSeccion titulo="Personas autorizadas" detalle="Solo ellas pueden entrar, con su cuenta de Google.">
            <Boton variante="principal" icono="mas" disabled={!enLinea} onClick={() => setHoja("autorizar")}>Autorizar a alguien</Boton>
          </TituloDeSeccion>
          <ul className="usuarios__lista">
            {usuarios.map((u) => {
              const soyYo = u.id === YO.usuarioId;
              return (
                <li key={u.id} className={clases("usuarios__persona", !u.activo && "usuarios__persona--desactivada", soyYo && "usuarios__persona--yo")}>
                  <Iniciales nombre={u.nombre} tono={u.activo ? u.tono : "negro"} />
                  <div className="usuarios__texto">
                    <strong>{u.nombre}{soyYo && <span className="usuarios__vos"> (vos)</span>}</strong>
                    <span className="usuarios__correo">{u.correo}</span>
                  </div>
                  <span className="usuarios__estado">
                    {u.activo ? <Pastilla tipo="bien" icono="tilde">Puede entrar</Pastilla> : <Pastilla tipo="neutro" icono="candado">Desactivada</Pastilla>}
                  </span>
                  <div className="usuarios__accion">
                    {soyYo
                      ? <p className="usuarios__nota">A vos te cambia otro Administrador</p>
                      : <Boton tam="chico" disabled={!enLinea} aria-label={`${u.activo ? "Desactivar" : "Reactivar"} a ${u.nombre}`} onClick={() => cambiarActivo(u, !u.activo)}>{u.activo ? "Desactivar" : "Reactivar"}</Boton>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- 2. Sesiones abiertas ---- */}
        <section className="usuarios__sesiones" aria-label="Sesiones abiertas">
          <TituloDeSeccion titulo="Sesiones abiertas" detalle="Dónde está abierto Ferrebress ahora." />
          <ul className="usuarios__lista">
            {ordenadas.map((s) => {
              const esPropia = s.id === propia?.id;
              const nombre = comoSeLlama(s, esPropia, esCelular);
              return (
                <li key={s.id} className="usuarios__sesion">
                  <Figura icono={s.tipo} tono={esPropia ? "verde" : "negro"} />
                  <div className="usuarios__texto">
                    <strong>{nombre}</strong>
                    <span>{nombreDe(s.usuarioId, usuarios)} · {esPropia ? "activa ahora" : haceCuanto(s)}</span>
                    {esPropia && <span className="usuarios__marca"><Pastilla tipo="bien">Esta sesión</Pastilla></span>}
                  </div>
                  <div className="usuarios__accion">
                    {esPropia
                      ? <Boton tam="chico" icono="salir" onClick={() => cerrarSesion(s)}>Salir</Boton>
                      : <Boton tam="chico" disabled={!enLinea} aria-label={`Cerrar la sesión de ${nombreDe(s.usuarioId, usuarios)} en ${nombre}`} onClick={() => cerrarSesion(s)}>Cerrar</Boton>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- 3. Mis celulares con huella ---- */}
        <section className="usuarios__celulares" aria-label="Mis celulares con huella">
          <TituloDeSeccion titulo="Mis celulares con huella" detalle="Un celular vinculado entra apoyando el dedo, sin Google." />
          {celulares.length === 0 ? (
            <p className="usuarios__sin-celulares">No hay ningún celular vinculado.</p>
          ) : (
            <ul className="usuarios__lista">
              {celulares.map((c) => (
                <li key={c.id} className="usuarios__sesion">
                  <Figura icono="huella" tono={c.este ? "verde" : "negro"} />
                  <div className="usuarios__texto">
                    <strong>{c.nombre}</strong>
                    <span>{c.detalle}</span>
                    {c.este && <span className="usuarios__marca"><Pastilla tipo="bien">Este celular</Pastilla></span>}
                  </div>
                  <div className="usuarios__accion">
                    <Boton tam="chico" disabled={!enLinea} aria-label={`Quitar ${c.nombre}`} onClick={() => quitarCelular(c)}>Quitar</Boton>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {esCelular
            ? !esteVinculado && <Boton icono="huella" ancho className="usuarios__vincular" disabled={!enLinea} onClick={() => setHoja("vincular")}>Vincular este celular</Boton>
            : <p className="usuarios__desde-el-celular">Para vincular un celular, abrí Ferrebress en ese celular y hacelo desde esta misma pantalla.</p>}
        </section>
      </div>

      <AutorizarAAlguien abierta={hoja === "autorizar"} alCerrar={() => setHoja(null)} />
      <VincularEsteCelular
        abierta={hoja === "vincular"}
        alCerrar={() => setHoja(null)}
        alVincular={(nombre) => {
          setCelulares((antes) => [{ id: nuevoId("cel"), nombre, detalle: "Vinculado hoy", este: true }, ...antes]);
          setHoja(null);
          avisar(`Listo: «${nombre}» entra con la huella`, { detalle: "La próxima vez, tocá «Entrar con la huella»." });
        }}
      />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Cómo se dice cada cosa

function nombreDe(usuarioId: string, usuarios: Usuario[]): string {
  return usuarios.find((u) => u.id === usuarioId)?.nombre ?? "Alguien";
}

/** El nombre del dispositivo, dicho desde donde se mira: «Este celular» o «Esta computadora» para la sesión propia. */
function comoSeLlama(s: Sesion, esPropia: boolean, esCelular: boolean): string {
  if (esPropia) return esCelular ? "Este celular" : "Esta computadora";
  if (s.actual) return "Computadora del mostrador";
  return s.nombre;
}

/** «Chrome · Hace 2 horas» → «hace 2 horas»: el navegador no le sirve a nadie en el mostrador. */
function haceCuanto(s: Sesion): string {
  if (s.actual) return "hace 5 minutos";
  return (s.detalle.split(" · ").pop() ?? s.detalle).toLowerCase();
}

// ---------------------------------------------------------------- Hojas

function AutorizarAAlguien({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const usuarios = useAlmacen((a) => a.usuarios);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [revisado, setRevisado] = useState(false);
  useEffect(() => { if (abierta) { setNombre(""); setCorreo(""); setRevisado(false); } }, [abierta]);

  const limpio = correo.trim().toLowerCase();
  const repetido = usuarios.find((u) => u.correo.toLowerCase() === limpio);
  const errorDeNombre = nombre.trim() === "" ? "Escribí el nombre de la persona." : null;
  const errorDeCorreo =
    limpio === "" ? "Escribí su correo de Google."
    : !CORREO_BIEN_ESCRITO.test(limpio) ? "Ese correo está mal escrito: revisá que tenga la arroba y lo que va después."
    : repetido ? (repetido.activo ? `Ese correo ya está autorizado: es el de ${repetido.nombre}.` : `Ese correo es el de ${repetido.nombre}, que está en la lista como desactivada. Cerrá esto y tocá «Reactivar».`)
    : null;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (errorDeNombre || errorDeCorreo) return;
    const nueva: Usuario = { id: nuevoId("u"), nombre: nombre.trim(), correo: limpio, activo: true, tono: TONOS[usuarios.length % TONOS.length] ?? "azul" };
    cambiarAlmacen((a) => ({ ...a, usuarios: [...a.usuarios, nueva] }));
    alCerrar();
    avisar(`${nueva.nombre} ya puede entrar`, { detalle: "Entra con su cuenta de Google." });
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Autorizar a alguien">
      <form className="usuarios__formulario" onSubmit={enviar} noValidate>
        <p className="detalle">Con su correo de Google ya puede entrar. No hay contraseñas que crear.</p>
        <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Lucía" autoCapitalize="words" error={revisado ? errorDeNombre : null} autoFocus />
        <Campo
          etiqueta="Correo de Google"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="nombre@gmail.com"
          // Que ya exista se avisa apenas se termina de escribir, sin esperar a «Autorizar».
          error={revisado || repetido ? errorDeCorreo : null}
        />
        <Boton type="submit" variante="principal" tam="grande" ancho>Autorizar</Boton>
      </form>
    </Hoja>
  );
}

function VincularEsteCelular({ abierta, alCerrar, alVincular }: { abierta: boolean; alCerrar: () => void; alVincular: (nombre: string) => void }) {
  const propuesto = `Celular de ${YO.nombre}`;
  const [nombre, setNombre] = useState(propuesto);
  const [revisado, setRevisado] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  useEffect(() => { if (abierta) { setNombre(propuesto); setRevisado(false); setPidiendo(false); } }, [abierta, propuesto]);

  // El pedido de la huella lo muestra el propio celular; acá se simula que tarda un momento.
  useEffect(() => {
    if (!pidiendo) return;
    const reloj = window.setTimeout(() => alVincular(nombre.trim()), 1400);
    return () => window.clearTimeout(reloj);
  }, [pidiendo]); // eslint-disable-line react-hooks/exhaustive-deps

  function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (nombre.trim() !== "") setPidiendo(true);
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Vincular este celular">
      {pidiendo ? (
        <Cargando texto="Apoyá el dedo en el lector…" detalle="El celular te pide la huella para terminar." />
      ) : (
        <form className="usuarios__formulario" onSubmit={enviar} noValidate>
          <Campo etiqueta="¿Cómo llamamos a este celular?" value={nombre} onChange={(e) => setNombre(e.target.value)} ayuda="Sirve para reconocerlo en la lista. Podés dejar el que está." error={revisado && nombre.trim() === "" ? "Ponele un nombre para reconocerlo." : null} />
          <Boton type="submit" variante="principal" tam="grande" icono="huella" ancho>Vincular con mi huella</Boton>
        </form>
      )}
    </Hoja>
  );
}
