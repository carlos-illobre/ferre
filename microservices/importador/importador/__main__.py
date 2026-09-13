import uvicorn

from importador.config import PORT

uvicorn.run("importador.app:app", host="0.0.0.0", port=PORT)
