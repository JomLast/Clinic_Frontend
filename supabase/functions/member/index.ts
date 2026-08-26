/* API ฝั่งลูกค้า — ทุกคำสั่งต้องแนบ ID token ของไลน์มาด้วยเสมอ
 *
 * หน้าเว็บส่ง { action, idToken, ...args } มาที่ปลายทางเดียว
 * แยกเป็นหลาย function ก็ได้ แต่รวมไว้อันเดียวทำให้ deploy ทีเดียวจบ
 * และไม่ต้องไปตั้ง CORS หลายที่
 */

import { verifyLineIdToken, LineAuthError } from "../_shared/line.ts";
import { admin, json, preflight, normalisePhone, BadRequest, sixDigits } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const line = await verifyLineIdToken(body.idToken);
    const db = admin();

    /* หาสมาชิกจากบัญชีไลน์ที่ผูกไว้ */
    const { data: login } = await db
      .from("member_logins")
      .select("member_id")
      .eq("provider", "line")
      .eq("subject", line.sub)
      .maybeSingle();

    const memberId: string | null = login?.member_id ?? null;

    switch (action) {
      /* ------------------------------------------------------------- */
      case "me": {
        if (!memberId) {
          return json(req, {
            registered: false,
            profile: { name: line.name ?? null, picture: line.picture ?? null },
          });
        }
        return json(req, await loadEverything(db, memberId));
      }

      /* -------------------------------------------------------------
         สมัคร / ทวงสิทธิ์เบอร์เดิม

         เบอร์ที่ยังไม่มีในระบบ → สร้างแล้วผูกให้เลย ไม่มีอะไรให้ขโมย
         เบอร์ที่มีอยู่แล้วและมีแต้มหรือมีคนผูกไว้แล้ว → ต้องขอรหัส
         ที่เคาน์เตอร์ ไม่งั้นใครรู้เบอร์คนอื่นก็สวมรอยเอาแต้มไปได้
         ------------------------------------------------------------- */
      case "register": {
        if (memberId) return json(req, await loadEverything(db, memberId));

        const phone = normalisePhone(body.phone);
        const { data: existing } = await db
          .from("members")
          .select("id, points")
          .eq("phone", phone)
          .maybeSingle();

        if (existing) {
          const { count } = await db
            .from("member_logins")
            .select("id", { count: "exact", head: true })
            .eq("member_id", existing.id);

          const claimed = (count ?? 0) > 0 || existing.points > 0;
          if (claimed) {
            const code = sixDigits();
            await db.from("link_codes").insert({
              member_id: existing.id, subject: line.sub, code,
            });
            return json(req, { needsCounterCode: true, phone });
          }

          await db.from("member_logins").insert({
            member_id: existing.id, provider: "line", subject: line.sub,
          });
          return json(req, await loadEverything(db, existing.id));
        }

        const { data: created, error } = await db
          .from("members")
          .insert({ phone, display_name: line.name ?? null })
          .select("id")
          .single();
        if (error) throw error;

        await db.from("member_logins").insert({
          member_id: created.id, provider: "line", subject: line.sub,
        });

        if (body.petName) {
          await db.from("pets").insert({
            member_id: created.id,
            name: String(body.petName).slice(0, 60),
            species: body.petSpecies ? String(body.petSpecies).slice(0, 30) : null,
            emoji: body.petEmoji ? String(body.petEmoji).slice(0, 8) : "🐾",
          });
        }
        return json(req, await loadEverything(db, created.id));
      }

      /* -------------------------------------------------------------
         ยืนยันรหัสที่ได้จากเคาน์เตอร์

         รหัสมีสองแบบ (ดูเหตุผลที่ staff/issueCode)
           - ผูก subject ไว้แล้ว → ต้องเป็นบัญชีไลน์เดิมเท่านั้น
           - ไม่ผูก subject      → บัญชีไลน์ไหนก็ได้ แต่ต้องกรอกเบอร์ให้ตรง
             เดารหัส 6 หลักอย่างเดียวไม่พอ ต้องรู้เบอร์ของสมาชิกด้วย
         ------------------------------------------------------------- */
      case "confirmLink": {
        if (memberId) return json(req, await loadEverything(db, memberId));

        const code = String(body.code ?? "").replace(/\D/g, "");
        const phone = normalisePhone(body.phone);
        const wrong = "รหัสไม่ถูกต้องหรือหมดอายุแล้ว ขอรหัสใหม่ที่เคาน์เตอร์";
        if (code.length !== 6) throw new BadRequest(wrong);

        /* รหัสเดียวกันอาจซ้ำข้ามสมาชิกได้ จึงดึงมาทั้งหมดแล้วค่อยคัด
           อย่าใช้ maybeSingle ตรงนี้ เจอสองแถวเมื่อไหร่จะพังทันที */
        const { data: rows } = await db
          .from("link_codes")
          .select("id, member_id, subject, expires_at, members!inner(phone)")
          .eq("code", code)
          .is("used_at", null);

        const now = new Date();
        const lc = (rows ?? []).find((r) =>
          new Date(r.expires_at) > now &&
          (r.subject === null || r.subject === line.sub) &&
          // deno-lint-ignore no-explicit-any
          (r.members as any).phone === phone
        );
        if (!lc) throw new BadRequest(wrong);

        /* ใช้แล้วต้องใช้ซ้ำไม่ได้ — เช็ค used_at ใน where อีกรอบ
           ถ้ามีคนกดพร้อมกันสองครั้ง จะมีแค่ครั้งเดียวที่อัปเดตติด */
        const { data: claimed } = await db
          .from("link_codes")
          .update({ used_at: now.toISOString() })
          .eq("id", lc.id)
          .is("used_at", null)
          .select("id");
        if (!claimed || !claimed.length) throw new BadRequest(wrong);

        await db.from("member_logins").insert({
          member_id: lc.member_id, provider: "line", subject: line.sub,
        });
        return json(req, await loadEverything(db, lc.member_id));
      }

      /* ------------------------------------------------------------- */
      case "redeem": {
        if (!memberId) throw new BadRequest("ยังไม่ได้สมัครสมาชิก");
        const { data, error } = await db.rpc("fn_redeem", {
          p_member_id: memberId,
          p_reward_code: String(body.rewardCode ?? ""),
        });
        // ข้อความ raise exception จาก Postgres เป็นภาษาไทยอยู่แล้ว ส่งกลับได้เลย
        if (error) throw new BadRequest(error.message);
        return json(req, { coupon: data, ...(await loadEverything(db, memberId)) });
      }

      /* ------------------------------------------------------------- */
      case "book": {
        if (!memberId) throw new BadRequest("ยังไม่ได้สมัครสมาชิก");
        const facility = body.facility === "garden" ? "garden" : "pool";
        const slotAt = new Date(String(body.slotAt ?? ""));
        if (isNaN(slotAt.getTime())) throw new BadRequest("เวลาที่จองไม่ถูกต้อง");
        if (slotAt.getTime() < Date.now()) throw new BadRequest("จองย้อนหลังไม่ได้");

        let couponId: string | null = null;
        if (body.useCoupon) {
          const { data: cp } = await db
            .from("coupons")
            .select("id, expires_at, rewards!inner(category)")
            .eq("member_id", memberId)
            .eq("status", "active")
            .in("rewards.category", ["pool", "garden"])
            .order("expires_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (!cp) throw new BadRequest("ไม่มีคูปองที่ใช้ได้");
          couponId = cp.id;
        }

        const { data: booking, error } = await db
          .from("bookings")
          .insert({
            member_id: memberId,
            pet_id: body.petId ?? null,
            facility,
            slot_at: slotAt.toISOString(),
            coupon_id: couponId,
          })
          .select("id")
          .single();

        // ชนกับ unique index = มีคนจองรอบนี้ไปแล้วระหว่างที่กำลังกด
        if (error) {
          throw new BadRequest(
            error.code === "23505" ? "รอบนี้เพิ่งมีคนจองไป เลือกรอบอื่นนะครับ" : error.message,
          );
        }

        if (couponId) {
          await db.from("coupons")
            .update({ status: "used", used_at: new Date().toISOString(), used_by: "booking" })
            .eq("id", couponId);
        }
        return json(req, { bookingId: booking.id, ...(await loadEverything(db, memberId)) });
      }

      /* ------------------------------------------------------------- */
      case "slots": {
        const facility = body.facility === "garden" ? "garden" : "pool";
        const from = new Date(String(body.from ?? new Date().toISOString()));
        const to = new Date(from.getTime() + 14 * 864e5);
        const { data } = await db
          .from("bookings")
          .select("slot_at")
          .eq("facility", facility)
          .eq("status", "booked")
          .gte("slot_at", from.toISOString())
          .lte("slot_at", to.toISOString());
        return json(req, { taken: (data ?? []).map((r) => r.slot_at) });
      }

      default:
        throw new BadRequest("ไม่รู้จักคำสั่งนี้");
    }
  } catch (err) {
    if (err instanceof LineAuthError) return json(req, { error: err.message }, 401);
    if (err instanceof BadRequest) return json(req, { error: err.message }, 400);
    console.error(err);
    return json(req, { error: "ระบบขัดข้อง ลองใหม่อีกครั้ง" }, 500);
  }
});

