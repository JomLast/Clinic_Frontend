/* ค่าตั้งต้นของระบบสมาชิก — แก้สองบรรทัดนี้แล้วใช้ได้เลย
 *
 * ทั้งสองค่าไม่ใช่ความลับ เปิดดูได้จากหน้าเว็บอยู่แล้ว จึงวางไว้ตรงนี้ได้
 * ของที่เป็นความลับจริง (service_role key, channel secret) อยู่ฝั่ง
 * Supabase เท่านั้น ไม่มีทางหลุดมาถึงไฟล์นี้
 *
 * เอาค่ามาจากไหน — ดู supabase/SETUP.md ข้อ 3.2
 */
window.ASIAPET = {
  /* LINE Developers → LINE Login channel → แท็บ LIFF → LIFF ID
     หน้าตาแบบ 2001234567-AbCdEfGh                                    */
  LIFF_ID: "PUT-LIFF-ID-HERE",

  /* Supabase → Project Settings → Data API → Project URL
     หน้าตาแบบ https://xxxxxxxx.supabase.co                            */
  SUPABASE_URL: "https://PUT-PROJECT-REF-HERE.supabase.co",
};
