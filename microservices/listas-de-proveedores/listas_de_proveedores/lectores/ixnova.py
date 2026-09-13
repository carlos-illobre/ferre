"""Ixnova (HNZ SRL). Tres hojas: 'Lista de precios', 'Cambios de precios', 'Ofertas vigentes'.
Encabezado en la fila 8; filas 'Grupo : ...' intercaladas; precios netos sin IVA; la fecha
está en el título de la fila 2. Issue #10.
"""

from __future__ import annotations

from decimal import Decimal

from ..costos import costo_neto
from ..normalizado import ConfiguracionProveedor, Fila, Lectura, Oferta, Salteada
from . import base

CLAVE = "ixnova"


def detecta(nombre_archivo: str, hojas: list[str]) -> bool:
    return "ixnova" in nombre_archivo.lower() or {"Lista de precios", "Ofertas vigentes"} <= set(hojas)


def leer(contenido: bytes, nombre_archivo: str, config: ConfiguracionProveedor) -> Lectura:
    libro = base.abrir(contenido)
    hoja = libro["Lista de precios"] if "Lista de precios" in libro.sheetnames else libro.worksheets[0]
    filas = base.filas_de(hoja)
    lectura = Lectura(CLAVE, None, [], [])

    encabezado = base.fila_de_encabezado(filas, "Cod Articulo")
    if encabezado is None:
        lectura.salteadas.append(Salteada(1, "No se encontró la fila de encabezado con 'Cod Articulo'"))
        return lectura
    lectura.fecha_lista = base.buscar_fecha([base.texto(c) for f in filas[:encabezado] for c in f] + [nombre_archivo])

    col = base.columnas(filas[encabezado])
    grupo: str | None = None
    for i, fila in enumerate(filas[encabezado + 1 :], start=encabezado + 2):
        if base.esta_vacia(fila):
            continue
        primera = base.texto(fila[0])
        if primera.lower().startswith("grupo") and base.texto(fila[1] if len(fila) > 1 else None) == "":
            grupo = primera.split(":", 1)[-1].strip()
            continue
        codigo = base.texto(fila[col["cod articulo"]])
        precio = base.numero(fila[col["precio ixnova"]])
        if not codigo or precio is None:
            lectura.salteadas.append(Salteada(i, "Sin código o sin precio", [base.texto(c) for c in fila[:6]]))
            continue
        iva = base.porcentaje_a_fraccion(fila[col["iva"]] if "iva" in col else None, config.iva_por_defecto)
        neto, descuentos, pasos = costo_neto(precio, iva, config)
        lectura.filas.append(
            Fila(
                codigo_proveedor=codigo,
                descripcion=base.texto(fila[col["descripcion"]]),
                marca=base.texto(fila[col["marca"]]) or None,
                grupo=grupo,
                precio_lista=precio,
                costo_neto=neto,
                iva=iva,
                descuentos=descuentos,
                explicacion=pasos,
            )
        )

    if "Ofertas vigentes" in libro.sheetnames:
        lectura.ofertas = _ofertas(base.filas_de(libro["Ofertas vigentes"]))
    return lectura


def _ofertas(filas) -> list[Oferta]:
    encabezado = base.fila_de_encabezado(filas, "Oferta 1")
    if encabezado is None:
        return []
    col = base.columnas(filas[encabezado])
    ofertas = []
    for fila in filas[encabezado + 1 :]:
        codigo = base.texto(fila[col["cod articulo"]])
        precio = base.numero(fila[col["precio de lista"]])
        if not codigo or precio is None:
            continue
        ofertas.append(
            Oferta(
                codigo_proveedor=codigo,
                descripcion=base.texto(fila[col["descripcion"]]),
                precio_lista=precio,
                texto_oferta=base.texto(fila[col["oferta 1"]]),
                vigente_hasta=base.fecha_de(fila[col["vigente hasta"]]) if "vigente hasta" in col else None,
            )
        )
    return ofertas
