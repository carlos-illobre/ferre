# Arma las «capturas de pantalla» que llevan los tickets de ejemplo, a partir de las maquetas de Vender.
import sys, os
from PIL import Image
M, out = sys.argv[1], sys.argv[2]
V = os.path.join(M, "vender")
def g(img, name, w=None, q=78):
    if w and img.width > w:
        img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
    p = os.path.join(out, name); img.convert("RGB").save(p, "WEBP", quality=q); print(name, img.size, os.path.getsize(p)//1024, "KB")
c1 = Image.open(f"{V}/celu/variante-1-mostrador/captura.png")
g(c1, "cap-vender-celu.webp", 520)
g(c1.crop((0, 1500, 780, 1688)).copy(), "cap-celu-cobrar.webp", 600)
g(c1.crop((40, 760, 740, 1000)), "cap-celu-tarugos.webp", 600)
k1 = Image.open(f"{V}/compu/variante-1-mostrador/captura.png")
g(k1, "cap-vender-compu.webp", 1100)
g(k1.crop((480, 100, 1366, 520)), "cap-compu-cobro.webp", 900)
k2 = Image.open(f"{V}/compu/variante-2-teclado/captura.png")
g(k2.crop((232, 60, 1366, 400)), "cap-compu-cuaderno.webp", 900)
k3 = Image.open(f"{V}/compu/variante-3-estante/captura.png")
g(k3.crop((0, 60, 900, 560)), "cap-compu-estante.webp", 800)
c2 = Image.open(f"{V}/celu/variante-2-camara/captura.png")
g(c2, "cap-celu-camara.webp", 520)
