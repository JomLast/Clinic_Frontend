# Clinic Frontend — Asiapet Animal Hospital website

Static marketing website for Asiapet Animal Hospital (Thai). Plain HTML/CSS/JS — no build
step. Shared header/footer and contact data live in `assets/js/partials.js`; icons use a
self-hosted [Lucide](https://lucide.dev) subset.

Booking requests are sent straight to the clinic's email via [Web3Forms](https://web3forms.com)
— no backend server. (The old `Clinic_Backend` API is no longer used by the live site.)

## Run locally

Any static file server works, e.g.:

```bash
npx serve .            # or: python -m http.server 8080
```

Then open <http://localhost:3000> (or whatever port the server prints).

> **Booking form setup:** the form on `contact.html` submits to Web3Forms, which emails the
> clinic. Set the access key once: get a free key at <https://web3forms.com> registered to
> **phoebanlang2@gmail.com**, then replace `YOUR_WEB3FORMS_KEY` in the `<script>` at the bottom
> of `contact.html`. The destination address is bound to the key at signup, not set in this
> code — changing it means updating it at web3forms.com or requesting a new key.
> The key is public — safe to commit. No server, no database, no cost.

## Structure

หน้าเว็บ (`.html`) ต้องอยู่ที่ราก เพราะ GitHub Pages เสิร์ฟจากรากและ URL ทุกหน้า
ถูกอ้างไว้ใน `sitemap.xml` / canonical / schema แล้ว — ย้ายเมื่อไหร่ SEO พังทันที
ส่วนไฟล์ที่เหลือแยกเป็นโฟลเดอร์:

```
*.html                    34 หน้าเว็บ (index, about, services, animals, centers, articles, contact, …)
assets/css/styles.css     ชุดสไตล์รวม (ธีม: แดง #E8334B / ดำอุ่น #1C1A17 / ครีม #FAF7F0)
assets/js/partials.js     header + footer + เมนู + ข้อมูลติดต่อกลาง (แก้ที่เดียว เปลี่ยนทุกหน้า) + ช่องค้นหา
assets/js/lucide-subset.js  ไอคอนเส้นเฉพาะที่ใช้จริง (~13KB) — ใช้ผ่าน <i data-lucide="name">
assets/img/               รูปแบรนด์ (logo*, line-qr) + animals/ + products/ (CMS อัปโหลดลงที่นี่)
data/products.json        รายการสินค้าเพ็ทช็อป (แก้ผ่านหน้า /admin ได้)
data/search-index.json    ดัชนีค้นหา (สร้างจากสคริปต์ ไม่ต้องแก้มือ)
admin/                    Decap CMS — หน้าจัดการสินค้าสำหรับคุณหมอ
tools/                    สคริปต์ build (รันตอน dev เท่านั้น ไม่ถูกส่งให้เบราว์เซอร์)
robots.txt, sitemap.xml   SEO
```

แก้ข้อมูลติดต่อ/เมนู: `assets/js/partials.js` (object `SITE` + array `NAV`) ที่เดียว.

## Theme tokens

| Token | Value | Use |
|-------|-------|-----|
| `--red` | `#E8334B` | brand / CTA / icons |
| `--ink` (`--black`) | `#1C1A17` | warm near-black — text, top bar, footer |
| `--cream` | `#FAF7F0` | page background |
| `--surface` | `#FFFDF8` | cards |

## Deploy (static host)

Upload the folder to any static host (Netlify / Vercel / Cloudflare Pages / GitHub Pages).
Currently live on GitHub Pages at <https://jomlast.github.io/Clinic_Frontend/>.

No backend is needed — the booking form emails the clinic via Web3Forms (see the
booking-form note above for the one-time key setup).

## Icons

Icons are Lucide, but the site ships `assets/js/lucide-subset.js` (~13KB) instead
of the full 399KB library — only the ~55 icons actually used are included.

After adding a new `data-lucide="..."` anywhere, regenerate the subset:

```bash
node tools/make-icon-subset.js
```

It scans every `.html` and `assets/js/partials.js` for `data-lucide` names, pulls
those icons out of `tools/lucide-full.js` and rewrites `assets/js/lucide-subset.js`.
Keep `tools/lucide-full.js` in the repo as the source — it is never sent to the browser.

## Search

The header search reads `data/search-index.json`, fetched only when the box is first
opened so it costs nothing on page load (~10KB gzipped). Regenerate it whenever
pages are added or their text changes:

```bash
node tools/make-search-index.js
```

It indexes each page's h1, meta description, headings and body text. Matching is
plain substring, which suits Thai — there are no word boundaries to tokenise on.
