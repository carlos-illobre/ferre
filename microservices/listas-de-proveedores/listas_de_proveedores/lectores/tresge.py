"""Distribuidora 3GE. Una hoja: Código, Descripción, Precio Unitario, Bulto, Precio Bulto.
Las marcas aparecen como filas de una sola celda antes de sus productos. No dice si
incluye IVA: lo dice la configuración del proveedor. Issue #8.
"""

from __future__ import annotations

from ..costos import costo_neto
from ..normalizado import ConfiguracionProveedor, Fila, Lectura, Salteada
from . import base

CLAVE = "tresge"


def detecta(nombre_archivo: str, hojas: list[str]) -> bool:
    n = nombre_archivo.lower()
    return "3ge" in n or "3g " in n or "tresge" in n


def leer(contenido: bytes, nombre_archivo: str, config: ConfiguracionProveedor) -> Lectura:
    filas = base.filas_de(base.abrir(contenido).worksheets[0])
    lectura = Lectura(CLAVE, base.buscar_fecha([nombre_archivo]), [], [])

    encabezado = base.fila_de_encabezado(filas, "Precio Unitario")
    if encabezado is None:
        lectura.salteadas.append(Salteada(1, "No se encontró la fila de encabezado con 'Precio Unitario'"))
        return lectura
    col = base.columnas(filas[encabezado])
    marca: str | None = None
    for i, fila in enumerate(filas[encabezado + 1 :], start=encabezado + 2):
        if base.esta_vacia(fila):
            continue
        con_valor = [base.texto(c) for c in fila if base.texto(c)]
        if len(con_valor) == 1:
            marca = con_valor[0]
            continue
        codigo = base.texto(fila[col["codigo"]])
        precio = base.numero(fila[col["precio unitario"]])
        if not codigo or precio is None:
            lectura.salteadas.append(Salteada(i, "Sin código o sin precio", con_valor[:4]))
            continue
        neto, descuentos, pasos = costo_neto(precio, config.iva_por_defecto, config)
        bulto = base.numero(fila[col["bulto"]]) if "bulto" in col else None
        lectura.filas.append(
            Fila(
                codigo_proveedor=codigo,
                descripcion=base.texto(fila[col["descripcion"]]),
                marca=marca,
                precio_lista=precio,
                costo_neto=neto,
                iva=config.iva_por_defecto,
                descuentos=descuentos,
                explicacion=pasos,
                cantidad_bulto=int(bulto) if bulto else None,
                precio_bulto=base.numero(fila[col["precio bulto"]]) if "precio bulto" in col else None,
            )
        )
    return lectura
