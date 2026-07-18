# Clinic Frontend — Asiapet Animal Hospital website

Static marketing website for Asiapet Animal Hospital (Thai). Plain HTML/CSS/JS — no build
step. Shared header/footer and contact data live in `partials.js`; icons use a self-hosted
[Lucide](https://lucide.dev) build (`lucide.min.js`).

Booking requests are sent straight to the clinic's email via [Web3Forms](https://web3forms.com)
— no backend server. (The old `Clinic_Backend` API is no longer used by the live site.)

## Run locally

Any static file server works, e.g.:

```bash
npx serve .            # or: python -m http.server 8080
```

Then open <http://localhost:3000> (or whatever port the server prints).

> **Booking form setup:** the form on `contact.html` submits to Web3Forms, which emails the
> clinic. Set the access key once: get a free key at <https://web3forms.com> (enter the clinic
> email), then replace `YOUR_WEB3FORMS_KEY` in the `<script>` at the bottom of `contact.html`.
> The key is public — safe to commit. No server, no database, no cost.

## Structure

```
index / about / services / animals / centers / articles / contact  (.html pages)
styles.css        ชุดสไตล์รวม (ธีม: แดง #E8334B / ดำอุ่น #1C1A17 / ครีม #FAF7F0)
partials.js       header + footer + เมนู + ข้อมูลติดต่อกลาง (แก้ที่เดียว เปลี่ยนทุกหน้า) + โหลด Lucide
lucide.min.js     ไอคอนเส้น (self-hosted) — ใช้ผ่าน <i data-lucide="name">
logo*.png, line-qr.png   รูปแบรนด์
```

แก้ข้อมูลติดต่อ/เมนู: `partials.js` (object `SITE` + array `NAV`) ที่เดียว.

## Theme tokens

| Token | Value | Use |
|-------|-------|-----|
| `--red` | `#E8334B` | brand / CTA / icons |
| `--ink` (`--black`) | `#1C1A17` | warm near-black — text, top bar, footer |
| `--cream` | `#FAF7F0` | page background |
| `--surface` | `#FFFDF8` | cards |

## Deploy (static host)

Upload the folder to any static host (Netlify / Vercel / Cloudflare Pages / GitHub Pages).
Set `window.CLINIC_API_URL` to your deployed backend so the booking form reaches it.
