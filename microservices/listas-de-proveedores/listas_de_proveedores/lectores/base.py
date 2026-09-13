"""Herramientas comunes a los lectores: abrir la planilla, buscar el encabezado, limpiar celdas."""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO
from typing import Any

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

Celda = Any


def abrir(contenido: bytes) -> openpyxl.Workbook:
    return openpyxl.load_workbook(BytesIO(contenido), read_only=True, data_only=True)


def filas_de(hoja: Worksheet) -> list[tuple[Celda, ...]]:
    return [tuple(fila) for fila in hoja.iter_rows(values_only=True)]


def texto(celda: Celda) -> str:
    """Los sistemas de los proveedores rellenan con espacios (ERPA) o mandan números como texto."""
    if celda is None:
        return ""
    if isinstance(celda, float) and celda.is_integer():
        return str(int(celda))
    return str(celda).strip()


def numero(celda: Celda) -> Decimal | None:
    """Acepta 1234.5, '1234,50', '$ 1.234,50', '21 %'. Devuelve None si no es un número."""
    if celda is None or celda == "":
        return None
    if isinstance(celda, (int, float)):
        return Decimal(str(celda))
    limpio = re.sub(r"[^\d,.\-]", "", str(celda))
    if not limpio:
        return None
    if "," in limpio and "." in limpio:
        limpio = limpio.replace(".", "").replace(",", ".")  # 1.234,50
    elif "," in limpio:
        limpio = limpio.replace(",", ".")
    try:
        return Decimal(limpio)
    except InvalidOperation:
        return None


def porcentaje_a_fraccion(celda: Celda, por_defecto: Decimal) -> Decimal:
    """'21 %' → 0.21; '10,5 %' → 0.105; 21 → 0.21; None → por defecto."""
    valor = numero(celda)
    if valor is None:
        return por_defecto
    return valor / 100 if valor > 1 else valor


def fila_de_encabezado(filas: list[tuple[Celda, ...]], marca: str, maximo: int = 30) -> int | None:
    """Índice (base 0) de la primera fila que contiene la celda `marca` (sin distinguir mayúsculas ni acentos)."""
    objetivo = normalizar(marca)
    for i, fila in enumerate(filas[:maximo]):
        if any(normalizar(texto(c)) == objetivo for c in fila):
            return i
    return None


def columnas(fila: tuple[Celda, ...]) -> dict[str, int]:
    """Mapa nombre normalizado → índice, para no depender del orden de las columnas."""
    return {normalizar(texto(c)): i for i, c in enumerate(fila) if texto(c)}


def normalizar(s: str) -> str:
    s = s.lower().strip()
    for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n"), ("\\", "/")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s)


def buscar_fecha(textos: list[str], hoy: date | None = None) -> date | None:
    """Encuentra la primera fecha d/m/aaaa o dd-mm-aa en una lista de textos (títulos,
    nombre de archivo). Si solo hay día y mes ('11-8'), se supone el año en curso, o el
    anterior si esa fecha todavía no llegó."""
    for t in textos:
        for m in re.finditer(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", t):
            d, mes, a = (int(x) for x in m.groups())
            if a < 100:
                a += 2000
            try:
                return date(a, mes, d)
            except ValueError:
                continue
    hoy = hoy or date.today()
    for t in textos:
        for m in re.finditer(r"(?<![\d/-])(\d{1,2})[/-](\d{1,2})(?![\d/-])", t):
            d, mes = (int(x) for x in m.groups())
            try:
                candidata = date(hoy.year, mes, d)
            except ValueError:
                continue
            return candidata if candidata <= hoy else date(hoy.year - 1, mes, d)
    return None


def fecha_de(celda: Celda) -> date | None:
    if isinstance(celda, datetime):
        return celda.date()
    if isinstance(celda, date):
        return celda
    return buscar_fecha([texto(celda)])


def esta_vacia(fila: tuple[Celda, ...]) -> bool:
    return all(texto(c) == "" for c in fila)
