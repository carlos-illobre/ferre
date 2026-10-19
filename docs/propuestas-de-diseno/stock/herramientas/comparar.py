import sys
from PIL import Image, ImageDraw, ImageFont
# uso: comparar.py salida "titulo1" img1 "titulo2" img2 ...
out=sys.argv[1]; pares=list(zip(sys.argv[2::2], sys.argv[3::2]))
fuente="/tmp/claude-0/-home-user-ferre/1f0bdfe8-1b7f-5abe-8606-b593dc3334ae/scratchpad/maquetas/_comun/fuentes/manrope-latin.woff2"
imgs=[Image.open(p).convert("RGB") for _,p in pares]
esc=1
imgs=[im.resize((int(im.width*esc), int(im.height*esc))) if esc!=1 else im for im in imgs]
try:
    f=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
except Exception:
    f=ImageFont.load_default()
m=32; th=70
W=sum(i.width for i in imgs)+m*(len(imgs)+1); H=max(i.height for i in imgs)+th+m
c=Image.new("RGB",(W,H),(244,242,236)); d=ImageDraw.Draw(c); x=m
for (t,_),im in zip(pares,imgs):
    d.text((x,20),t,fill=(26,29,27),font=f); c.paste(im,(x,th)); x+=im.width+m
c.save(out, optimize=True); print(out, c.size)
