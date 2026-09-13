FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS build
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
# Dependencias antes que el código: cambiar una línea no invalida esta capa.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY importador ./importador
RUN uv sync --frozen --no-dev

FROM python:3.12-slim-bookworm AS runtime
# uid fijo por el mismo motivo que en mostrador: los volúmenes guardan el número.
RUN groupadd -g 10001 app && useradd -u 10001 -g app -m app
WORKDIR /app
COPY --from=build --chown=app:app /app /app
ENV PATH="/app/.venv/bin:$PATH"
USER app
EXPOSE 8000
CMD ["python", "-m", "importador"]
