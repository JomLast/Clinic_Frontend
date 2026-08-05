const fs = require('fs');
const p  = require('path');
const ROOT = p.join(__dirname, '..');            // รากเว็บ (โฟลเดอร์ Clinic_Frontend)

// โหลด UMD bundle แบบ CommonJS
const exp = {};
const code = fs.readFileSync(p.join(__dirname, 'lucide-full.js'), 'utf8');
new Function('exports','module','globalThis', code)(exp, {exports: exp}, {});
const icons = exp.icons || exp;

// อ่านไอคอนที่ใช้จริงจากไฟล์เว็บ (ไม่ต้องแก้ลิสต์เอง)
const src = [
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).map(f => p.join(ROOT, f)),
  p.join(ROOT, 'assets/js/partials.js'),
].map(f => fs.readFileSync(f, 'utf8')).join('');
const used = [...new Set([...src.matchAll(/data-lucide="([a-z0-9-]+)"/g)].map(m => m[1]))].sort();
const pascal = k => k.split('-').map(w => w[0].toUpperCase()+w.slice(1)).join('');

const out = {}; const missing = [];
for (const k of used) {
  const d = icons[pascal(k)];
  if (!d) { missing.push(k); continue; }
  out[k] = d;
}
if (missing.length) { console.error('MISSING:', missing.join(',')); process.exit(1); }

const js = `/* Lucide icon subset — ${Object.keys(out).length} icons used by this site.
   Generated from lucide v1.21.0 (ISC License). Full library is ~1,982 icons / 399KB. */
(function(){
var I=${JSON.stringify(out)};
function el(t,a){var e=document.createElementNS("http://www.w3.org/2000/svg",t);
for(var k in a)e.setAttribute(k,a[k]);return e;}
window.lucide={icons:I,createIcons:function(){
var ns="http://www.w3.org/2000/svg";
document.querySelectorAll("[data-lucide]").forEach(function(n){
  if(n.tagName.toLowerCase()==="svg")return;              // แปลงแล้ว ข้าม
  var d=I[n.getAttribute("data-lucide")];if(!d)return;
  var s=document.createElementNS(ns,"svg");
  s.setAttribute("xmlns",ns);s.setAttribute("width","24");s.setAttribute("height","24");
  s.setAttribute("viewBox","0 0 24 24");s.setAttribute("fill","none");
  s.setAttribute("stroke","currentColor");s.setAttribute("stroke-width","2");
  s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");
  s.setAttribute("data-lucide",n.getAttribute("data-lucide"));
  s.setAttribute("class",("lucide lucide-"+n.getAttribute("data-lucide")+" "+(n.getAttribute("class")||"")).trim());
  if(n.getAttribute("aria-hidden"))s.setAttribute("aria-hidden",n.getAttribute("aria-hidden"));
  d.forEach(function(p){s.appendChild(el(p[0],p[1]));});
  n.parentNode.replaceChild(s,n);
});}};
})();`;
fs.writeFileSync(p.join(ROOT, 'assets/js/lucide-subset.js'), js, 'utf8');
console.log('icons:', Object.keys(out).length, '| bytes:', js.length);
