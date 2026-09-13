"""Cada lector contra su muestra anonimizada (siempre) y contra la lista real de
privado/ (solo si existe en esta máquina)."""

from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from listas_de_proveedores.lectores import detectar, leer
from listas_de_proveedores.normalizado import ConfiguracionProveedor

MUESTRAS = Path(__file__).parent / "muestras"
PRIVADO = Path(__file__).resolve().parents[3] / "privado"


def muestra(nombre: str) -> bytes:
    return (MUESTRAS / nombre).read_bytes()


def test_detecta_los_cuatro_formatos():
    assert detectar(muestra("LISTA GENERAL PRUEBA 11-8.xlsx"), "LISTA GENERAL PRUEBA 11-8.xlsx") == "comodo"
    assert detectar(muestra("Lista 3GE PRUEBA 26-08-26.xlsx"), "Lista 3GE PRUEBA 26-08-26.xlsx") == "tresge"
    assert detectar(muestra("Lista ERPA PRUEBA.xlsx"), "Lista ERPA PRUEBA.xlsx") == "erpa"
    assert detectar(muestra("lista_precios_ixnova_PRUEBA_14-8-2026.xlsx"), "cualquier nombre.xlsx") == "ixnova"


def test_formato_desconocido_pide_elegir_proveedor():
    with pytest.raises(ValueError, match="Elegí el proveedor"):
        leer(muestra("Lista ERPA PRUEBA.xlsx"), "sin pistas.xlsx", ConfiguracionProveedor())


def test_comodo_aplica_descuento_de_linea_y_contado():
    lectura = leer(muestra("LISTA GENERAL PRUEBA 11-8.xlsx"), "LISTA GENERAL PRUEBA 11-8.xlsx", ConfiguracionProveedor(descuento_contado=Decimal("0.05")))
    assert lectura.resumen() == {"leidas": 4, "salteadas": 1, "ofertas": 0}
    assert lectura.fecha_lista is not None and (lectura.fecha_lista.month, lectura.fecha_lista.day) == (8, 11)
    mecha = lectura.filas[0]
    assert mecha.costo_neto == Decimal("712.5000")  # 1000 − 25 % = 750 − 5 % = 712,50
    assert [d.tipo for d in mecha.descuentos] == ["linea", "contado"]
    assert "− 25 % (linea)" in " ".join(mecha.explicacion)
    assert lectura.filas[2].costo_neto == Decimal("498.7500")  # oferta: −47,5 % y −5 %
    assert lectura.filas[3].iva == Decimal("0.105")
    assert lectura.salteadas[0].motivo == "Sin código o sin precio" or "SIN-PRECIO" in lectura.salteadas[0].contenido
    assert lectura.avisos == []  # el costo calculado coincide con el de la planilla


def test_comodo_avisa_si_el_contado_configurado_no_coincide_con_la_planilla():
    lectura = leer(muestra("LISTA GENERAL PRUEBA 11-8.xlsx"), "LISTA GENERAL PRUEBA 11-8.xlsx", ConfiguracionProveedor())
    assert lectura.avisos and "no coincide" in lectura.avisos[0]


def test_tresge_asigna_la_marca_de_la_fila_anterior_y_lee_bulto():
    lectura = leer(muestra("Lista 3GE PRUEBA 26-08-26.xlsx"), "Lista 3GE PRUEBA 26-08-26.xlsx", ConfiguracionProveedor())
    assert lectura.fecha_lista == date(2026, 8, 26)
    assert [(f.codigo_proveedor, f.marca) for f in lectura.filas] == [("U001", "MARCA UNO"), ("U002", "MARCA UNO"), ("D001", "MARCA DOS")]
    assert lectura.filas[0].cantidad_bulto == 12 and lectura.filas[0].precio_bulto == Decimal("950")


def test_tresge_quita_el_iva_si_la_configuracion_dice_que_lo_incluye():
    lectura = leer(muestra("Lista 3GE PRUEBA 26-08-26.xlsx"), "Lista 3GE PRUEBA 26-08-26.xlsx", ConfiguracionProveedor(precios_incluyen_iva=True))
    assert lectura.filas[0].costo_neto == Decimal("826.4463")  # 1000 / 1,21


def test_erpa_limpia_espacios_y_lee_codigo_de_barras_y_sugerido():
    lectura = leer(muestra("Lista ERPA PRUEBA.xlsx"), "Lista ERPA PRUEBA.xlsx", ConfiguracionProveedor())
    assert lectura.resumen()["leidas"] == 2 and lectura.resumen()["salteadas"] == 1
    fila = lectura.filas[0]
    assert fila.descripcion == "ADHESIVO DE PRUEBA BLISTER 25 ml"
    assert fila.grupo == "Adhesivo de prueba" and fila.cantidad_bulto == 24
    assert fila.codigo_barras == "7790000000017" and fila.precio_sugerido == Decimal("1600")
    assert lectura.filas[1].codigo_barras is None and lectura.filas[1].cantidad_bulto is None


def test_ixnova_lee_grupos_fecha_iva_por_fila_y_ofertas():
    lectura = leer(muestra("lista_precios_ixnova_PRUEBA_14-8-2026.xlsx"), "lista.xlsx", ConfiguracionProveedor())
    assert lectura.fecha_lista == date(2026, 8, 14)
    assert [(f.codigo_proveedor, f.grupo) for f in lectura.filas] == [("0001/1", "01- ADHESIVOS DE PRUEBA"), ("0002/1", "01- ADHESIVOS DE PRUEBA"), ("0003/1", "02- ALIMENTOS DE PRUEBA")]
    assert lectura.filas[2].iva == Decimal("0.105")
    assert len(lectura.ofertas) == 1 and lectura.ofertas[0].vigente_hasta == date(2026, 9, 1)


@pytest.mark.parametrize(
    "archivo, config, esperadas",
    [
        ("LISTA GENERAL AGOSTO 11-8.xlsx", ConfiguracionProveedor(descuento_contado=Decimal("0.05")), 7096),
        ("Lista 3GE 26-08-26.xlsx", ConfiguracionProveedor(), 2167),
        ("Lista ERPA.xlsx", ConfiguracionProveedor(), 729),
        ("lista_precios_ixnova_14-8-2026.xlsx", ConfiguracionProveedor(), 4109),
    ],
)
def test_listas_reales_completas(archivo, config, esperadas):
    ruta = PRIVADO / archivo
    if not ruta.exists():
        pytest.skip("lista real no disponible en esta máquina")
    lectura = leer(ruta.read_bytes(), archivo, config)
    assert lectura.resumen()["leidas"] == esperadas
    assert lectura.resumen()["salteadas"] == 0
    assert all(f.costo_neto > 0 and f.descripcion for f in lectura.filas)
    assert lectura.avisos == []
