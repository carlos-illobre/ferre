import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { iniciales as sacarIniciales, type Tono } from "../datos";
import { Icono, type NombreDeIcono } from "./Icono";

/** Junta clases salteando las vacías: `clases("boton", activo && "boton--activo")`. */
export function clases(...partes: (string | false | null | undefined)[]): string {
  return partes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------- Boton

type PropsDeBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `principal` es el naranja lleno: uno solo por pantalla. Por defecto `secundario`. */
  variante?: "principal" | "secundario" | "peligro" | "texto";
  /** `grande` para la acción de la pantalla (56 px); `normal` 48 px; `chico` 44 px. */
  tam?: "chico" | "normal" | "grande";
  icono?: NombreDeIcono;
  /** Ícono después del texto (por ejemplo la flecha de «Ver lista»). */
  iconoFinal?: NombreDeIcono;
  /** Ocupa todo el ancho disponible. */
  ancho?: boolean;
};

export function Boton({ variante = "secundario", tam = "normal", icono, iconoFinal, ancho, className, children, type = "button", ...resto }: PropsDeBoton) {
  return (
    <button type={type} className={clases("boton", `boton--${variante}`, `boton--${tam}`, ancho && "boton--ancho", !children && "boton--solo-icono", className)} {...resto}>
      {icono && <Icono nombre={icono} tam={tam === "grande" ? 22 : 20} />}
      {children && <span>{children}</span>}
      {iconoFinal && <Icono nombre={iconoFinal} tam={tam === "grande" ? 22 : 18} />}
    </button>
  );
}

// ---------------------------------------------------------------- Pastilla

type PropsDePastilla = {
  tipo?: "bien" | "alerta" | "error" | "info" | "neutro";
  icono?: NombreDeIcono;
  children: ReactNode;
};

/** Estado corto de una cosa: «Anulada», «Sin precio», «Esta sesión». */
export function Pastilla({ tipo = "neutro", icono, children }: PropsDePastilla) {
  return (
    <span className={`pastilla pastilla--${tipo}`}>
      {icono && <Icono nombre={icono} tam={15} grosor={2.2} />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Tarjeta

type PropsDeTarjeta = HTMLAttributes<HTMLElement> & {
  /** `verde` es el bloque fuerte de Figma (totales del día); `plana` va sin relleno interior. */
  variante?: "blanca" | "verde" | "plana";
  /** Etiqueta HTML. Por defecto `section`. */
  como?: "section" | "article" | "div" | "aside";
};

export function Tarjeta({ variante = "blanca", como: Etiqueta = "section", className, children, ...resto }: PropsDeTarjeta) {
  return <Etiqueta className={clases("tarjeta", `tarjeta--${variante}`, className)} {...resto}>{children}</Etiqueta>;
}

// ---------------------------------------------------------------- Lista y Renglon

/** Lista de renglones dentro de una tarjeta blanca, separados por una línea. */
export function Lista({ children, className, ...resto }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={clases("lista", className)} {...resto}>{children}</ul>;
}

type PropsDeRenglon = {
  titulo: ReactNode;
  detalle?: ReactNode;
  /** Lo que va a la izquierda: `<Iniciales …/>`, `<Figura …/>`, la hora. */
  inicio?: ReactNode;
  /** Lo que va a la derecha: un importe, una `Pastilla`, un `Boton`. */
  fin?: ReactNode;
  /** Si se pasa, todo el renglón es un botón y lleva la flecha de Figma. */
  alTocar?: () => void;
  /** Renglón atenuado y tachado (una venta anulada, un usuario desactivado). */
  apagado?: boolean;
  className?: string;
};

export function Renglon({ titulo, detalle, inicio, fin, alTocar, apagado, className }: PropsDeRenglon) {
  const adentro = (
    <>
      {inicio && <span className="renglon__inicio">{inicio}</span>}
      <span className="renglon__texto">
        <span className="renglon__titulo">{titulo}</span>
        {detalle && <span className="renglon__detalle">{detalle}</span>}
      </span>
      {fin && <span className="renglon__fin">{fin}</span>}
      {alTocar && <Icono nombre="flecha" tam={18} className="renglon__flecha" />}
    </>
  );
  return (
    <li className={clases("renglon", apagado && "renglon--apagado", className)}>
      {alTocar ? <button type="button" className="renglon__caja renglon__caja--boton" onClick={alTocar}>{adentro}</button> : <div className="renglon__caja">{adentro}</div>}
    </li>
  );
}

// ---------------------------------------------------------------- Iniciales y Figura

type PropsDeIniciales = {
  /** El nombre entero: se muestran las dos primeras letras. */
  nombre: string;
  tono?: Tono | "marca" | "avatar";
  /** `redonda` para personas, `cuadrada` para proveedores (como en Figma). */
  forma?: "redonda" | "cuadrada";
  tam?: "normal" | "grande";
};

export function Iniciales({ nombre, tono = "naranja", forma = "redonda", tam = "normal" }: PropsDeIniciales) {
  return <span className={`iniciales iniciales--${tono} iniciales--${forma} iniciales--${tam}`} aria-hidden="true">{sacarIniciales(nombre)}</span>;
}

type PropsDeFigura = { icono: NombreDeIcono; tono?: Tono; tam?: "normal" | "grande" };

/** El cuadrado de color con un ícono de Figma (la «foto» de un producto, el ícono de una tarjeta). */
export function Figura({ icono, tono = "naranja", tam = "normal" }: PropsDeFigura) {
  return <span className={`figura figura--${tono} figura--${tam}`} aria-hidden="true"><Icono nombre={icono} tam={tam === "grande" ? 28 : 22} /></span>;
}

// ---------------------------------------------------------------- TituloDeSeccion

type PropsDeTitulo = {
  titulo: string;
  /** Lo que va a la derecha: una cuenta («4 listas») o un botón. */
  children?: ReactNode;
  /** Una línea de ayuda debajo del título. */
  detalle?: string;
};

export function TituloDeSeccion({ titulo, detalle, children }: PropsDeTitulo) {
  return (
    <div className="titulo-seccion">
      <div>
        <h2>{titulo}</h2>
        {detalle && <p>{detalle}</p>}
      </div>
      {children && <div className="titulo-seccion__fin">{children}</div>}
    </div>
  );
}
