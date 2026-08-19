# -*- coding: utf-8 -*-
"""แปลงปกบทความจากไฟล์ดิบ (PNG/JPG จาก AI) เป็นไฟล์ที่ใช้บนเว็บ

รันซ้ำได้เรื่อย ๆ:  python tools/make-article-covers.py
- อ่านไฟล์ดิบทุกนามสกุลใน assets/img/articles/
- ครอปกลางให้เป็น 3:2 (ปกออกแบบมาเป็น 3:2 อยู่แล้ว ปกติจะไม่โดนตัด)
- เขียนออกเป็น 2 ขนาด
    <slug>.jpg       1200x800  ใช้เป็นปกใหญ่ในหน้าบทความ
    <slug>-card.jpg   700x467  ใช้ในการ์ดหน้ารวมบทความ (โหลดเบากว่า 4 เท่า)
- ลบไฟล์ดิบทิ้ง ไม่ให้ค้างอยู่ในรีโปเป็นสิบเมกะไบต์
"""
import os, io
from PIL import Image, ImageOps

DIR   = os.path.join(os.path.dirname(__file__), "..", "assets", "img", "articles")
HERO  = (1200, 800)
CARD  = (700, 467)
RAW   = (".png", ".webp", ".jpeg", ".bmp", ".tif", ".tiff")

# ชื่อไฟล์ที่หน้าเว็บอ้างถึง — เผื่อไว้เช็คว่าตั้งชื่อถูกไหม
KNOWN = {"vaccine", "checkup", "dental", "emergency", "firstvisit", "heat",
         "neuter", "nutrition", "parasite", "rabbit-care", "senior"}


def crop32(im):
    """ครอปกลางให้ได้ 3:2 พอดี"""
    w, h = im.size
    if abs(w / h - 1.5) < 0.01:
        return im
    if w / h > 1.5:                      # กว้างเกิน -> ตัดข้าง
        nw = int(h * 1.5)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = int(w / 1.5)                    # สูงเกิน -> ตัดบน-ล่าง
    y = (h - nh) // 2
    return im.crop((0, y, w, y + nh))


def save(im, path, size, q):
    out = im.resize(size, Image.LANCZOS)
    out.save(path, "JPEG", quality=q, optimize=True, progressive=True)
    return os.path.getsize(path)


def main():
    if not os.path.isdir(DIR):
        print("ไม่เจอโฟลเดอร์", DIR)
        return

    done, skipped = [], []
    for fn in sorted(os.listdir(DIR)):
        stem, ext = os.path.splitext(fn)
        ext = ext.lower()
        if ext not in RAW:
            continue                       # .jpg ที่แปลงแล้วข้ามไป
        if stem.endswith("-card"):
            continue

        src = os.path.join(DIR, fn)
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        im = crop32(im)

        a = save(im, os.path.join(DIR, stem + ".jpg"), HERO, 84)
        b = save(im, os.path.join(DIR, stem + "-card.jpg"), CARD, 82)
        os.remove(src)

        flag = "" if stem in KNOWN else "   <- ชื่อไฟล์ไม่ตรงกับที่หน้าเว็บอ้างถึง"
        done.append("%-14s %4d KB + %3d KB%s" % (stem, a // 1024, b // 1024, flag))

    for k in sorted(KNOWN):
        if not os.path.exists(os.path.join(DIR, k + ".jpg")):
            skipped.append(k)

    print("แปลงแล้ว %d รูป" % len(done))
    for d in done:
        print("  ", d)
    if skipped:
        print("\nยังไม่มี %d รูป: %s" % (len(skipped), ", ".join(skipped)))


if __name__ == "__main__":
    main()
