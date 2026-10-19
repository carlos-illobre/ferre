# Arma los recursos de la pantalla Entrar: QR de muestra, foto del local y logotipo.
import qrcode, qrcode.image.svg
from PIL import Image, ImageFilter, ImageEnhance
import shutil, os
R = os.path.join(os.path.dirname(__file__), "..", "_recursos")
D = os.path.join(os.path.dirname(__file__), "..", "descargas")
# QR: módulos como rectángulos, sin margen; se pinta con currentColor
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0, box_size=1)
q.add_data("https://ferrebress.local/entrar/7KQ2-M9XA-4TPE"); q.make()
m = q.get_matrix(); n = len(m)
rects = "".join(f'<rect x="{x}" y="{y}" width="1.02" height="1.02"/>' for y,row in enumerate(m) for x,v in enumerate(row) if v)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges" fill="#12382F">{rects}</svg>'
open(os.path.join(R,"qr.svg"),"w").write(svg)
open(os.path.join(R,"qr-blanco.svg"),"w").write(svg.replace("#12382F","#FFFFFF"))
print("qr", n)
# Foto del local: recorte 16:9, 1600 px, suave
im = Image.open(os.path.join(D,"b.jpg")).convert("RGB")
w,h = im.size; ch = int(w*9/16); top=(h-ch)//2
im = im.crop((0,top,w,top+ch)).resize((1600,900), Image.LANCZOS)
im.filter(ImageFilter.GaussianBlur(1.2)).save(os.path.join(R,"local.webp"), quality=62)
im.resize((800,450)).filter(ImageFilter.GaussianBlur(6)).save(os.path.join(R,"local-desenfocado.webp"), quality=60)
# Logotipo (de specs/007-usuarios-y-acceso/maquetas), recortado al contenido y a 600 px
for nombre in ["logotipo-claro","logotipo-sobre-oscuro"]:
    lg = Image.open(f"/home/user/ferre/specs/007-usuarios-y-acceso/maquetas/{nombre}.png")
    lg = lg.crop(lg.getbbox()); lg.thumbnail((640,640)); lg.save(os.path.join(R,nombre+".png"), optimize=True)
    # el isotipo solo (la F), para usos chicos
    iso = lg.crop((0,0,int(lg.height*0.80),lg.height)); iso = iso.crop(iso.getbbox()); iso.save(os.path.join(R,nombre.replace("logotipo","isotipo")+".png"))
