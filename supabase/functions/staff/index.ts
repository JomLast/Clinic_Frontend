/* API ฝั่งพนักงาน — ป้องกันด้วยรหัสร้านที่เก็บใน env ชื่อ STAFF_PIN
 *
 * ไม่ทำระบบบัญชีพนักงานเต็มรูปแบบ เพราะเป็นเครื่องที่ตั้งอยู่หน้าเคาน์เตอร์
 * ร้านเดียว คนไม่กี่คน  ระบบล็อกอินรายคนจะเพิ่มงานโดยไม่ได้เพิ่มความปลอดภัย
 * จริง ๆ  แต่ยังบันทึก "ใครกด" ไว้ที่ point_entries.created_by เพื่อให้ตามได้
 */

import { admin, json, preflight, normalisePhone, BadRequest, sixDigits } from "../_shared/http.ts";

/* กติกาแต้มทั้งหมดอยู่ในฐานข้อมูล ไม่ได้ฝังในโค้ดแล้ว
   ตาราง settings.baht_per_point และ point_rules
   คุณหมอแก้ตัวเลขในหน้า Supabase ได้เอง มีผลทันทีโดยไม่ต้อง deploy */
interface Rule {
  code: string; label: string; points: number;
  hint: string | null; staff_toggle: boolean; sort: number;
}

async function loadRules(db: ReturnType<typeof admin>) {
  const [rules, setting] = await Promise.all([
    db.from("point_rules").select("code, label, points, hint, staff_toggle, sort")
      .eq("active", true).order("sort"),
    db.from("settings").select("value").eq("key", "baht_per_point").maybeSingle(),
  ]);
  const bahtPerPoint = Math.max(1, parseInt(setting.data?.value ?? "100", 10) || 100);
  return { rules: (rules.data ?? []) as Rule[], bahtPerPoint };
}

