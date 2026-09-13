import uvicorn

from listas_de_proveedores.config import PORT

uvicorn.run("listas_de_proveedores.app:app", host="0.0.0.0", port=PORT)
