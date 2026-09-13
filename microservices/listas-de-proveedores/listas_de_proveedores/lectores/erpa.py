"""ERPA (Suprabond). Exportación de sistema: encabezado en la fila 1, textos rellenos con
espacios, CantidadCaja como texto libre, y además código de barras y precio sugerido.
Issue #9.
"""

from __future__ import annotations

import re

from ..costos import costo_neto
from ..normalizado import ConfiguracionProveedor, Fila, Lectura, Salteada
from . import base

CLAVE = "erpa"


def detecta(nombre_archivo: str, hojas: list[str]) -> bool:
    return "erpa" in nombre_archivo.lower()


def leer(contenido: bytes, nombre_archivo: str, config: ConfiguracionProveedor) -> Lectura:
    filas = base.filas_de(base.abrir(contenido).worksheets[0])
    lectura = Lectura(CLAVE, base.buscar_fecha([nombre_archivo]), [], [])

    encabezado = base.fila_de_encabezado(filas, "Producto_id")
    if encabezado is None:
        lectura.salteadas.append(Salteada(1, "No se encontró la fila de encabezado con 'Producto_id'"))
        return lectura
    col = base.columnas(filas[encabezado])
    for i, fila in enumerate(filas[encabezado + 1 :], start=encabezado + 2):
        if base.esta_vacia(fila):
            continue
        codigo = base.texto(fila[col["producto_id"]])
        precio = base.numero(fila[col["listaprecio"]])
        if not codigo or precio is None:
            lectura.salteadas.append(Salteada(i, "Sin código o sin precio", [base.texto(c) for c in fila[:4]]))
            continue
        neto, descuentos, pasos = costo_neto(precio, config.iva_por_defecto, config)
        descripcion = base.texto(fila[col["descripcion"]])
        presentacion = base.texto(fila[col["presentacion"]]) if "presentacion" in col else ""
        if presentacion and presentacion.lower() not in descripcion.lower():
            descripcion = f"{descripcion} {presentacion}"
        cantidad_caja = base.texto(fila[col["cantidadcaja"]]) if "cantidadcaja" in col else ""
        m = re.match(r"\s*(\d+)", cantidad_caja)
        codigo_barras = base.texto(fila[col["codigobarra"]]) if "codigobarra" in col else ""
        lectura.filas.append(
            Fila(
                codigo_proveedor=codigo,
                descripcion=descripcion,
                marca=base.texto(fila[col["marca_id"]]) or None,
                grupo=base.texto(fila[col["descripciongrupo"]]) or None,
                precio_lista=precio,
                costo_neto=neto,
                iva=config.iva_por_defecto,
                descuentos=descuentos,
                explicacion=pasos,
                cantidad_bulto=int(m.group(1)) if m else None,
                codigo_barras=codigo_barras if re.fullmatch(r"\d{8,14}", codigo_barras) else None,
                precio_sugerido=base.numero(fila[col["preciosugerido"]]) if "preciosugerido" in col else None,
            )
        )
    return lectura
