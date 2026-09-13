"""Formato único de salida de todos los lectores (issues #7 a #10).

Cada proveedor manda su Excel como quiere; acá termina todo igual: una fila por producto
con el costo neto y el desglose de cómo se llegó a él (issue #47), más las filas que no
se pudieron leer y por qué.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date
from decimal import Decimal


@dataclass
class Descuento:
    tipo: str  # "general" | "contado" | "linea" | "oferta"
    porcentaje: Decimal  # 25 = 25 %


@dataclass
class Fila:
    codigo_proveedor: str
    descripcion: str
    precio_lista: Decimal  # tal como viene en la lista, en la moneda de la lista
    costo_neto: Decimal  # lo que realmente se paga, sin IVA
    iva: Decimal  # 0.21
    descuentos: list[Descuento] = field(default_factory=list)
    explicacion: list[str] = field(default_factory=list)  # pasos en castellano
    marca: str | None = None
    grupo: str | None = None  # familia sugerida por el proveedor
    codigo_barras: str | None = None
    cantidad_bulto: int | None = None
    precio_bulto: Decimal | None = None
    precio_sugerido: Decimal | None = None  # precio de venta que sugiere el proveedor, si lo hay


@dataclass
class Salteada:
    fila: int  # número de fila en la planilla, base 1, como lo ve el usuario en Excel
    motivo: str
    contenido: list[str] = field(default_factory=list)


@dataclass
class Oferta:
    codigo_proveedor: str
    descripcion: str
    precio_lista: Decimal
    texto_oferta: str
    vigente_hasta: date | None


@dataclass
class Lectura:
    proveedor: str  # clave del lector: "ixnova", "comodo", "tresge", "erpa"
    fecha_lista: date | None  # la que dice la planilla; si no dice, la pone quien la carga
    filas: list[Fila]
    salteadas: list[Salteada]
    ofertas: list[Oferta] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)  # cosas que conviene mirar, no errores

    def resumen(self) -> dict[str, int]:
        return {"leidas": len(self.filas), "salteadas": len(self.salteadas), "ofertas": len(self.ofertas)}

    def como_json(self) -> dict:
        def convertir(valor):
            if isinstance(valor, Decimal):
                return str(valor)
            if isinstance(valor, date):
                return valor.isoformat()
            if isinstance(valor, list):
                return [convertir(v) for v in valor]
            if isinstance(valor, dict):
                return {k: convertir(v) for k, v in valor.items()}
            return valor

        return convertir({**asdict(self), "resumen": self.resumen()})


@dataclass(frozen=True)
class ConfiguracionProveedor:
    """Lo que el proveedor no dice en la planilla y hay que saber para calcular el costo.
    Viene de la tabla `proveedor` de gestion-del-local (issue #11)."""

    precios_incluyen_iva: bool = False
    descuento_general: Decimal = Decimal("0")  # 0.25 = 25 %
    descuento_contado: Decimal = Decimal("0")
    iva_por_defecto: Decimal = Decimal("0.21")
