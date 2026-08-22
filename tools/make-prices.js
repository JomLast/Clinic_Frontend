/* สร้างตารางค่าบริการเป็น HTML จริงลงใน prices.html
 *
 *   node tools/make-prices.js
 *
 * ทำไมต้องมี
 * ----------
 * เดิมตารางราคาถูกสร้างด้วย JavaScript ตอนเปิดหน้าเท่านั้น ตัวไฟล์ HTML
 * ที่ส่งออกไปจึงไม่มีคำว่า "ทำหมันกระต่าย" หรือเลข "1,800" อยู่เลยสักตัว
 * ซึ่งเป็นคำที่เราอยากให้คนค้นเจอที่สุดในหน้านี้
 *
 * สคริปต์นี้อ่านตัวแปร CATS/PRICES จากในหน้านั้นเอง (แหล่งข้อมูลเดียว
 * ไม่ต้องมาไล่แก้สองที่) แล้วเขียนตารางแบบเรียงตามหมวดลงไประหว่าง
 * <!-- prices:begin --> กับ <!-- prices:end -->
 *
 * เวลาเปิดหน้าจริง JavaScript จะเขียนทับตารางนี้ทันทีที่ผู้ใช้กดกรอง
 * หรือสลับการเรียง — ของที่ฝังไว้จึงมีไว้ให้ Google และคนที่ปิด JS เห็น
 *
 * แก้ราคาที่ตัวแปร PRICES ใน prices.html แล้วรันสคริปต์นี้ซ้ำทุกครั้ง
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "prices.html");
const BEGIN = "<!-- prices:begin -->";
const END = "<!-- prices:end -->";

const html = fs.readFileSync(FILE, "utf8");

/* ดึงตัวแปรออกมาจากสคริปต์ในหน้า แล้วรันในขอบเขตของตัวเอง */
function grab(name) {
  const m = html.match(new RegExp("var\\s+" + name + "\\s*=\\s*(\\[[\\s\\S]*?\\n\\];)"));
  if (!m) throw new Error("หาตัวแปร " + name + " ใน prices.html ไม่เจอ");
  return new Function("return " + m[1].replace(/;$/, ""))();
}

const CATS = grab("CATS");
const PRICES = grab("PRICES");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const baht = (n) => n.toLocaleString("en-US");

function val(p) {
  if (p.ask) return '<span class="pr-val ask">สอบถามราคา</span>';
  const v = p.to ? baht(p.from) + "–" + baht(p.to) + "+" : baht(p.from);
  return '<span class="pr-val"><i>เริ่มต้น</i>' + v + " ฿</span>";
}

function row(p) {
  return (
    '<a class="pr-row" href="' + p.page + '">' +
    '<span class="pr-name"><b>' + esc(p.n) + "</b>" +
    (p.note ? "<small>" + esc(p.note) + "</small>" : "") +
    "</span>" + val(p) + "</a>"
  );
}

let out = "";
let n = 0;
for (const c of CATS) {
  const inCat = PRICES.filter((p) => p.cat === c.id);
  if (!inCat.length) continue;
  n += inCat.length;
  out +=
    '\n<div class="pr-group"><h2 class="pr-group-title">' +
    '<i data-lucide="' + c.icon + '" class="ico"></i> ' + esc(c.label) +
    ' <span class="n">' + inCat.length + " รายการ</span></h2>" +
    '<div class="pr-list">' + inCat.map(row).join("") + "</div></div>";
}

const block = BEGIN + out + "\n" + END;
const re = new RegExp(BEGIN.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&") + "[\\s\\S]*?" + END);
if (!re.test(html)) throw new Error("ไม่เจอ marker prices:begin/end ใน prices.html");

fs.writeFileSync(FILE, html.replace(re, block), "utf8");
console.log("prices: " + n + " รายการ / " + CATS.length + " หมวด | " + block.length + " bytes");
