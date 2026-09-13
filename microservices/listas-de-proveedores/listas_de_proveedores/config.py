import os


def obligatoria(nombre: str) -> str:
    """Sin valor por omisión: una variable ausente corta el arranque acá, que es el único
    momento en que el error es barato (invariante 3 de la skill microservicios-base)."""
    valor = os.environ.get(nombre)
    if valor is None:
        raise RuntimeError(f"Falta la variable de entorno {nombre}")
    return valor


PORT = int(obligatoria("PORT"))
TOKEN_SERVICIO = obligatoria("TOKEN_SERVICIO")
