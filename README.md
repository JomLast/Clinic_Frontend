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
> clinic. Set the access key once: get a free key at <https://web3forms.com> registered to
> **phoebanlang2@gmail.com**, then replace `YOUR_WEB3FORMS_KEY` in the `<script>` at the bottom
> of `contact.html`. The destination address is bound to the key at signup, not set in this
> code — changing it means updating it at web3forms.com or requesting a new key.
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
Currently live on GitHub Pages at <https://jomlast.github.io/Clinic_Frontend/>.

No backend is needed — the booking form emails the clinic via Web3Forms (see the
booking-form note above for the one-time key setup).

## Icons

Icons are Lucide, but the site ships `lucide-subset.js` (~13KB) instead of the
full `lucide.min.js` (399KB) — only the ~55 icons actually used are included.

After adding a new `data-lucide="..."` anywhere, regenerate the subset:

```bash
node tools/make-icon-subset.js
```

It scans every `.html` and `partials.js` for `data-lucide` names, pulls those
icons out of `lucide.min.js` and rewrites `lucide-subset.js`. Keep
`lucide.min.js` in the repo as the source — it is never sent to the browser.

## Search

The header search reads `search-index.json`, fetched only when the box is first
opened so it costs nothing on page load (~10KB gzipped). Regenerate it whenever
pages are added or their text changes:

```bash
node tools/make-search-index.js
```

It indexes each page's h1, meta description, headings and body text. Matching is
plain substring, which suits Thai — there are no word boundaries to tokenise on.
