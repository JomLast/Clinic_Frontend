/* สร้างตารางในหน้า points.html จากค่าตั้งต้นใน supabase/schema.sql
 *
 *   node tools/make-points.js
 *
 * ทำไมต้องมี
 * ----------
 * หน้า points.html เป็นหน้าสาธารณะที่ Google เก็บได้ ต่างจากหน้าบัตรสมาชิก
 * ซึ่ง noindex และต้องล็อกอิน  ตัวเลขแต้มกับรายการรางวัลจึงต้องอยู่ใน HTML
 * จริง ๆ ไม่ใช่ให้ JavaScript สร้างตอนเปิดหน้า ไม่งั้นคำว่า "ว่ายน้ำสุนัข"
 * หรือ "สระว่ายน้ำ" จะไม่มีอยู่ในหน้าที่ Google เห็นเลยสักคำ
 *
 * และต้องดึงจาก schema.sql ที่เดียว ไม่ใช่พิมพ์ซ้ำ ไม่งั้นวันที่แก้ราคา
 * ในฐานข้อมูล หน้าเว็บสาธารณะจะกลายเป็นข้อมูลผิดโดยไม่มีใครรู้
 *
 * หมายเหตุ: อ่านจาก "ค่าตั้งต้น" ใน schema.sql ไม่ใช่จากฐานข้อมูลจริง
 * ถ้าวันหลังคุณหมอแก้ราคาในหน้า Supabase ต้องมาแก้ schema.sql ให้ตรงกัน
 * แล้วรันสคริปต์นี้ซ้ำ (หรือเปลี่ยนไปดึงจาก API ตอนนั้น)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SQL = fs.readFileSync(path.join(ROOT, "supabase", "schema.sql"), "utf8");
const FILE = path.join(ROOT, "points.html");

/* ---------- อ่านค่าจากคำสั่ง insert ----------
   แยกทีละแถวในวงเล็บ แล้วแยกทีละค่าโดยไม่ตัดตรงคอมมาที่อยู่ในเครื่องหมายคำพูด */
function parseInsert(table) {
  const re = new RegExp(
    "insert into " + table + "\\s*\\(([^)]+)\\)\\s*values([\\s\\S]*?)on conflict", "i");
  const m = SQL.match(re);
  if (!m) throw new Error("หาคำสั่ง insert ของตาราง " + table + " ไม่เจอ");

  const cols = m[1].split(",").map((c) => c.trim());
  const rows = [];
  let depth = 0, cur = "";

  for (const ch of m[2]) {
    if (ch === "(") { depth++; if (depth === 1) { cur = ""; continue; } }
    if (ch === ")") { depth--; if (depth === 0) { rows.push(cur); continue; } }
    if (depth > 0) cur += ch;
  }

  return rows.map((row) => {
    const vals = [];
    let buf = "", inStr = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === "'") {
        // '' ในสตริงคือเครื่องหมายคำพูดตัวเดียว ไม่ใช่จบสตริง
        if (inStr && row[i + 1] === "'") { buf += "'"; i++; continue; }
        inStr = !inStr; continue;
      }
      if (ch === "," && !inStr) { vals.push(buf.trim()); buf = ""; continue; }
      buf += ch;
    }
    vals.push(buf.trim());

    const out = {};
    cols.forEach((c, i) => {
      const v = vals[i];
      out[c] = v === "null" ? null
        : v === "true" ? true
        : v === "false" ? false
        : /^-?\d+$/.test(v) ? Number(v)
        : v;
    });
    return out;
  });
}

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const rules = parseInsert("point_rules").filter((r) => r.active !== false);
const rewards = parseInsert("rewards").sort((a, b) => a.sort - b.sort);

const bahtPerPoint = (() => {
  const m = SQL.match(/\('baht_per_point',\s*'(\d+)'/);
  return m ? Number(m[1]) : 100;
})();

/* ---------- ตารางวิธีได้แต้ม ---------- */
let earn =
  '<table class="pt-table"><thead><tr><th>ทำอะไร</th><th>ได้แต้ม</th></tr></thead><tbody>' +
  '<tr><td><b>ใช้บริการหรือซื้อของในร้าน</b><small>ทุก ' + bahtPerPoint + ' บาท</small></td>' +
  '<td class="pt-n">1</td></tr>';
earn += rules.map((r) =>
  '<tr><td><b>' + esc(r.label) + "</b>" +
  (r.hint ? "<small>" + esc(r.hint) + "</small>" : "") + "</td>" +
  '<td class="pt-n">' + r.points + "</td></tr>"
).join("");
earn += "</tbody></table>";

/* ---------- ตารางรางวัล แยกตามหมวด ---------- */
const CATS = [
  ["garden",  "สวนให้น้องวิ่งเล่น"],
  ["pool",    "สระว่ายน้ำ"],
  ["clinic",  "บริการในคลินิก"],
  ["shop",    "เพ็ทช็อป"],
  ["charity", "ช่วยสัตว์จรจัด"],
];

let burn = "";
for (const [cat, label] of CATS) {
  const list = rewards.filter((r) => r.category === cat);
  if (!list.length) continue;
  burn += '<h3 class="pt-cat">' + esc(label) + "</h3>" +
    '<table class="pt-table"><thead><tr><th>รางวัล</th><th>ใช้แต้ม</th></tr></thead><tbody>' +
    list.map((r) => {
      // ราคาช่วงว่างคือจุดขายของหน้านี้ ต้องเห็นชัดว่าถูกลงจริง
      const price = r.off_peak_cost
        ? '<s>' + r.cost + "</s> " + r.off_peak_cost
        : String(r.cost);
      const note = [r.note, r.off_peak_cost ? "ราคาพิเศษ จ.–ศ. ก่อนเที่ยง" : null]
        .filter(Boolean).join(" · ");
      return '<tr><td><b>' + esc(r.name) + "</b>" +
        (note ? "<small>" + esc(note) + "</small>" : "") + "</td>" +
        '<td class="pt-n">' + price + "</td></tr>";
    }).join("") +
    "</tbody></table>";
}

/* ---------- เขียนลงไฟล์ ---------- */
function inject(html, name, block) {
  const b = "<!-- " + name + ":begin -->", e = "<!-- " + name + ":end -->";
  const re = new RegExp(
    b.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&") + "[\\s\\S]*?" + e);
  if (!re.test(html)) throw new Error("ไม่เจอ marker " + name + " ใน points.html");
  return html.replace(re, b + "\n" + block + "\n" + e);
}

let html = fs.readFileSync(FILE, "utf8");
html = inject(html, "earn", earn);
html = inject(html, "burn", burn);
fs.writeFileSync(FILE, html, "utf8");

console.log(
  "points: กติกาได้แต้ม " + (rules.length + 1) + " ข้อ | รางวัล " + rewards.length +
  " รายการ / " + CATS.filter(([c]) => rewards.some((r) => r.category === c)).length + " หมวด");
