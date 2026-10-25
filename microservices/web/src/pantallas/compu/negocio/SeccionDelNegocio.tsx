import { useEffect, useState, type ReactNode } from "react";
import { useComandos, useEtiqueta } from "../../../plataforma/comandos";
import { useUsuarioActual } from "../../../negocio/usuarios";
import { NOMBRES, TEXTOS } from "../../textos";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import type { SeccionDeNegocio } from "../../pestanas-de-negocio";
import { Atajo, Aviso, EstadoDeConexion, Pagina } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { EstadoDelServidor } from "./EstadoDelServidor";
import { PeriodoDeVentas } from "./PeriodoDeVentas";
import { SeccionesDelNegocio } from "./SeccionesDelNegocio";
import { horaCorta, useEnLinea } from "./negocio-comun";
import css from "./Resumen.module.css";

// Lo común a las tres secciones, como la v2: arriba las secciones como segmentos con ícono (cada
// una con su permiso; Resultado apagada hasta que exista) y, a la derecha, qué período cuenta y
// Hoy · Semana · Mes (Semana y Mes apagados hasta que se calculen). Al lado de las pestañas,
// «Actualizado» y «Actualizar». Abajo, chico, quién entró y cómo está el servidor.

type Props = { seccion: SeccionDeNegocio; testId: string; bajada: string; cargando?: boolean; datos?: unknown; alActualizar: () => void; children: ReactNode };

export function SeccionDelNegocio({ seccion, testId, bajada, cargando, datos, alActualizar, children }: Props) {
  const enLinea = useEnLinea();
  const { actualizado, actualizar } = useActualizar(datos, enLinea && !cargando, alActualizar);
  return (
    <Pagina titulo={NOMBRES.comoVaElNegocio} testId={testId} bajada={<span className="solo-lectores">{bajada}</span>} className="rv"
      acciones={<AlLadoDeLasPestanas><span className={css.actualizado}>{TEXTOS.tablero.actualizado.largo} {horaCorta(actualizado)}</span><button type="button" className={css.boton} onClick={actualizar} disabled={!enLinea || cargando} aria-keyshortcuts={useEtiqueta("negocio.actualizar")} data-testid="actualizar-negocio"><Icono nombre="refresh-cw" tam={16} />Actualizar <Atajo accion="negocio.actualizar" className={css.kbd} /></button></AlLadoDeLasPestanas>}>
      <div className={css.barra}>
        <SeccionesDelNegocio seccion={seccion} />
        {seccion === "ventas" && <PeriodoDeVentas actualizado={actualizado} />}
      </div>
      {!enLinea && <Aviso tipo="alerta" testId="resumen-sin-conexion">Sin conexión: los números se ven cuando vuelva internet. Se actualizan solos.</Aviso>}
      {children}
      <PieDelNegocio />
    </Pagina>
  );
}

// «Actualizado» a qué hora y actualizar (también desde el teclado), si hay conexión y no está cargando.
function useActualizar(datos: unknown, puede: boolean, alActualizar: () => void) {
  const [actualizado, setActualizado] = useState(() => new Date());
  useEffect(() => { if (datos) setActualizado(new Date()); }, [datos]);
  const actualizar = () => { if (puede) { alActualizar(); setActualizado(new Date()); } };
  useComandos({ "negocio.actualizar": actualizar });
  return { actualizado, actualizar };
}

// Abajo, chico: quién entró, la conexión y cómo está el servidor.
function PieDelNegocio() {
  const usuario = useUsuarioActual();
  return (
    <footer className="resumen-pie">
      {usuario && <span>Entraste como <strong data-testid="usuario-negocio">{usuario.nombre}</strong> <span className="detalle">({usuario.email})</span></span>}
      <EstadoDeConexion testId="conexion-negocio" />
      <EstadoDelServidor />
    </footer>
  );
}
