# -*- coding: utf-8 -*-
"""แปลงปกบทความจากไฟล์ดิบ (PNG/JPG จาก AI) เป็นไฟล์ที่ใช้บนเว็บ

รันซ้ำได้เรื่อย ๆ:  python tools/make-article-covers.py
- อ่านไฟล์ดิบทุกนามสกุลใน assets/img/articles/
- ครอปกลางให้เป็น 3:2 (ปกออกแบบมาเป็น 3:2 อยู่แล้ว ปกติจะไม่โดนตัด)
- เขียนออกเป็น 2 ขนาด (ไม่ขยายเกินต้นฉบับ)
    <slug>.jpg       สูงสุด 1536 กว้าง  ปกใหญ่ในหน้าบทความ
    <slug>-card.jpg  สูงสุด  900 กว้าง  รูปในการ์ดหน้ารวมบทความ
- ย้ายไฟล์ดิบไปไว้ใน _raw/ (gitignore) เผื่อต้องออกไฟล์ใหม่ทีหลัง
"""
import os, io
from PIL import Image, ImageOps, ImageFilter

DIR   = os.path.join(os.path.dirname(__file__), "..", "assets", "img", "articles")
# ปกใหญ่แสดงที่ 820px แต่จอมือถือ/จอ retina มี pixel ratio 2-3 เท่า
# ถ้าออกไฟล์แค่ 1200 จะเห็นเบลอบนจอพวกนั้น จึงเก็บความละเอียดเต็มของต้นฉบับไว้
HERO  = (1536, 1024)
CARD  = (900,  600)
RAW   = (".png", ".webp", ".jpeg", ".bmp", ".tif", ".tiff")
KEEP  = os.path.join(DIR, "_raw")        # เก็บไฟล์ดิบไว้ (อยู่ใน .gitignore)

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
    """ย่อแล้วชาร์ปคืน — การย่อภาพทำให้ขอบนุ่มลงเสมอ ถ้าไม่ชาร์ปคืนจะดูเบลอ
       ไม่ขยายเกินต้นฉบับ เพราะขยายแล้วยิ่งเบลอกว่าเดิม"""
    w = min(size[0], im.size[0])
    out = im.resize((w, int(w / 1.5)), Image.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=1.1, percent=72, threshold=3))
    out.save(path, "JPEG", quality=q, optimize=True, progressive=True,
             subsampling=0)          # 4:4:4 เก็บรายละเอียดสีแดงกับตัวหนังสือไว้
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

        a = save(im, os.path.join(DIR, stem + ".jpg"), HERO, 88)
        b = save(im, os.path.join(DIR, stem + "-card.jpg"), CARD, 86)
        # ย้ายไฟล์ดิบไปเก็บไว้ ไม่ลบทิ้ง — เวอร์ชันแรกของสคริปต์นี้ลบทิ้งเลย
        # แล้วพอต้องออกไฟล์ความละเอียดสูงขึ้นก็ทำไม่ได้ ต้องขอไฟล์ใหม่จากคนทำ
        os.makedirs(KEEP, exist_ok=True)
        os.replace(src, os.path.join(KEEP, fn))

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
