# -*- coding: utf-8 -*-
"""สร้าง favicon จากโลโก้หลักของ Asiapet

รัน:  python tools/make-favicon.py

ใช้โลโก้เต็มทุกขนาด — Asiapet สีแดง + Animal hospital สีดำ พื้นหลังโปร่งใส
ไม่ได้ตัดเหลือตัว A เหมือนก่อนหน้านี้ เพราะที่ขนาดเล็กสิ่งที่คนจำได้คือ
รูปทรงและสีของโลโก้ ไม่ใช่ตัวหนังสือ

ข้อยกเว้นเดียวคือ apple-touch-icon.png
--------------------------------------
iOS ไม่รองรับพื้นโปร่งใสในไอคอนหน้าจอ มันจะถมส่วนโปร่งด้วยสีดำ
ทำให้โลโก้กลายเป็นกล่องดำ ไฟล์นั้นไฟล์เดียวจึงวางบนพื้นขาว
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
LOGO = os.path.join(ROOT, "assets", "img", "logo.png")   # โลโก้แนวนอน 2 บรรทัด
OUT  = os.path.join(ROOT, "assets", "img")
WHITE = (255, 255, 255)

FILL = 0.96          # โลโก้กินพื้นที่กี่ส่วนของกรอบ (เหลือขอบนิดเดียว)


def ink_mask(im):
    """หน้ากากของ 'หมึก' = ทุกพิกเซลที่ไม่ใช่พื้นขาว (ได้ทั้งตัวแดงและตัวดำ)
       ค่ากลาง ๆ ไล่เป็นเฉดเพื่อให้ขอบตัวอักษรไม่หยัก"""
    im = im.convert("RGB")
    m = Image.new("L", im.size, 0)
    ip, mp = im.load(), m.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b = ip[x, y]
            d = 255 - min(r, g, b)                 # ยิ่งห่างจากขาว ยิ่งทึบ
            mp[x, y] = 255 if d > 60 else (min(255, d * 4) if d > 15 else 0)
    return m


def logo_trimmed():
    """โลโก้ที่ตัดขอบขาวรอบนอกออกแล้ว พร้อมหน้ากากของมัน"""
    im = Image.open(LOGO).convert("RGBA")
    m = ink_mask(im)
    bb = m.getbbox()
    return im.crop(bb), m.crop(bb)


def icon(size, bg=None, radius=0.20, fill=FILL):
    """โลโก้กลางกรอบจัตุรัส — bg=None คือพื้นโปร่งใส"""
    im, m = logo_trimmed()
    w, h = im.size
    scale = (size * fill) / max(w, h)
    lg = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    lm = m.resize(lg.size, Image.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if bg:
        ImageDraw.Draw(canvas).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=int(size * radius), fill=bg + (255,))
    canvas.paste(lg, ((size - lg.size[0]) // 2, (size - lg.size[1]) // 2), lm)
    return canvas


def main():
    sizes = [16, 32, 48, 64, 128, 256]
    imgs = {s: icon(s) for s in sizes}

    # Pillow ตัดขนาดที่ใหญ่กว่าภาพหลักทิ้ง จึงต้องใช้ภาพใหญ่สุดเป็นภาพหลัก
    # แล้วส่งที่เหลือไปทาง append_images ให้มันจับคู่ตามขนาด
    biggest = max(sizes)
    imgs[biggest].save(os.path.join(ROOT, "favicon.ico"), format="ICO",
                       sizes=[(s, s) for s in sizes],
                       append_images=[imgs[s] for s in sizes if s != biggest])
    print("  favicon.ico            16/32/48/64/128/256  transparent")

    icon(180, bg=WHITE).save(os.path.join(OUT, "apple-touch-icon.png"), "PNG", optimize=True)
    print("  apple-touch-icon.png   180 x 180  white (iOS)")

    for n in (192, 512):
        icon(n).save(os.path.join(OUT, "icon-%d.png" % n), "PNG", optimize=True)
        print("  icon-%-3d.png           %d x %d  transparent" % (n, n, n))

    # ---- ไอคอนสำหรับผลค้นหา Google ----------------------------------
    # แยกไฟล์ออกมาต่างหากด้วยสองเหตุผล
    #
    # 1) Google เก็บแคช favicon ตาม URL ที่อยู่ของไฟล์  favicon.ico ใช้ที่อยู่
    #    เดิมมาตั้งแต่เวอร์ชันแรกที่เป็นตัว A ตัวเดียว ต่อให้เนื้อไฟล์เปลี่ยน
    #    Google ก็ยังหยิบของเก่าในแคชมาโชว์ได้อีกนาน  การให้ที่อยู่ใหม่ที่
    #    ไม่เคยถูกเก็บมาก่อนคือวิธีที่ตรงที่สุดที่จะบังคับให้มันไปโหลดใหม่
    #
    # 2) ไฟล์นี้ต้องมีพื้นทึบ ไม่ใช่พื้นโปร่งเหมือนไฟล์อื่น เพราะคำว่า
    #    Animal hospital เป็นสีดำ ถ้าพื้นโปร่งแล้วไปเจอผลค้นหาโหมดมืด
    #    บรรทัดนั้นจะหายไปกับพื้นหลังเลย
    #
    # ย่อโลโก้ลงเหลือ 0.88 เพราะบนมือถือ Google ครอปไอคอนเป็นวงกลม
    # ถ้าเต็มขอบเหมือนไฟล์อื่น ตัว A กับ t หัวท้ายจะโดนตัด
    icon(144, bg=WHITE, radius=0, fill=0.88).save(
        os.path.join(OUT, "favicon-144.png"), "PNG", optimize=True)
    print("  favicon-144.png        144 x 144  white (Google)")


if __name__ == "__main__":
    main()
