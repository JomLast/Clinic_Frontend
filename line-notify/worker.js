/* ส่งใบจองจากหน้าเว็บเข้าไลน์กลุ่มพนักงาน — Cloudflare Worker
 *
 * ทำไมต้องมีตัวนี้
 * ---------------
 * การส่งข้อความเข้าไลน์ต้องใช้ Channel access token ซึ่งเป็นความลับ
 * วางไว้ในหน้าเว็บไม่ได้ เพราะใครกดดูโค้ดหน้าเว็บก็เห็น แล้วเอาไปส่ง
 * ข้อความในนามคลินิกได้ทันที  จึงต้องมีตัวกลางฝั่งเซิร์ฟเวอร์ถือ token ไว้
 * ไฟล์นี้คือตัวกลางนั้น หน้าเว็บยิงมาที่นี่ แล้วที่นี่ยิงต่อไปหาไลน์
 *
 * ทำไมใช้ Cloudflare Worker
 * ------------------------
 * คลินิกมีบัญชี Cloudflare อยู่แล้ว (ใช้ทำ DNS กับตัวนับสถิติ) ทำได้ในหน้าเว็บ
 * ล้วน ๆ ไม่ต้องลงโปรแกรมหรือใช้ command line เลย และไม่ต้องรอระบบสมาชิก
 *
 * ตั้งค่าที่ต้องใส่ใน Cloudflare (Settings > Variables — กด Encrypt ทุกอัน)
 * -------------------------------------------------------------------
 *   LINE_CHANNEL_ACCESS_TOKEN   จาก Messaging API channel
 *   TARGET_ID                   ID ของกลุ่มที่จะให้ข้อความไปลง (ดูขั้นที่ 4)
 *
 * ปลายทางที่ Worker นี้เปิดไว้
 * --------------------------
 *   POST /notify         หน้าเว็บเรียกตอนมีคนกดจอง
 *   POST /line-webhook   ตั้งเป็น Webhook URL ในไลน์ ใช้ครั้งเดียวตอนหา ID กลุ่ม
 */

/* รับเฉพาะเว็บของคลินิก ถ้าไม่จำกัด ใครก็เอา URL นี้ไปยิงข้อความใส่ไลน์ได้ */
const ALLOWED = new Set([
  "https://asiapethospital.com",
  "https://www.asiapethospital.com",
]);

function cors(origin) {
  const h = {
    /* ต้องมี vary ไม่งั้นตัวแคชกลางทางอาจเอาคำตอบของโดเมนหนึ่งไปให้อีกโดเมน */
    "vary": "origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
  if (ALLOWED.has(origin)) h["access-control-allow-origin"] = origin;
  return h;
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors(origin) },
  });
}

/* ตัดความยาวและยุบบรรทัดว่าง กันคนยิงข้อความยาวเป็นหน้า ๆ ใส่ไลน์กลุ่ม
   ไลน์รับข้อความละ 5000 ตัวอักษร ถ้าเกินจะถูกปฏิเสธทั้งฉบับ */
function clip(v, n) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "-";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function lineApi(path, token, body) {
  const res = await fetch("https://api.line.me/v2/bot/" + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + token,
    },
    body: JSON.stringify(body),
  });
  return res;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin") || "";

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    /* ---------- 1) ปลายทางของ webhook ไลน์ ----------
       ใช้ตอนหา ID ของกลุ่มเท่านั้น  พอบอทได้รับอะไรก็ตามในห้องไหน
       มันจะตอบกลับไปในห้องนั้นว่า ID คืออะไร  จะได้ไม่ต้องไปงมในหน้า
       dashboard และไม่ต้องสร้างที่เก็บข้อมูลเพิ่ม */
    if (url.pathname === "/line-webhook" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      for (const ev of body.events || []) {
        const s = ev.source || {};
        const id = s.groupId || s.roomId || s.userId;
        if (!ev.replyToken || !id) continue;
        await lineApi("message/reply", env.LINE_CHANNEL_ACCESS_TOKEN, {
          replyToken: ev.replyToken,
          messages: [{
            type: "text",
            text: "ID ของห้องนี้คือ\n" + id +
                  "\n\nเอาไปใส่เป็นค่า TARGET_ID ใน Cloudflare แล้วปิด webhook ได้เลย",
          }],
        });
      }
      /* ต้องตอบ 200 เสมอ ไม่งั้นไลน์จะนับว่าปลายทางเสียแล้วเลิกส่งให้ */
      return new Response("ok");
    }

    /* ---------- 2) ปลายทางที่หน้าเว็บเรียกตอนมีคนจอง ---------- */
    if (url.pathname === "/notify" && req.method === "POST") {
      if (!ALLOWED.has(origin)) {
        return json({ ok: false, error: "ไม่อนุญาต" }, 403, origin);
      }
      if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.TARGET_ID) {
        return json({ ok: false, error: "ยังไม่ได้ตั้งค่า token หรือ TARGET_ID" }, 500, origin);
      }

      const b = await req.json().catch(() => null);
      if (!b) return json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, 400, origin);

      /* honeypot — ช่องที่ซ่อนไว้ในฟอร์ม คนมองไม่เห็นจึงไม่กรอก
         ถ้ามีค่ามาแปลว่าเป็นบอท  ตอบว่าสำเร็จไปเฉย ๆ แต่ไม่ส่งจริง
         ถ้าตอบว่าไม่สำเร็จ บอทจะรู้ว่าโดนจับได้แล้วไปลองวิธีอื่น */
      if (b.botcheck) return json({ ok: true }, 200, origin);

      const text = [
        "🐾 จองนัดใหม่จากเว็บไซต์",
        "",
        "เจ้าของ: " + clip(b.owner, 60),
        "โทร: " + clip(b.phone, 20),
        "สัตว์เลี้ยง: " + clip(b.pet, 60) + " · " + clip(b.type, 30),
        "วันที่ขอ: " + clip(b.date, 30) + " " + clip(b.time, 30),
        "อาการ/บริการ: " + clip(b.note, 400),
      ].join("\n");

      const res = await lineApi("message/push", env.LINE_CHANNEL_ACCESS_TOKEN, {
        to: env.TARGET_ID,
        messages: [{ type: "text", text }],
      });

      if (!res.ok) {
        /* ไม่ส่งข้อความ error ของไลน์กลับไปให้หน้าเว็บ เพราะมันบอกรายละเอียด
           ภายในมากเกินไป  แต่เขียนลง log ให้ดูย้อนหลังได้ใน Cloudflare */
        console.log("push ไม่สำเร็จ " + res.status + " " + (await res.text()).slice(0, 300));
        return json({ ok: false, error: "ส่งเข้าไลน์ไม่สำเร็จ" }, 502, origin);
      }
      return json({ ok: true }, 200, origin);
    }

    return new Response("ไม่มีอะไรที่นี่", { status: 404 });
  },
};
