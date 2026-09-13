import os
from pathlib import Path

os.environ.setdefault("PORT", "8000")
os.environ.setdefault("TOKEN_SERVICIO", "prueba")

from fastapi.testclient import TestClient  # noqa: E402

from listas_de_proveedores.app import app  # noqa: E402

cliente = TestClient(app)
MUESTRA = Path(__file__).parent / "muestras" / "Lista 3GE PRUEBA 26-08-26.xlsx"


def test_sin_token_de_servicio_no_lee():
    r = cliente.post("/lecturas", files={"archivo": (MUESTRA.name, MUESTRA.read_bytes())})
    assert r.status_code == 401


def test_lee_una_planilla_y_devuelve_json_normalizado():
    r = cliente.post(
        "/lecturas",
        headers={"X-Token-Servicio": "prueba"},
        files={"archivo": (MUESTRA.name, MUESTRA.read_bytes())},
        data={"precios_incluyen_iva": "false", "descuento_general": "0", "descuento_contado": "0"},
    )
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["proveedor"] == "tresge" and cuerpo["resumen"]["leidas"] == 3
    assert cuerpo["filas"][0]["costo_neto"] == "1000.0000" and cuerpo["filas"][0]["explicacion"]


def test_detecta_proveedor():
    r = cliente.post("/detecciones", headers={"X-Token-Servicio": "prueba"}, files={"archivo": (MUESTRA.name, MUESTRA.read_bytes())})
    assert r.json() == {"proveedor": "tresge"}
