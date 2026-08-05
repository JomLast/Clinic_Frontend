/* สร้าง search-index.json จากทุกหน้าในเว็บ
   รันใหม่ทุกครั้งที่เพิ่ม/แก้หน้า:  node tools/make-search-index.js          */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..');
const SKIP = new Set(['404.html', '_footpreview.html']);

const strip = s => s
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();

const pick = (s, re) => { const m = s.match(re); return m ? strip(m[1]) : ''; };

// จัดหมวดให้ผลค้นหาอ่านง่าย
function section(f) {
  if (f.startsWith('service-') || f === 'services.html' || f === 'centers.html') return 'บริการ';
  if (f.startsWith('animal-') || f === 'animals.html') return 'สัตว์ที่เรารักษา';
  if (f.startsWith('article-') || f === 'articles.html' || f === 'vaccine.html') return 'สาระน่ารู้';
  if (f === 'shop.html') return 'เพ็ทช็อป';
  if (f === 'contact.html') return 'ติดต่อ';
  return 'ทั่วไป';
}

const docs = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.html') && !SKIP.has(x)).sort()) {
  const html = fs.readFileSync(path.join(DIR, f), 'utf8');
  const body = html.split('</head>')[1] || html;

  const title = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) || pick(html, /<title>([\s\S]*?)<\/title>/);
  const desc  = pick(html, /<meta name="description" content="([^"]*)"/);
  const heads = [...body.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map(m => strip(m[1])).filter(Boolean);
  const paras = [...body.matchAll(/<(?:p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/g)].map(m => strip(m[1])).filter(Boolean);

  // เนื้อหาที่ใช้ค้น — จำกัดความยาวไม่ให้ไฟล์ดัชนีบวม
  const text = [desc, ...heads, ...paras].join(' ').slice(0, 600);

  docs.push({ u: f, t: title, s: section(f), d: desc.slice(0, 150), x: text.toLowerCase() });
}

const out = path.join(DIR, 'search-index.json');
fs.writeFileSync(out, JSON.stringify(docs), 'utf8');
console.log(`indexed ${docs.length} pages | ${Math.round(fs.statSync(out).size / 1024)} KB`);