/* ดึงทุกอย่างที่หน้าจอต้องใช้ในคำสั่งเดียว
 * หน้าเว็บเปิดครั้งเดียวเห็นครบ ไม่ต้องยิงหลายรอบให้ช้า */
async function loadEverything(db: ReturnType<typeof admin>, memberId: string) {
  const [member, pets, coupons, entries, rewards, bookings, rules] = await Promise.all([
    db.from("members").select("id, phone, display_name, points, last_activity_at")
      .eq("id", memberId).single(),
    db.from("pets").select("id, name, species, breed, sex, birthdate, emoji")
      .eq("member_id", memberId).eq("active", true),
    db.from("coupons").select("id, code, status, expires_at, rewards(code, name, kind)")
      .eq("member_id", memberId).eq("status", "active")
      .order("expires_at", { ascending: true }),
    db.from("point_entries").select("kind, delta, note, bill_amount, created_at")
      .eq("member_id", memberId).order("created_at", { ascending: false }).limit(20),
    /* ราคาต้องมาจากฐานข้อมูล ไม่ใช่คิดที่หน้าเว็บ
       เพราะราคาช่วงว่างขึ้นกับวันและเวลาไทย ถ้าหน้าเว็บคิดเองจะเพี้ยน
       ตามโซนเวลาของเครื่องลูกค้า แล้วกดแลกทีจะเด้งว่าแต้มไม่พอ */
    db.rpc("fn_rewards_now"),
    db.from("bookings").select("id, facility, slot_at, status")
      .eq("member_id", memberId).eq("status", "booked")
      .gte("slot_at", new Date().toISOString()).order("slot_at"),
    /* ส่งกติกาแต้มไปด้วย หน้าลูกค้าจะได้อธิบายวิธีได้แต้มจากข้อมูลจริง
       ถ้าเขียนตัวเลขตายไว้ที่หน้าเว็บ วันที่คุณหมอแก้แต้มในฐานข้อมูล
       คำอธิบายฝั่งลูกค้าจะกลายเป็นข้อมูลผิดทันทีโดยไม่มีใครรู้ */
    db.from("point_rules").select("code, label, points, hint")
      .eq("active", true).order("sort"),
  ]);

  return {
    registered: true,
    member: member.data,
    pets: pets.data ?? [],
    coupons: coupons.data ?? [],
    feed: entries.data ?? [],
    rewards: rewards.data ?? [],
    bookings: bookings.data ?? [],
    rules: rules.data ?? [],
  };
}
