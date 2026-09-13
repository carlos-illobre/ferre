"""Registro de lectores. Cada uno sabe reconocer su planilla (por nombre de archivo u
hojas) y leerla. El genérico configurable es el issue #22."""

from __future__ import annotations

from ..normalizado import ConfiguracionProveedor, Lectura
from . import base, comodo, erpa, ixnova, tresge

LECTORES = {m.CLAVE: m for m in (ixnova, comodo, tresge, erpa)}


def detectar(contenido: bytes, nombre_archivo: str) -> str | None:
    try:
        hojas = base.abrir(contenido).sheetnames
    except Exception:
        return None
    for clave, lector in LECTORES.items():
        if lector.detecta(nombre_archivo, hojas):
            return clave
    return None


def leer(contenido: bytes, nombre_archivo: str, config: ConfiguracionProveedor, proveedor: str | None = None) -> Lectura:
    clave = proveedor or detectar(contenido, nombre_archivo)
    if clave is None or clave not in LECTORES:
        raise ValueError("No se reconoció el formato de la planilla. Elegí el proveedor a mano.")
    return LECTORES[clave].leer(contenido, nombre_archivo, config)
