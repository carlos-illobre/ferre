from fastapi import FastAPI

# Todavía sin lógica de negocio: los lectores de cada proveedor llegan con los
# issues #7 a #10 y el genérico con el #22. Acá solo el arranque y el /health.
app = FastAPI(title="listas-de-proveedores", version="0.1.0")


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True}
