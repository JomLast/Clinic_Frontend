/* ตัวช่วยเล็ก ๆ ที่ทั้งสอง function ใช้ร่วมกัน */

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* หน้าเว็บอยู่คนละโดเมนกับ Edge Function จึงต้องเปิด CORS
 * ล็อกไว้เฉพาะโดเมนของคลินิกกับ localhost ตอนพัฒนา
 * ไม่ใช้ * เพราะไม่มีเหตุผลให้เว็บอื่นยิงเข้ามาได้ */
const ALLOWED = [
  "https://asiapethospital.com",
  "https://www.asiapethospital.com",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
];

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "access-control-allow-origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "content-type": "application/json; charset=utf-8" },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === "OPTIONS" ? new Response(null, { headers: cors(req) }) : null;
}

/* CORS แบบเปิดกว้าง — ใช้กับ function ของ admin เท่านั้น
 *
 * หน้า admin ตั้งใจให้เป็นโปรแกรมแยก จะเปิดจากไฟล์ในเครื่อง จาก localhost
 * จากโฮสต์อื่น หรือฝังใน VetLast ก็ได้ ซึ่งแปลว่า origin เดาไม่ได้
 * (เปิดจากไฟล์ในเครื่อง origin จะเป็น "null" ด้วยซ้ำ)
 *
 * ปลอดภัยเพราะ CORS ไม่ใช่ด่านความปลอดภัยของเรา ด่านจริงคือ ADMIN_PIN
 * ที่ต้องส่งมาในตัวคำขอทุกครั้ง เว็บอื่นยิงมาก็ไม่รู้รหัส และเราไม่ใช้คุกกี้
 * จึงไม่มีสิทธิ์อะไรติดไปกับคำขอโดยอัตโนมัติให้ถูกขโมยใช้
 */
export function corsAny(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  };
}

export function jsonAny(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsAny(), "content-type": "application/json; charset=utf-8" },
  });
}

/* service_role ข้าม RLS ได้ — คีย์นี้อยู่ในฝั่ง server เท่านั้น
 * ห้ามหลุดไปหน้าเว็บเด็ดขาด */
export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** เบอร์ไทยให้เหลือแต่ตัวเลข แล้วเช็ครูปแบบ */
export function normalisePhone(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!/^0[0-9]{8,9}$/.test(digits)) {
    throw new BadRequest("เบอร์โทรไม่ถูกต้อง");
  }
  return digits;
}

export class BadRequest extends Error {}

export function sixDigits(): string {
  // crypto.getRandomValues ไม่ใช่ Math.random เพราะรหัสนี้ใช้ยืนยันตัวตน
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}
