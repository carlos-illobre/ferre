import sys
from PIL import Image
from rembg import remove, new_session
src, out = sys.argv[1], sys.argv[2]
items = {
 "mecha":("17368635.jpg",(0.22,0.26,0.78,0.84)),
 "cinta-metrica":("19658254.jpg",None),
 "llave-combinada":("210881.jpg",None),
 "clavos":("190101.jpg",None),
 "tornillos":("3926784.jpg",(0.3,0.25,0.8,0.85)),
 "tarugos":("3926785.jpg",(0.05,0.0,0.75,0.55)),
 "martillo":("4919430.jpg",None),
 "pinza":("6349399.jpg",(0.42,0.3,0.95,0.9)),
 "pintura":("13606561.jpg",None),
 "lampara":("7140253.jpg",None),
 "puntas":("20874129.jpg",None),
}
sess = new_session("isnet-general-use")
for name,(f,c) in items.items():
    im = Image.open(f"{src}/{f}").convert("RGB")
    if c:
        w,h = im.size; im = im.crop((int(c[0]*w),int(c[1]*h),int(c[2]*w),int(c[3]*h)))
    cut = remove(im, session=sess)
    bb = cut.getchannel("A").point(lambda a: 255 if a>40 else 0).getbbox()
    cut = cut.crop(bb)
    S=512; pad=40
    cut.thumbnail((S-2*pad,S-2*pad), Image.LANCZOS)
    can = Image.new("RGBA",(S,S),(0,0,0,0))
    can.paste(cut,((S-cut.width)//2,(S-cut.height)//2),cut)
    can.save(f"{out}/{name}.webp", quality=88)
    print(name, cut.size)
