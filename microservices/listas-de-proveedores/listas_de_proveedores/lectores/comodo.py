"""Comodo ('LISTA GENERAL'). Una hoja; condiciones generales arriba (descuento general
y por contado); encabezado en la fila 8. Cada fila trae su propio descuento
('Descuento Base + Ofertas', negativo, p. ej. -25 o -47.5) y el IVA ('21 %' o '10,5 %').
La planilla ya calcula el costo con contado; lo recalculamos con las reglas y lo
comparamos: si difiere, avisamos. Issue #7.
"""

from __future__ import annotations

from decimal import Decimal

from ..costos import costo_neto
from ..normalizado import ConfiguracionProveedor, Descuento, Fila, Lectura, Salteada
from . import base

CLAVE = "comodo"


def detecta(nombre_archivo: str, hojas: list[str]) -> bool:
    return "lista general" in nombre_archivo.lower() or "LISTA GENERAL" in hojas


def leer(contenido: bytes, nombre_archivo: str, config: ConfiguracionProveedor) -> Lectura:
    filas = base.filas_de(base.abrir(contenido).worksheets[0])
    lectura = Lectura(CLAVE, base.buscar_fecha([nombre_archivo]), [], [])

    encabezado = base.fila_de_encabezado(filas, "Código")
    if encabezado is None:
        lectura.salteadas.append(Salteada(1, "No se encontró la fila de encabezado con 'Código'"))
        return lectura
    col = base.columnas(filas[encabezado])
    col_costo_planilla = next((i for n, i in col.items() if n.startswith("costo c/ dto contado")), None)

    # El descuento por línea ya viene en la fila: no se aplica el general de la config
    # además, porque sería contarlo dos veces. El contado sí.
    config_sin_general = ConfiguracionProveedor(
        precios_incluyen_iva=config.precios_incluyen_iva,
        descuento_general=Decimal("0"),
        descuento_contado=config.descuento_contado,
        iva_por_defecto=config.iva_por_defecto,
    )
    diferencias = 0
    for i, fila in enumerate(filas[encabezado + 1 :], start=encabezado + 2):
        if base.esta_vacia(fila):
            continue
        codigo = base.texto(fila[col["codigo"]])
        precio = base.numero(fila[col["precio de lista"]])
        if not codigo or precio is None:
            lectura.salteadas.append(Salteada(i, "Sin código o sin precio", [base.texto(c) for c in fila[:6]]))
            continue
        moneda = base.texto(fila[col["mon"]]) if "mon" in col else "$"
        if moneda not in ("$", "ARS", ""):
            lectura.salteadas.append(Salteada(i, f"Moneda {moneda} no soportada", [codigo]))
            continue
        descuento_linea = base.numero(fila[col["descuento base + ofertas"]]) if "descuento base + ofertas" in col else None
        propios = [Descuento("linea", abs(descuento_linea))] if descuento_linea else []
        iva = base.porcentaje_a_fraccion(fila[col["iva"]] if "iva" in col else None, config.iva_por_defecto)
        neto, descuentos, pasos = costo_neto(precio, iva, config_sin_general, propios)

        if col_costo_planilla is not None:
            de_planilla = base.numero(fila[col_costo_planilla])
            if de_planilla is not None and abs(de_planilla - neto) > Decimal("0.05"):
                diferencias += 1
                pasos.append(f"Atención: la planilla dice {de_planilla:.2f}")

        lectura.filas.append(
            Fila(
                codigo_proveedor=codigo,
                descripcion=base.texto(fila[col["descripcion"]]),
                marca=base.texto(fila[col["marca"]]) or None,
                precio_lista=precio,
                costo_neto=neto,
                iva=iva,
                descuentos=descuentos,
                explicacion=pasos,
            )
        )
    if diferencias:
        lectura.avisos.append(
            f"{diferencias} filas donde el costo calculado no coincide con el de la planilla: revisar el descuento por contado configurado"
        )
    return lectura
