/* ทดสอบ worker.js โดยไม่ต้องขึ้น Cloudflare จริง
   สวม fetch ปลอมไว้ดักว่ามันยิงอะไรไปหาไลน์บ้าง */
import worker from "./worker.js";

const ENV = { LINE_CHANNEL_ACCESS_TOKEN: "TOKEN123", TARGET_ID: "Cgroup999" };
const SITE = "https://asiapethospital.com";

let sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  sent.push({ url, auth: init.headers.authorization, body: JSON.parse(init.body) });
  return new Response("{}", { status: 200 });
};

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ผ่าน   " + name + (extra ? "  " + extra : "")); }
  else { fail++; console.log("  ตก !!  " + name + (extra ? "  " + extra : "")); }
};
const post = (path, body, origin = SITE) =>
  worker.fetch(new Request("https://w.dev" + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  }), ENV);

const BOOKING = {
  owner: "สมชาย ใจดี", phone: "0861199349", pet: "ข้าวปั้น", type: "สุนัข",
  date: "2026-09-15", time: "ช่วงเช้า", note: "ฉีดวัคซีนประจำปี",
};

console.log("\n=== CORS ===");
let r = await worker.fetch(new Request("https://w.dev/notify", {
  method: "OPTIONS", headers: { origin: SITE } }), ENV);
ok("preflight ตอบ 204", r.status === 204, "ได้ " + r.status);
ok("คืนชื่อโดเมนคลินิก", r.headers.get("access-control-allow-origin") === SITE);
ok("มี vary: origin", r.headers.get("vary") === "origin");

r = await worker.fetch(new Request("https://w.dev/notify", {
  method: "OPTIONS", headers: { origin: "https://evil.example" } }), ENV);
ok("โดเมนแปลกปลอมต้องไม่ได้รับอนุญาตเป็นชื่อตัวเอง",
   r.headers.get("access-control-allow-origin") !== "https://evil.example");

console.log("\n=== /notify ===");
sent = [];
r = await post("/notify", BOOKING, "https://evil.example");
ok("โดเมนอื่นยิงมาต้องได้ 403", r.status === 403, "ได้ " + r.status);
ok("และต้องไม่ยิงอะไรไปหาไลน์เลย", sent.length === 0, sent.length + " ครั้ง");

sent = [];
r = await post("/notify", BOOKING);
const j = await r.json();
ok("ใบจองปกติต้องได้ 200", r.status === 200 && j.ok === true, JSON.stringify(j));
ok("ยิงไปหาไลน์ 1 ครั้ง", sent.length === 1);
ok("ใช้ปลายทาง push", (sent[0] || {}).url?.endsWith("/message/push"), (sent[0] || {}).url);
ok("แนบ token ถูก", (sent[0] || {}).auth === "Bearer TOKEN123");
ok("ส่งเข้ากลุ่มที่ตั้งไว้", sent[0].body.to === "Cgroup999");
const text = sent[0].body.messages[0].text;
ok("ข้อความมีชื่อเจ้าของ", text.includes("สมชาย ใจดี"));
ok("ข้อความมีเบอร์โทร", text.includes("0861199349"));
ok("ข้อความมีอาการ", text.includes("ฉีดวัคซีนประจำปี"));
console.log("--- ข้อความที่จะเข้าไลน์จริง ---\n" + text + "\n---");

sent = [];
r = await post("/notify", { ...BOOKING, botcheck: true });
ok("บอทกรอก honeypot ต้องตอบว่าสำเร็จ (ไม่บอกว่าโดนจับได้)", r.status === 200);
ok("แต่ต้องไม่ยิงเข้าไลน์", sent.length === 0, sent.length + " ครั้ง");

sent = [];
r = await post("/notify", { ...BOOKING, note: "ก".repeat(5000) });
const longText = sent[0].body.messages[0].text;
ok("ข้อความยาวเกินต้องถูกตัด", longText.length < 900, "ยาว " + longText.length + " ตัวอักษร");
ok("และมี … ต่อท้ายให้รู้ว่าถูกตัด", longText.includes("…"));

sent = [];
r = await post("/notify", BOOKING, SITE);
ok("ช่องว่างเปล่าต้องกลายเป็น -", true);
sent = [];
await post("/notify", { ...BOOKING, pet: "", note: "" });
ok("ไม่กรอกชื่อสัตว์/อาการ ต้องขึ้นขีดแทนช่องว่าง",
   sent[0].body.messages[0].text.includes("- ·") &&
   sent[0].body.messages[0].text.includes("อาการ/บริการ: -"));

console.log("\n=== ยังไม่ได้ตั้งค่า ===");
sent = [];
r = await worker.fetch(new Request("https://w.dev/notify", {
  method: "POST", headers: { "content-type": "application/json", origin: SITE },
  body: JSON.stringify(BOOKING) }), { LINE_CHANNEL_ACCESS_TOKEN: "", TARGET_ID: "" });
ok("ยังไม่ใส่ token ต้องบอกชัดว่ายังไม่ได้ตั้งค่า", r.status === 500);
ok("และไม่ยิงไปไหน", sent.length === 0);

console.log("\n=== /line-webhook (ตัวหา ID กลุ่ม) ===");
sent = [];
r = await post("/line-webhook", {
  events: [{ replyToken: "RT1", source: { type: "group", groupId: "Cabc123" } }],
});
ok("ตอบ 200 ให้ไลน์เสมอ", r.status === 200, "ได้ " + r.status);
ok("ตอบกลับเข้าห้องนั้น", sent[0].url.endsWith("/message/reply"));
ok("บอก ID ของกลุ่มกลับไป", sent[0].body.messages[0].text.includes("Cabc123"));
console.log("--- ที่บอทจะตอบในกลุ่ม ---\n" + sent[0].body.messages[0].text + "\n---");

sent = [];
r = await post("/line-webhook", { events: [{ source: { type: "group", groupId: "Cxyz" } }] });
ok("ไม่มี replyToken ต้องไม่พยายามตอบ", sent.length === 0);

r = await worker.fetch(new Request("https://w.dev/อะไรก็ไม่รู้", { method: "POST" }), ENV);
ok("เส้นทางที่ไม่รู้จักต้องได้ 404", r.status === 404);

globalThis.fetch = realFetch;
console.log("\nผ่าน " + pass + " · ตก " + fail);
process.exit(fail ? 1 : 0);
