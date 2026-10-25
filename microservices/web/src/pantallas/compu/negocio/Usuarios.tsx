import { useState } from "react";
import { NOMBRES, TEXTOS } from "../../textos";
import { Aviso, Boton, Hoja, Pagina, Toast } from "../base/ui";
import { useEnLinea } from "./negocio-comun";
import { avisoDeAutorizado } from "../../../negocio/usuarios";
import { usePuede } from "../../permisos";
import { AccionesDeUsuarios } from "./AccionesDeUsuarios";
import { AltaDeUsuario } from "./AltaDeUsuario";
import { FichaDeUsuario } from "./FichaDeUsuario";
import { KpisDeUsuarios } from "./KpisDeUsuarios";
import { BuscadorDeUsuarios } from "./BuscadorDeUsuarios";
import { TablaDeUsuarios } from "./TablaDeUsuarios";
import { useAccionesDeUsuarios } from "./useAccionesDeUsuarios";
import { useUsuariosDeLaCompu, type Avisar, type Mensaje } from "./useUsuariosDeLaCompu";
import "./negocio.css";
import css from "./Usuarios.module.css";

// Más → Usuarios como la v2 («Tabla y ficha», decisión 148): arriba cuatro números, el buscador con
// «Todos», «Activos» y «Rol»; una persona por renglón con sus roles y su acceso, y a la derecha la
// ficha fija de la elegida, con sus roles, sus sesiones y celulares con huella y «Desactivar».
// «Roles y permisos» y «Autorizar a alguien» van al lado de las pestañas.
export function Usuarios() {
  const enLinea = useEnLinea();
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  return (
    <Pagina titulo={NOMBRES.usuarios} testId="usuarios-autorizados" className="usuarios uv" bajada={<span className="solo-lectores">{TEXTOS.usuarios.pestanaUsuarios.largo}</span>}>
      {!enLinea && <Aviso tipo="alerta" testId="usuarios-sin-conexion">Sin conexión: administrar usuarios necesita internet. Lo que ves puede no estar al día.</Aviso>}
      <Autorizados enLinea={enLinea} avisar={setMensaje} />
      <Toast texto={mensaje?.texto ?? null} alCerrar={() => setMensaje(null)} testId={mensaje?.testId ?? "mensaje"} />
    </Pagina>
  );
}

function Autorizados({ enLinea, avisar }: { enLinea: boolean; avisar: Avisar }) {
  const puedeEsto = usePuede();
  const x = useUsuariosDeLaCompu(avisar);
  const lugares = useAccionesDeUsuarios(x, enLinea, puedeEsto("admin.roles"));
  const { lista, elegida } = x;
  return (
    <>
      <AccionesDeUsuarios enLinea={enLinea} alAutorizar={() => x.setAlta(true)} />
      <Aviso tipo="error" accion={<Boton tam="chico" onClick={lista.recargar}>Reintentar</Boton>}>{lista.error}</Aviso>
      {!lista.datos && !lista.error && <div className="tarjeta negocio-esqueleto" role="status" aria-label="Trayendo los usuarios">{[0, 1, 2].map((i) => <span key={i} className="esqueleto" />)}</div>}
      {lista.datos && (
        <section className={css.pantalla} aria-labelledby="usuarios-autorizados-titulo">
          <h2 id="usuarios-autorizados-titulo" className="solo-lectores">Usuarios autorizados</h2>
          <div className={css.izq}>
            <KpisDeUsuarios filas={x.filas} sesiones={x.sesiones.datos} celulares={x.celulares.datos} />
            <BuscadorDeUsuarios filtro={x.filtro} roles={x.disponibles} filas={x.filas} buscador={lugares.buscador} />
            <TablaDeUsuarios x={x} lista={lugares.lista} />
          </div>
          {elegida && (
            <FichaDeUsuario key={elegida.id} u={elegida} yo={x.yo} acceso={x.accesoDeLaFila(elegida)} disponibles={x.disponibles} enLinea={enLinea} ocupada={x.ocupada === elegida.id} error={x.errorDe(elegida)}
              cambiandoRoles={x.cambiandoRoles} alGuardarRoles={(ids) => x.cambiar(elegida, { roles: ids })} alActivar={() => void x.cambiar(elegida, { activo: !elegida.activo })}
              alCerrarSesion={(s) => void x.cerrarLaSesion(elegida, s)} alQuitarCelular={(c) => void x.quitarElCelular(elegida, c)} />
          )}
        </section>
      )}
      {x.alta && (
        <Hoja titulo={TEXTOS.usuarios.autorizarOtro.largo} alCerrar={() => x.setAlta(false)} testId="hoja-autorizar">
          <AltaDeUsuario disponibles={x.disponibles} enLinea={enLinea} alAutorizar={(u) => { x.setAlta(false); avisar({ texto: avisoDeAutorizado(u.nombre) }); }} />
        </Hoja>
      )}
    </>
  );
}
