# -*- coding: utf-8 -*-
"""สร้าง favicon จากโลโก้ Asiapet

รัน:  python tools/make-favicon.py

ทำไมไฟล์ .ico มีสองแบบปนกัน
--------------------------------
คำว่า "Asiapet" เต็มคำ ย่อลงเหลือ 16px แล้วอ่านไม่ออก กลายเป็นรอยเปื้อนสีแดง
แต่ที่ 48px ขึ้นไปอ่านออกชัดเจน — ซึ่ง 48px คือขนาดที่ Google ใช้แสดง
ในหน้าผลค้นหา ส่วน 16/32px คือขนาดที่เบราว์เซอร์ใช้บนแท็บ

ไฟล์ .ico เก็บภาพหลายภาพในไฟล์เดียวได้ และแต่ละภาพเป็นคนละรูปกันได้
จึงใส่ทั้งสองแบบลงไป แล้วให้แต่ละที่หยิบขนาดที่เหมาะไปใช้เอง

    16, 32 px  ->  ตัว A     (แท็บเบราว์เซอร์ บุ๊กมาร์ก ประวัติ)
    48+  px    ->  Asiapet   (ผลค้นหา Google, ไอคอนบนหน้าจอมือถือ)

ทั้งสองแบบเป็นตัวอักษรขาวบนพื้นแดงมุมมน — คอนทราสต์สูงกว่าแดงบนขาว
และไม่จมหายไปกับพื้นขาวของหน้าผลค้นหา
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
SQ   = os.path.join(ROOT, "assets", "img", "logo-square.png")   # โลโก้จัตุรัส (มีเงาสัตว์)
WORD = os.path.join(ROOT, "assets", "img", "logo.png")          # โลโก้แนวนอน 2 บรรทัด
OUT  = os.path.join(ROOT, "assets", "img")
RED  = (232, 51, 75)                      # --red ของเว็บ

Y0, Y1 = 118, 208                         # แถวที่คำว่า "Asiapet" อยู่ใน logo-square.png


# ---------- เครื่องมือร่วม ----------

def red_mask(im):
    """หน้ากากจากพิกเซลสีแดง (= ตัวอักษร Asiapet)"""
    im = im.convert("RGB")
    m = Image.new("L", im.size, 0)
    ip, mp = im.load(), m.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b = ip[x, y]
            mp[x, y] = 255 if (r > 140 and g < 130 and b < 130) else 0
    return m


def plate(mask, size, fill=0.62, radius=0.22):
    """วางหน้ากากสีขาวลงบนแผ่นแดงมุมมนขนาด size"""
    w, h = mask.size
    scale = (size * fill) / max(w, h)
    m = mask.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(icon).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * radius), fill=RED + (255,))
    white = Image.new("RGBA", m.size, (255, 255, 255, 255))
    icon.paste(white, ((size - m.size[0]) // 2, (size - m.size[1]) // 2), m)
    return icon


# ---------- แบบที่ 1: ตัว A ----------

def find_A(im):
    """หาขอบตัว A โดยดูช่องว่างระหว่างตัวอักษร"""
    px = im.convert("RGB").load()
    cols = [sum(1 for y in range(Y0, Y1)
                if px[x, y][0] > 150 and px[x, y][1] < 110 and px[x, y][2] < 110)
            for x in range(0, 300)]
    runs, s = [], None
    for x, n in enumerate(cols):
        if n > 0 and s is None: s = x
        if n == 0 and s is not None: runs.append((s, x - 1)); s = None
    return runs[0]


def mark_A():
    im = Image.open(SQ)
    x0, x1 = find_A(im)
    return red_mask(im.crop((x0 - 4, Y0 - 4, x1 + 4, Y1 + 4)))


# ---------- แบบที่ 2: คำว่า Asiapet ----------

def mark_word():
    """ตัดเฉพาะบรรทัดบน (Asiapet) จากโลโก้แนวนอน ทิ้งคำว่า Animal hospital
       เพราะบรรทัดล่างตัวเล็กกว่ามาก ย่อแล้วเละก่อนบรรทัดบนเสมอ"""
    im = Image.open(WORD)
    m = red_mask(im)
    bb = m.getbbox()                      # กรอบของคำว่า Asiapet (สีแดงล้วน)
    return m.crop(bb)


def main():
    A, W = mark_A(), mark_word()

    small = [16, 32]                      # แท็บเบราว์เซอร์ — ต้องอ่านออกที่ 16px
    big   = [48, 64, 128, 256]            # Google ใช้ 48px

    imgs = {s: plate(A, s) for s in small}
    imgs.update({s: plate(W, s, fill=0.86, radius=0.20) for s in big})

    # Pillow ตัดขนาดที่ใหญ่กว่าภาพหลักทิ้ง จึงต้องใช้ภาพใหญ่สุดเป็นภาพหลัก
    # แล้วส่งที่เหลือไปทาง append_images ให้มันจับคู่ตามขนาด
    sizes = small + big
    biggest = max(sizes)
    imgs[biggest].save(os.path.join(ROOT, "favicon.ico"), format="ICO",
                       sizes=[(s, s) for s in sizes],
                       append_images=[imgs[s] for s in sizes if s != biggest])

    # ไอคอนบนหน้าจอมือถือ — แสดงใหญ่เสมอ ใช้คำเต็มได้
    for n, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        plate(W, n, fill=0.86, radius=0.20).save(os.path.join(OUT, name), "PNG", optimize=True)
        print("  %-22s %d x %d  (Asiapet)" % (name, n, n))

    print("  favicon.ico            16/32 = A | 48/64/128/256 = Asiapet")


if __name__ == "__main__":
    main()
