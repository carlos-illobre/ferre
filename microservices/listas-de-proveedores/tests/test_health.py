import os

os.environ.setdefault("PORT", "8000")
os.environ.setdefault("TOKEN_SERVICIO", "prueba")

from fastapi.testclient import TestClient  # noqa: E402

from listas_de_proveedores.app import app  # noqa: E402


def test_health_responde_ok_y_lista_los_lectores() -> None:
    respuesta = TestClient(app).get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"ok": True, "lectores": ["comodo", "erpa", "ixnova", "tresge"]}
