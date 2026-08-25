/* API สำหรับหน้า admin — คนละสิทธิ์กับหน้าพนักงานหน้าเคาน์เตอร์
 *
 * ทำไมต้องแยกรหัส
 * ---------------------------------------------------------------
 * พนักงานหน้าเคาน์เตอร์ต้องบวกแต้มและตัดคูปองได้ แต่ไม่ควรเห็นฐานลูกค้า
 * ทั้งร้าน ไม่ควรค้นชื่อใครก็ได้ และไม่ควรแก้แต้มมือ
 * รหัสของสองหน้าจึงต้องคนละตัว  ADMIN_PIN กับ STAFF_PIN
 *
 * หน้า admin เป็นโปรแกรมแยก เปิดจากไหนก็ได้ CORS จึงเปิดกว้าง
 * ด่านจริงคือรหัส ไม่ใช่ origin (ดูเหตุผลเต็มที่ _shared/http.ts)
 */

import { admin, jsonAny, corsAny, BadRequest } from "../_shared/http.ts";

function pinOk(given: unknown): boolean {
  const want = Deno.env.get("ADMIN_PIN") ?? "";
  const got = String(given ?? "");
  if (!want || want.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsAny() });

  try {
    const body = await req.json().catch(() => ({}));
    if (!pinOk(body.pin)) return jsonAny({ error: "รหัสผู้ดูแลไม่ถูกต้อง" }, 401);

    const db = admin();
    const who = String(body.adminName ?? "").slice(0, 40) || "ผู้ดูแล";

    switch (String(body.action ?? "")) {
      /* ------------------------------------------------------------- */
      case "stats": {
        const { data, error } = await db.rpc("fn_admin_stats");
        if (error) throw error;
        return jsonAny({ stats: data });
      }

      /* -------------------------------------------------------------
         ค้นด้วยช่องเดียว — เบอร์ ชื่อเจ้าของ หรือชื่อสัตว์ก็ได้
         เวลาลูกค้าโทรมาถามแต้ม เขามักบอกว่า "หมาชื่อข้าวปั้น" ไม่ใช่เบอร์
         ------------------------------------------------------------- */
      case "search": {
        const q = String(body.q ?? "").trim();
        if (q.length < 2) throw new BadRequest("พิมพ์อย่างน้อย 2 ตัวอักษร");

        const { data, error } = await db.rpc("fn_search_members", { p_q: q, p_limit: 30 });
        if (error) throw error;
        return jsonAny({ results: data ?? [], q });
      }

      /* -------------------------------------------------------------
         รายละเอียดสมาชิก — เอาประวัติมาทั้งหมด ไม่ตัดเหมือนฝั่งลูกค้า
         หน้านี้มีไว้ตอบคำถามว่า "ทำไมแต้มเหลือเท่านี้" ซึ่งต้องดูย้อนได้ยาว
         ------------------------------------------------------------- */
      case "member": {
        const id = String(body.memberId ?? "");
        if (!id) throw new BadRequest("ไม่ได้ระบุสมาชิก");

        const [member, pets, entries, coupons, bookings, logins] = await Promise.all([
          db.from("members").select("*").eq("id", id).maybeSingle(),
          db.from("pets").select("id, name, species, breed, sex, birthdate, emoji, active")
            .eq("member_id", id),
          db.from("point_entries")
            .select("kind, rule_code, delta, note, bill_amount, created_at, created_by")
            .eq("member_id", id).order("created_at", { ascending: false }).limit(200),
          db.from("coupons").select("code, status, issued_at, expires_at, used_at, used_by, rewards(name)")
            .eq("member_id", id).order("issued_at", { ascending: false }).limit(50),
          db.from("bookings").select("facility, slot_at, status")
            .eq("member_id", id).order("slot_at", { ascending: false }).limit(30),
          db.from("member_logins").select("provider, linked_at").eq("member_id", id),
        ]);

        if (!member.data) throw new BadRequest("ไม่พบสมาชิก");

        return jsonAny({
          member: member.data,
          pets: pets.data ?? [],
          entries: entries.data ?? [],
          coupons: coupons.data ?? [],
          bookings: bookings.data ?? [],
          logins: logins.data ?? [],
        });
      }

      /* -------------------------------------------------------------
         แก้แต้มมือ

         ไม่ได้แก้ยอดตรง ๆ — ลงเป็นรายการใหม่เสมอ เพราะ point_entries
         แก้ไม่ได้ลบไม่ได้ ยอดคงเหลือกับประวัติจึงตรงกันตลอด
         และบังคับให้ใส่เหตุผล ไม่งั้นอีกสามเดือนจะไม่มีใครจำได้ว่าทำไม
         ------------------------------------------------------------- */
      case "adjust": {
        const id = String(body.memberId ?? "");
        const delta = Math.trunc(Number(body.delta) || 0);
        const reason = String(body.reason ?? "").trim().slice(0, 200);

        if (!id) throw new BadRequest("ไม่ได้ระบุสมาชิก");
        if (!delta) throw new BadRequest("ใส่จำนวนแต้มที่ต้องการปรับ");
        if (Math.abs(delta) > 10000) throw new BadRequest("จำนวนดูผิดปกติ ตรวจสอบอีกครั้ง");
        if (reason.length < 3) throw new BadRequest("ต้องใส่เหตุผลด้วย");

        const { data: m } = await db.from("members").select("points").eq("id", id).maybeSingle();
        if (!m) throw new BadRequest("ไม่พบสมาชิก");
        if (m.points + delta < 0) {
          throw new BadRequest("หักแล้วแต้มจะติดลบ (ตอนนี้มี " + m.points + ")");
        }

        const { error } = await db.from("point_entries").insert({
          member_id: id, kind: "adjust", delta,
          note: reason, created_by: who,
        });
        if (error) throw error;

        const { data: after } = await db
          .from("members").select("points").eq("id", id).single();
        return jsonAny({ ok: true, points: after?.points ?? null });
      }

      default:
        throw new BadRequest("ไม่รู้จักคำสั่งนี้");
    }
  } catch (err) {
    if (err instanceof BadRequest) return jsonAny({ error: err.message }, 400);
    console.error(err);
    return jsonAny({ error: "ระบบขัดข้อง ลองใหม่อีกครั้ง" }, 500);
  }
});
