"""Arma las imágenes de la entrada de la computadora (decisión 93) a partir de las capas que pasó
Carlos (specs/007-usuarios-y-acceso/maquetas/capas/) y de una captura real de Vender en el celular.

    python tests/capturas/capturar.py vender --celu ...   # la venta, en 390 × 790 (ver más abajo)
    uv run --with pillow --with numpy python tests/capturas/entrada-compu.py tests/capturas/salida/cel-vender-celu.png
    uv run --with pillow --with numpy --with scipy python tests/capturas/entrada-compu.py --celular-con-venta

Deja en microservices/web/src/pantallas/compu/base/imagenes/:
- entrar-fondo.jpg: las formas del fondo, la foto del local y la mesa, sin el celular.
- entrar-celular.png: el celular de la capa, con la captura de la venta puesta en perspectiva
  sobre su pantalla. Se vuelve a generar cuando cambia la pantalla de Vender.

La captura se saca con la venta en curso (un candado y un disco de corte), sin el marco de
«Ambiente de prueba» y en 390 × 790, que es la forma de la pantalla del celular de la capa.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[2]
CAPAS = RAIZ / "specs/007-usuarios-y-acceso/maquetas/capas"
SALIDA = RAIZ / "microservices/web/src/pantallas/compu/base/imagenes"

# Las capas miden 800 × 512; la escena se arma al doble para que el celular quede nítido.
ESCALA = 2
# Dónde está la pantalla del celular en la capa (esquinas, en píxeles de la capa).
PANTALLA = [(262 + 47, 165 + 14), (262 + 172, 165 + 22), (262 + 139, 165 + 273), (262 + 13, 165 + 266)]
# El celular entero, para recortarlo de su capa.
CELULAR = (262, 165, 450, 465)


def homografia(origen, destino):
    """Los 8 coeficientes que lleva Image.transform(PERSPECTIVE) de `destino` a `origen`."""
    filas, b = [], []
    for (x, y), (u, v) in zip(destino, origen):
        filas.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        filas.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return np.linalg.solve(np.array(filas, float), np.array(b, float)).tolist()


def redondeado(tam, radio, margen=0):
    m = Image.new("L", tam, 0)
    ImageDraw.Draw(m).rounded_rectangle((margen, margen, tam[0] - 1 - margen, tam[1] - 1 - margen), radius=radio, fill=255)
    return m


def main(captura: str):
    ancho, alto = 800 * ESCALA, 512 * ESCALA
    capa = lambda n: Image.open(CAPAS / n).convert("RGBA").resize((ancho, alto), Image.LANCZOS)
    formas, celular = capa("formas-del-fondo.png"), capa("celular-y-tarjeta.png")
    # La foto del local es una franja angosta con la mesa abajo: se estira para que llene todo el
    # hueco entre las formas, también abajo a la izquierda, donde se apoya el celular.
    franja = Image.open(CAPAS / "foto-del-local.png").convert("RGBA").crop((308, 0, 490, 458))
    foto = Image.new("RGBA", (ancho, alto), (255, 255, 255, 255))
    foto.paste(franja.resize((320 * ESCALA, alto), Image.LANCZOS), (190 * ESCALA, 0))

    # La pantalla del celular, en la escena: la captura, recortada con sus puntas redondeadas.
    venta = Image.open(captura).convert("RGBA")
    w, h = venta.size
    # La muesca del celular, arriba al centro.
    ImageDraw.Draw(venta).rounded_rectangle((w * 0.34, -40, w * 0.66, h * 0.036), radius=round(w * 0.04), fill=(5, 6, 6, 255))
    esquinas = [(x * ESCALA, y * ESCALA) for x, y in PANTALLA]
    coef = homografia([(0, 0), (w, 0), (w, h), (0, h)], esquinas)
    pantalla = venta.transform((ancho, alto), Image.PERSPECTIVE, coef, Image.BICUBIC)
    mascara_pantalla = redondeado((w, h), round(w * 0.11)).transform((ancho, alto), Image.PERSPECTIVE, coef, Image.BICUBIC)
    # El celular entero: la pantalla agrandada lo que mide el marco.
    marco = round(w * 0.06)
    afuera = Image.new("L", (w + 2 * marco, h + 2 * marco), 0)
    afuera.paste(redondeado((w + 2 * marco, h + 2 * marco), round(w * 0.16)), (0, 0))
    coef_afuera = homografia([(-marco, -marco), (w + marco, -marco), (w + marco, h + marco), (-marco, h + marco)], esquinas)
    # La imagen del marco empieza en (-marco, -marco): se corre para que coincida.
    coef_afuera = homografia([(0, 0), (w + 2 * marco, 0), (w + 2 * marco, h + 2 * marco), (0, h + 2 * marco)],
                             [tuple(p) for p in np.array(esquinas) + (np.array(esquinas) - np.array(esquinas).mean(0)) * (marco / (w / 2))])
    mascara_celular = afuera.transform((ancho, alto), Image.PERSPECTIVE, coef_afuera, Image.BICUBIC).filter(ImageFilter.MaxFilter(15))
    x0, y0, x1, y1 = (c * ESCALA for c in CELULAR)
    caja = Image.new("L", (ancho, alto), 0)
    ImageDraw.Draw(caja).rectangle((x0, y0, x1, y1), fill=255)
    mascara_celular = Image.fromarray(np.minimum(np.array(mascara_celular), np.array(caja)))

    # El celular: el de la capa, con la venta en la pantalla.
    solo = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    solo.paste(celular, (0, 0), mascara_celular)
    con_venta = solo.copy()
    con_venta.paste(pantalla, (0, 0), mascara_pantalla)
    # Un brillo leve sobre el vidrio.
    brillo = Image.new("RGBA", (ancho, alto), (255, 255, 255, 0))
    ImageDraw.Draw(brillo).polygon([esquinas[0], esquinas[1], (esquinas[1][0] - 60, esquinas[1][1] + 260), (esquinas[0][0] - 30, esquinas[0][1] + 200)], fill=(255, 255, 255, 22))
    con_venta = Image.alpha_composite(con_venta, Image.composite(brillo, Image.new("RGBA", (ancho, alto), (0, 0, 0, 0)), mascara_pantalla))
    SALIDA.mkdir(parents=True, exist_ok=True)
    con_venta.crop((x0, y0, x1, y1)).save(SALIDA / "entrar-celular.png", optimize=True)

    # El fondo: la foto del local debajo de las formas. El celular y la tarjeta van aparte.
    # La sombra del celular sobre la mesa va en la foto, debajo de las formas.
    sombra = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).ellipse((262 * ESCALA, 448 * ESCALA, 440 * ESCALA, 468 * ESCALA), fill=(0, 0, 0, 120))
    foto = Image.alpha_composite(foto, sombra.filter(ImageFilter.GaussianBlur(14)))
    fondo = Image.alpha_composite(foto, formas)
    fondo.convert("RGB").save(SALIDA / "entrar-fondo.jpg", quality=84)
    print("listo:", SALIDA / "entrar-fondo.jpg", SALIDA / "entrar-celular.png", "celular en", (x0, y0, x1, y1), "de", (ancho, alto))


def recortar_celular(origen: Path):
    """El celular que armó Carlos con la venta ya puesta (capas/celular-con-venta.png), sin su
    fondo. El marco es negro o gris sin color, y el fondo es verde o madera: se toma la mancha
    más grande de gris oscuro (el marco) y todo lo que queda adentro de ella."""
    from scipy import ndimage
    im = Image.open(origen).convert("RGBA")
    a = np.array(im).astype(int)
    gris = (np.abs(a[..., 0] - a[..., 1]) < 14) & (np.abs(a[..., 1] - a[..., 2]) < 14) & (a[..., :3].max(-1) < 110)
    manchas, n = ndimage.label(gris)
    marco = manchas == 1 + int(np.argmax(ndimage.sum(gris, manchas, range(1, n + 1))))
    # Arriba, el marco se toca con un pedacito del fondo: el celular empieza donde el marco ya es ancho.
    anchos = marco.sum(1)
    arriba = int(np.argmax(anchos > 60))
    marco[:arriba] = False
    adentro = np.zeros_like(marco)
    for y in range(marco.shape[0]):
        xs = np.where(marco[y])[0]
        if len(xs) > 1: adentro[y, xs.min():xs.max() + 1] = True
    adentro = ndimage.binary_erosion(adentro, iterations=1)
    mascara = Image.fromarray((adentro * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.7))
    im.putalpha(mascara)
    im.crop(im.getbbox()).save(SALIDA / "entrar-celular.png", optimize=True)
    print("listo:", SALIDA / "entrar-celular.png", im.getbbox())


if __name__ == "__main__":
    # --celular-con-venta: usa el celular que pasó Carlos (con la venta ya puesta) en vez de armarlo.
    if "--celular-con-venta" in sys.argv:
        recortar_celular(CAPAS / "celular-con-venta.png")
    else:
        main(sys.argv[1] if len(sys.argv) > 1 else str(RAIZ / "tests/capturas/salida/cel-vender-celu.png"))
