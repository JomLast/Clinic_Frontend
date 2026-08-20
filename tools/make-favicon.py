# -*- coding: utf-8 -*-
"""สร้าง favicon จากตัว "A" ในโลโก้

รัน:  python tools/make-favicon.py

ทำไมไม่ใช้โลโก้ทั้งใบ: logo-square.png มีทั้งคำว่า Asiapet, Animal Hospital
และเงาสัตว์ 7 ตัว พอย่อเหลือ 16px จะกลายเป็นจุดสีเทามั่ว ๆ อ่านไม่ออก
ไอคอนบนแท็บต้องอ่านออกที่ 16px จึงตัดเฉพาะตัว A ซึ่งเป็นฟอนต์กลม ๆ
ที่เป็นเอกลักษณ์ของแบรนด์ แล้ววางกลับด้านเป็นตัวขาวบนพื้นแดง
(ตัวขาวบนแดงคอนทราสต์สูงกว่า อ่านออกทั้งแท็บธีมสว่างและธีมมืด)
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC  = os.path.join(ROOT, "assets", "img", "logo-square.png")
OUT  = os.path.join(ROOT, "assets", "img")
RED  = (232, 51, 75)                      # --red ของเว็บ

Y0, Y1 = 118, 208                         # แถวที่คำว่า "Asiapet" อยู่


def find_A(im):
    """หาขอบตัวอักษรตัวแรกโดยดูช่องว่างระหว่างตัวอักษร"""
    px = im.load()
    cols = []
    for x in range(0, 300):
        n = sum(1 for y in range(Y0, Y1)
                if px[x, y][0] > 150 and px[x, y][1] < 110 and px[x, y][2] < 110)
        cols.append(n)
    runs, s = [], None
    for x, n in enumerate(cols):
        if n > 0 and s is None: s = x
        if n == 0 and s is not None: runs.append((s, x - 1)); s = None
    return runs[0]


def build(size):
    im = Image.open(SRC).convert("RGB")
    x0, x1 = find_A(im)
    a = im.crop((x0 - 4, Y0 - 4, x1 + 4, Y1 + 4))

    # แปลงเป็นหน้ากาก: พิกเซลแดง = ตัวอักษร
    mask = Image.new("L", a.size, 0)
    ap, mp = a.load(), mask.load()
    for y in range(a.size[1]):
        for x in range(a.size[0]):
            r, g, b = ap[x, y]
            mp[x, y] = 255 if (r > 140 and g < 130 and b < 130) else 0

    # ย่อตัว A ให้กินราว 62% ของกรอบ เหลือขอบหายใจ
    inner = int(size * 0.62)
    w, h = a.size
    scale = inner / max(w, h)
    m = mask.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)

    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(icon)
    r = int(size * 0.22)                  # มุมมนแบบ iOS
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=RED + (255,))
    white = Image.new("RGBA", m.size, (255, 255, 255, 255))
    icon.paste(white, ((size - m.size[0]) // 2, (size - m.size[1]) // 2), m)
    return icon


def main():
    # .ico หลายขนาดในไฟล์เดียว — เบราว์เซอร์เลือกขนาดที่เหมาะเอง
    build(256).save(os.path.join(ROOT, "favicon.ico"),
                    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    for n, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        build(n).save(os.path.join(OUT, name), "PNG", optimize=True)
        print("  %-22s %d x %d" % (name, n, n))
    print("  favicon.ico            16/32/48/64/128/256")


if __name__ == "__main__":
    main()
