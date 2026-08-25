/* ตรวจว่า ID token ที่หน้าเว็บส่งมาเป็นของจริงจากไลน์
 *
 * หน้าเว็บใน LIFF เรียก liff.getIDToken() ได้ก็จริง แต่ห้ามเชื่อสิ่งที่
 * ฝั่งหน้าเว็บส่งมาเด็ดขาด ใครก็ปลอมค่าแล้วยิงเข้ามาได้
 * ต้องเอาไปให้ไลน์ยืนยันทุกครั้งว่า token นี้ออกให้ channel ของเราจริง
 *
 * ใช้ปลายทาง /oauth2/v2.1/verify แทนการถอด JWT เองด้วย JWKS
 * เพราะไลน์เช็ค aud/exp/ลายเซ็นให้ครบในคำสั่งเดียว ไม่มีอะไรให้พลาด
 */

const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export interface LineUser {
  /** LINE userId ขึ้นต้นด้วย U — ตัวเดียวกับที่ Messaging API ใช้
   *  (ตราบใดที่ LINE Login กับ Messaging API อยู่ Provider เดียวกัน) */
  sub: string;
  name?: string;
  picture?: string;
}

export class LineAuthError extends Error {}

export async function verifyLineIdToken(idToken: unknown): Promise<LineUser> {
  if (typeof idToken !== "string" || idToken.length < 20) {
    throw new LineAuthError("ไม่มี ID token");
  }

  const channelId = Deno.env.get("LINE_LOGIN_CHANNEL_ID");
  if (!channelId) {
    // ตั้ง env ไม่ครบ ถือเป็นความผิดฝั่งเรา ไม่ใช่ของผู้ใช้
    throw new Error("ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID");
  }

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  if (!res.ok) {
    throw new LineAuthError("ไลน์ปฏิเสธ token นี้");
  }

  const payload = await res.json() as Partial<LineUser> & { aud?: string };

  // เช็คซ้ำเองอีกชั้น เผื่อวันหลังปลายทางเปลี่ยนพฤติกรรม
  if (!payload.sub) throw new LineAuthError("token ไม่มี sub");
  if (payload.aud && payload.aud !== channelId) {
    throw new LineAuthError("token ออกให้ channel อื่น");
  }

  return { sub: payload.sub, name: payload.name, picture: payload.picture };
}
