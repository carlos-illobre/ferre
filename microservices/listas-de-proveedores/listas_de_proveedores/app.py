from decimal import Decimal, InvalidOperation

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile

from .config import TOKEN_SERVICIO
from .lectores import LECTORES, detectar, leer
from .normalizado import ConfiguracionProveedor

app = FastAPI(title="listas-de-proveedores", version="0.1.0")


def exigir_token(x_token_servicio: str = Header(default="")) -> None:
    # Solo gestion-del-local llama acá (ADR-003). Sin token, nada.
    if x_token_servicio != TOKEN_SERVICIO:
        raise HTTPException(401, "Falta o no coincide el token de servicio")


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "lectores": sorted(LECTORES)}


@app.post("/detecciones", dependencies=[Depends(exigir_token)])
async def detectar_proveedor(archivo: UploadFile = File(...)) -> dict[str, str | None]:
    return {"proveedor": detectar(await archivo.read(), archivo.filename or "")}


@app.post("/lecturas", dependencies=[Depends(exigir_token)])
async def leer_lista(
    archivo: UploadFile = File(...),
    proveedor: str | None = Form(default=None),
    precios_incluyen_iva: bool = Form(default=False),
    descuento_general: str = Form(default="0"),
    descuento_contado: str = Form(default="0"),
    iva_por_defecto: str = Form(default="0.21"),
) -> dict:
    try:
        config = ConfiguracionProveedor(
            precios_incluyen_iva=precios_incluyen_iva,
            descuento_general=Decimal(descuento_general),
            descuento_contado=Decimal(descuento_contado),
            iva_por_defecto=Decimal(iva_por_defecto),
        )
    except InvalidOperation:
        raise HTTPException(400, "Los descuentos y el IVA tienen que ser números (0.25 = 25 %)")
    try:
        lectura = leer(await archivo.read(), archivo.filename or "", config, proveedor)
    except ValueError as error:
        raise HTTPException(422, str(error))
    return lectura.como_json()