/** เทียบรหัสแบบใช้เวลาคงที่ ไม่ให้เดาทีละหลักจากเวลาตอบกลับได้ */
function pinOk(given: unknown): boolean {
  const want = Deno.env.get("STAFF_PIN") ?? "";
  const got = String(given ?? "");
  if (!want || want.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    if (!pinOk(body.pin)) return json(req, { error: "รหัสร้านไม่ถูกต้อง" }, 401);

    const db = admin();
    const staffName = String(body.staffName ?? "").slice(0, 40) || "พนักงาน";

    switch (String(body.action ?? "")) {
      /* ------------------------------------------------------------- */
      case "lookup": {
        const phone = normalisePhone(body.phone);
        const { data: member } = await db
          .from("members")
          .select("id, phone, display_name, points, last_activity_at")
          .eq("phone", phone)
          .maybeSingle();

        const cfg = await loadRules(db);
        if (!member) return json(req, { found: false, phone, ...cfg });

        const [pets, pending, coupons] = await Promise.all([
          db.from("pets").select("id, name, species, emoji")
            .eq("member_id", member.id).eq("active", true),
          // รหัสผูกบัญชีที่ลูกค้าเพิ่งขอ — พนักงานอ่านให้ฟัง
          db.from("link_codes").select("code, expires_at")
            .eq("member_id", member.id).is("used_at", null)
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false }).limit(1).maybeSingle(),
          db.from("coupons").select("id, code, expires_at, rewards(name, category)")
            .eq("member_id", member.id).eq("status", "active")
            .order("expires_at", { ascending: true }),
        ]);

        return json(req, {
          found: true,
          member,
          pets: pets.data ?? [],
          pendingCode: pending.data?.code ?? null,
          coupons: coupons.data ?? [],
          ...cfg,
        });
      }

      /* -------------------------------------------------------------
         บวกแต้มจากบิล + โบนัส
         ลงเป็นหลายรายการแยกกัน ไม่รวมเป็นก้อนเดียว เพื่อให้ลูกค้าเปิดดู
         แล้วเห็นว่าแต้มแต่ละก้อนมาจากไหน ซึ่งเป็นเหตุผลที่เขาจะทำต่อ
         ------------------------------------------------------------- */
      case "award": {
        const memberId = String(body.memberId ?? "");
        if (!memberId) throw new BadRequest("ไม่ได้ระบุสมาชิก");

        const bill = Math.max(0, Math.floor(Number(body.billAmount) || 0));
        if (bill > 1_000_000) throw new BadRequest("ยอดบิลดูผิดปกติ ตรวจสอบอีกครั้ง");

        const { rules, bahtPerPoint } = await loadRules(db);

        const rows: Record<string, unknown>[] = [];
        const base = Math.floor(bill / bahtPerPoint);
        if (base > 0) {
          rows.push({
            member_id: memberId, kind: "purchase", delta: base,
            bill_amount: bill, note: "ค่าบริการ", created_by: staffName,
          });
        }
        /* วนจากกติกาในฐานข้อมูล ไม่ใช่รายการที่หน้าเว็บส่งมา
           หน้าเว็บบอกได้แค่ว่า "ติ๊กข้อไหน" ส่วนจะได้กี่แต้มระบบตัดสินเอง */
        for (const r of rules) {
          if (body.bonuses?.[r.code]) {
            rows.push({
              member_id: memberId, kind: "bonus", rule_code: r.code,
              delta: r.points, note: "โบนัส " + r.label, created_by: staffName,
            });
          }
        }
        if (!rows.length) {
          throw new BadRequest(
            "บิลนี้ไม่ได้แต้ม (ต่ำกว่า " + bahtPerPoint + " บาทและไม่มีโบนัส)");
        }

        const { error } = await db.from("point_entries").insert(rows);
        if (error) throw error;

        const { data: after } = await db
          .from("members").select("points").eq("id", memberId).single();

        return json(req, {
          gained: rows.reduce((n, r) => n + (r.delta as number), 0),
          breakdown: rows.map((r) => ({ note: r.note, delta: r.delta })),
          points: after?.points ?? null,
        });
      }

      /* -------------------------------------------------------------
         ตัดคูปอง — รับได้สองทาง

         couponId : พนักงานเห็นคูปองในหน้าสมาชิกแล้วกดใช้เลย
                    ทางนี้เป็นทางหลัก ไม่มีอะไรให้อ่านผิดหรือพิมพ์ผิด
         code     : สำรอง สำหรับตอนที่ยังไม่ได้ค้นสมาชิก
                    หรือคนที่มาแทนเจ้าของแล้วจำเบอร์ไม่ได้
         ------------------------------------------------------------- */
      case "useCoupon": {
        const couponId = body.couponId ? String(body.couponId) : null;
        const code = String(body.code ?? "").replace(/\D/g, "");
        if (!couponId && code.length !== 6) throw new BadRequest("ใส่รหัสคูปอง 6 หลัก");

        let q = db.from("coupons")
          .select("id, expires_at, members(phone, display_name), rewards(name)")
          .eq("status", "active");
        q = couponId ? q.eq("id", couponId) : q.eq("code", code);

        const { data: cp } = await q.maybeSingle();
        if (!cp) throw new BadRequest("ไม่พบคูปองนี้ หรือถูกใช้ไปแล้ว");

        if (new Date(cp.expires_at) < new Date()) {
          await db.from("coupons").update({ status: "expired" }).eq("id", cp.id);
          throw new BadRequest("คูปองนี้หมดอายุแล้ว");
        }

        /* ใส่ status ซ้ำใน where ด้วย — ถ้าพนักงานสองคนกดพร้อมกัน
           จะมีแค่คนเดียวที่ตัดติด อีกคนได้ผลลัพธ์ว่าง แล้วขึ้นว่าใช้ไปแล้ว */
        const { data: done } = await db.from("coupons")
          .update({ status: "used", used_at: new Date().toISOString(), used_by: staffName })
          .eq("id", cp.id).eq("status", "active")
          .select("id");
        if (!done || !done.length) throw new BadRequest("คูปองนี้เพิ่งถูกใช้ไป");

        return json(req, { ok: true, coupon: cp });
      }

      /* -------------------------------------------------------------
         สมัครสมาชิกให้ลูกค้าที่ยังไม่มีไลน์ หรือไม่อยากแอด

         ตัวตนของสมาชิกคือเบอร์โทรอยู่แล้ว บัญชีไลน์เป็นแค่ประตูเข้า
         สมาชิกที่ยังไม่มีประตูจึงมีได้ตามปกติ สะสมแต้มได้เต็มที่
         แค่ต้องถามพนักงานเวลาอยากรู้ยอด จนกว่าจะผูกไลน์วันหลัง
         ------------------------------------------------------------- */
      case "createMember": {
        const phone = normalisePhone(body.phone);

        const { data: existing } = await db
          .from("members").select("id").eq("phone", phone).maybeSingle();
        if (existing) throw new BadRequest("เบอร์นี้มีสมาชิกอยู่แล้ว กดค้นหาได้เลย");

        const { data: created, error } = await db
          .from("members")
          .insert({
            phone,
            display_name: body.name ? String(body.name).slice(0, 60) : null,
            note: "สมัครที่เคาน์เตอร์โดย " + staffName,
          })
          .select("id, phone, display_name, points, last_activity_at")
          .single();
        if (error) throw error;

        if (body.petName) {
          await db.from("pets").insert({
            member_id: created.id,
            name: String(body.petName).slice(0, 60),
            species: body.petSpecies ? String(body.petSpecies).slice(0, 30) : null,
          });
        }

        const { data: pets } = await db
          .from("pets").select("id, name, species, emoji").eq("member_id", created.id);

        return json(req, {
          found: true, member: created, pets: pets ?? [],
          pendingCode: null, coupons: [],
          ...(await loadRules(db)),
        });
      }

      /* -------------------------------------------------------------
         ออกรหัสผูกบัญชีไลน์ให้ลูกค้าถือกลับไป

         ใช้ได้สองกรณี
           - ลูกค้าเปิดหน้าสมาชิกค้างไว้แล้ว ส่ง subject มาด้วย → ผูกกับ
             บัญชีนั้นบัญชีเดียว ใครเอารหัสไปก็ใช้ไม่ได้
           - ลูกค้ายังไม่มีไลน์ / จะไปทำที่บ้าน → ไม่มี subject
             ให้รหัสอายุ 24 ชั่วโมง แล้วตอนใช้ต้องกรอกเบอร์ให้ตรงด้วย
             เดารหัสอย่างเดียวไม่พอ ต้องรู้เบอร์ด้วย
         ------------------------------------------------------------- */
      case "issueCode": {
        const phone = normalisePhone(body.phone);
        const subject = body.subject ? String(body.subject) : null;

        const { data: member } = await db
          .from("members").select("id").eq("phone", phone).maybeSingle();
        if (!member) throw new BadRequest("ไม่พบสมาชิกเบอร์นี้");

        const code = sixDigits();
        const hours = subject ? 0.17 : 24;   // ผูก subject แล้วไม่ต้องอายุยาว
        await db.from("link_codes").insert({
          member_id: member.id,
          subject,
          code,
          expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
        });
        return json(req, { code, hours });
      }

      default:
        throw new BadRequest("ไม่รู้จักคำสั่งนี้");
    }
  } catch (err) {
    if (err instanceof BadRequest) return json(req, { error: err.message }, 400);
    console.error(err);
    return json(req, { error: "ระบบขัดข้อง ลองใหม่อีกครั้ง" }, 500);
  }
});
