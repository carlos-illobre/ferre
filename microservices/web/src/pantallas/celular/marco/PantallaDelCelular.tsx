import type { ReactNode } from "react";
import { ConfiguracionCelu } from "../configuracion/ConfiguracionCelu";
import { PantallaDeProcesos } from "../../comun/procesos/Procesos";
import { SinPermiso } from "../../SinPermiso";
import { Roles } from "../../comun/negocio/Roles";
import { Catalogo } from "../catalogo/Catalogo";
import { Deposito } from "../deposito/Deposito";
import { Negocio, type Parte } from "../negocio/Negocio";
import { TicketsCelu } from "../tickets/TicketsCelu";
import { CabezaDeNegocio } from "../negocio/CabezaDeNegocio";
import { Sistema } from "../../comun/sistema/Sistema";
import { ComoVaElNegocio } from "../negocio/ComoVaElNegocio";
import { AnotadasCelu } from "../anomalias/AnotadasCelu";
import { ParaRevisarCelu } from "../anomalias/ParaRevisarCelu";
import { CabezaDeAnomalias } from "../anomalias/CabezaDeAnomalias";
import { ParteVender } from "../ventas/ParteVender";
import type { MenuDelCelular } from "./menu-del-celular";

// Las opciones de Más que son una pantalla sola.
const SOLAS: Partial<Record<string, () => ReactNode>> = {
  tickets: () => <TicketsCelu />,
  configuracion: () => <ConfiguracionCelu />,
  sistema: () => <Sistema celular />,
  procesos: () => <PantallaDeProcesos interfaz="celu" />,
};

// Las partes de Más que tienen pestañas: Usuarios (con Roles), Anomalías y Cómo va el negocio.
function conPestanas({ deUsuarios, deAnomalias, deNegocio, parte }: MenuDelCelular): ReactNode {
  if (deUsuarios?.valor === "roles") return <Roles cabeza={<CabezaDeNegocio actual="roles" />} />;
  if (deUsuarios) return <Negocio parte={deUsuarios.valor as Exclude<typeof deUsuarios.valor, "roles">} cabeza={<CabezaDeNegocio actual={deUsuarios.valor} />} />;
  if (deAnomalias?.valor === "para-revisar") return <ParaRevisarCelu cabeza={<CabezaDeAnomalias actual="para-revisar" />} />;
  if (parte === "anomalias") return <AnotadasCelu cabeza={<CabezaDeAnomalias actual="anomalias" />} />;
  if (deNegocio) return <ComoVaElNegocio seccion={deNegocio.valor} />;
  return null;
}

// Lo que se ve en Más: una de sus partes o, sin parte, el menú de Más.
function pantallaDeMas(m: MenuDelCelular, menuDeMas: ReactNode): ReactNode {
  const sola = m.parte ? SOLAS[m.parte] : undefined;
  if (sola) return sola();
  const conSusPestanas = conPestanas(m);
  if (conSusPestanas) return conSusPestanas;
  if (m.parte && m.parte !== "negocio") return <Negocio parte={m.parte as Parte} />;
  return menuDeMas;
}

// La pantalla de la pestaña elegida; sin el permiso que pide, se dice qué falta.
export function PantallaDelCelular({ m, menuDeMas }: { m: MenuDelCelular; menuDeMas: ReactNode }) {
  if (m.falta) return <SinPermiso falta={m.falta} />;
  if (m.pestana === "mas") return <>{pantallaDeMas(m, menuDeMas)}</>;
  if (m.pestana === "catalogo") return <Catalogo sub={m.sinDireccion ? null : m.sub} />;
  if (m.pestana === "deposito") return <Deposito sub={m.sub} />;
  return <ParteVender sub={m.sub} />;
}
