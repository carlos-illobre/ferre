"""Costo neto: lo que realmente se paga, sin IVA (issue #11).

Regla del dueño: se aprovechan todos los descuentos y se paga al contado. Cada paso queda
escrito para que cualquier costo se pueda explicar (issue #47).
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from .normalizado import ConfiguracionProveedor, Descuento

CUATRO_DECIMALES = Decimal("0.0001")


def redondear(valor: Decimal) -> Decimal:
    return valor.quantize(CUATRO_DECIMALES, rounding=ROUND_HALF_UP)


def pesos(valor: Decimal) -> str:
    return f"${valor.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def costo_neto(
    precio_lista: Decimal,
    iva: Decimal,
    config: ConfiguracionProveedor,
    descuentos_de_la_fila: list[Descuento] | None = None,
) -> tuple[Decimal, list[Descuento], list[str]]:
    """Devuelve (costo neto, descuentos aplicados en orden, explicación paso a paso).

    Orden: quitar IVA si la lista lo incluye → descuentos propios de la fila (los que el
    proveedor ya escribió en esa línea) → descuento general → descuento por contado.
    Los descuentos se aplican en cascada, uno sobre el resultado del anterior, que es
    como los proveedores los facturan.
    """
    pasos: list[str] = []
    aplicados: list[Descuento] = []
    valor = precio_lista
    pasos.append(f"Precio de lista {pesos(valor)}")

    if config.precios_incluyen_iva:
        valor = valor / (1 + iva)
        pasos.append(f"sin IVA ({iva * 100:.1f} %) = {pesos(valor)}")

    for d in descuentos_de_la_fila or []:
        if d.porcentaje:
            valor = valor * (1 - d.porcentaje / 100)
            aplicados.append(d)
            pasos.append(f"− {d.porcentaje:g} % ({d.tipo}) = {pesos(valor)}")

    for tipo, fraccion in (("general", config.descuento_general), ("contado", config.descuento_contado)):
        if fraccion:
            porcentaje = fraccion * 100
            valor = valor * (1 - fraccion)
            aplicados.append(Descuento(tipo, porcentaje))
            pasos.append(f"− {porcentaje:g} % ({tipo}) = {pesos(valor)}")

    valor = redondear(valor)
    pasos.append(f"Costo neto {pesos(valor)} (+ IVA {iva * 100:.1f} % = {pesos(valor * (1 + iva))})")
    return valor, aplicados, pasos
