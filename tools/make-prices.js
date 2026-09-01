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
 * ไม่ต้องมาไล่แก้สองที่) แล้วเขียนตารางลงไประหว่าง
 * <!-- prices:begin --> กับ <!-- prices:end -->
 *
 * เรียงตามราคาถูกไปแพง ต้องตรงกับที่ render() ในหน้าวาดเป๊ะ ๆ ไม่งั้นพอ
 * เปิดหน้ามา ตารางจะกระตุกเปลี่ยนรูปทันทีที่ JavaScript ทำงาน และ Google
 * จะเห็นหน้าคนละแบบกับที่คนเห็น
 *
 * ชื่อหมวดติดไปกับแต่ละแถวแทนการทำเป็นหัวข้อ คำว่า "ผ่าตัด & ทำหมัน"
 * จึงยังอยู่ในหน้าให้ค้นเจอเหมือนเดิม
 *
 * ของที่ฝังไว้มีไว้ให้ Google และคนที่ปิด JS เห็น
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
  // ราคาคงที่ไม่ต้องขึ้นคำว่า "เริ่มต้น" — ต้องตรงกับ valHTML ใน prices.html
  const lead = p.fix ? "" : "<i>เริ่มต้น</i>";
  return '<span class="pr-val">' + lead + v + " ฿</span>";
}

function row(p) {
  // ไม่มีหัวข้อหมวดแล้ว ชื่อหมวดจึงต้องติดไปกับแถว ไม่งั้นอ่านไม่ออกว่าอะไรอยู่หมวดไหน
  const c = CATS.find((x) => x.id === p.cat);
  const tag = c ? '<span class="pr-tag">' + esc(c.label) + "</span>" : "";
  return (
    '<a class="pr-row" href="' + p.page + '">' +
    '<span class="pr-name"><b>' + esc(p.n) + "</b>" +
    (p.note ? "<small>" + esc(p.note) + "</small>" : "") + tag +
    "</span>" + val(p) + "</a>"
  );
}

/* สอบถามราคาไม่มีตัวเลข จึงไปต่อท้ายเสมอ — ต้องตรงกับ render() ในหน้า */
const sorted = PRICES.slice().sort((a, b) => {
  if (a.ask && b.ask) return 0;
  if (a.ask) return 1;
  if (b.ask) return -1;
  return a.from - b.from;
});
const n = sorted.length;
const out = '\n<div class="pr-list">' + sorted.map(row).join("") + "</div>";

const block = BEGIN + out + "\n" + END;
const re = new RegExp(BEGIN.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&") + "[\\s\\S]*?" + END);
if (!re.test(html)) throw new Error("ไม่เจอ marker prices:begin/end ใน prices.html");

fs.writeFileSync(FILE, html.replace(re, block), "utf8");
console.log("prices: " + n + " รายการ (เรียงตามราคา) | " + block.length + " bytes");
