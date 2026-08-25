-- =====================================================================
--  ระบบสะสมแต้มเอเชียเพ็ท — โครงสร้างฐานข้อมูล
--  รันไฟล์นี้ครั้งเดียวใน Supabase → SQL Editor → New query → วาง → Run
--
--  หลักคิดสองข้อที่ทั้งไฟล์นี้ยึดไว้
--  --------------------------------------------------------------------
--  1) ตัวตนของสมาชิกคือ "เบอร์โทร" ไม่ใช่ "บัญชีไลน์"
--     บ้านหนึ่งหลังมีหลายคนพาสัตว์มา ถ้าผูกแต้มไว้กับบัญชีไลน์
--     ใครแอดคนนั้นได้แต้ม อีกคนเปิดดูไม่เห็นอะไรเลย
--     เบอร์โทรยังเป็นตัวเดียวกับที่ VetLast ใช้ผูกคนไข้ด้วย
--
--  2) ตาราง point_entries คือความจริง ส่วน members.points เป็นแค่ยอดที่
--     คิดไว้ล่วงหน้าให้ดึงเร็ว ๆ  ห้ามแก้ยอดตรง ๆ ต้องลงรายการเสมอ
--     (มี trigger บังคับ และมี rule ห้าม UPDATE/DELETE รายการเก่า)
--
--  ความปลอดภัย
--  --------------------------------------------------------------------
--  หน้าเว็บ "ไม่ได้" คุยกับฐานข้อมูลตรง ๆ เลย มันคุยผ่าน Edge Function
--  เท่านั้น ตารางทุกตัวจึงเปิด RLS ไว้โดยไม่มี policy ให้ anon สักข้อ
--  = ใครถือ anon key ไปก็อ่านอะไรไม่ได้ทั้งนั้น
-- =====================================================================

-- ---------------------------------------------------------------------
-- สมาชิก
-- ---------------------------------------------------------------------
create table if not exists members (
  id               uuid primary key default gen_random_uuid(),
  phone            text not null unique,           -- ตัวตนจริง ตรงกับ VetLast
  display_name     text,
  points           integer not null default 0,     -- ยอดคงเหลือ (trigger ดูแล)
  joined_at        timestamptz not null default now(),
  -- ใช้คิดวันหมดอายุ: 18 เดือน "นับจากครั้งล่าสุดที่มาใช้บริการ"
  -- ไม่ใช่นับจากวันที่ได้แต้ม เพราะลูกค้าคลินิกสัตว์บางคนมาปีละครั้ง
  -- เพื่อฉีดวัคซีน ถ้าตั้ง 12 เดือนแบบร้านทั่วไปเขาจะไม่มีวันสะสมได้เลย
  last_activity_at timestamptz not null default now(),
  note             text,
  constraint members_phone_format check (phone ~ '^0[0-9]{8,9}$')
);

comment on column members.points is
  'ยอดคงเหลือที่คิดไว้ล่วงหน้า ห้ามแก้มือ — ลง point_entries แล้ว trigger จะอัปเดตให้';

-- ---------------------------------------------------------------------
-- ประตูเข้า — ผูกได้หลายบัญชีต่อสมาชิกหนึ่งคน
-- ตอนนี้ใช้ provider='line' อย่างเดียว แต่เผื่อ 'google' ไว้แล้ว
-- วันหลังอยากเพิ่มก็แค่ insert ไม่ต้องรื้อโครงสร้าง
-- ---------------------------------------------------------------------
create table if not exists member_logins (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  provider   text not null default 'line' check (provider in ('line','google')),
  subject    text not null,                        -- LINE userId (U...)
  linked_at  timestamptz not null default now(),
  unique (provider, subject)
);
create index if not exists member_logins_member_idx on member_logins(member_id);

-- ---------------------------------------------------------------------
-- สัตว์เลี้ยง
-- ---------------------------------------------------------------------
create table if not exists pets (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  name       text not null,
  species    text,                                  -- สุนัข / แมว / กระต่าย ...
  breed      text,
  sex        text check (sex in ('m','f') or sex is null),
  birthdate  date,
  emoji      text default '🐾',
  active     boolean not null default true
);
create index if not exists pets_member_idx on pets(member_id);

-- ---------------------------------------------------------------------
-- ตารางสุขภาพที่ต้องทำ — ตัวนี้แหละที่ทำให้แต้มมีค่าทางการแพทย์
-- ---------------------------------------------------------------------
create table if not exists pet_due (
  id       uuid primary key default gen_random_uuid(),
  pet_id   uuid not null references pets(id) on delete cascade,
  kind     text not null check (kind in ('vaccine','parasite','checkup')),
  label    text not null,                           -- 'วัคซีนรวม' ฯลฯ
  due_on   date not null,
  done_on  date,
  reminded_at timestamptz                           -- กันส่งเตือนซ้ำ
);
create index if not exists pet_due_pet_idx on pet_due(pet_id);
create index if not exists pet_due_open_idx on pet_due(due_on) where done_on is null;

-- ---------------------------------------------------------------------
-- ค่าตั้งต้นของระบบ — เก็บเป็นข้อมูล ไม่ฝังในโค้ด
-- อยากเปลี่ยนอัตราแต้มก็แก้แถวเดียว ไม่ต้อง deploy ใหม่
-- ---------------------------------------------------------------------
create table if not exists settings (
  key   text primary key,
  value text not null,
  note  text
);

insert into settings (key, value, note) values
  ('baht_per_point', '100', 'ใช้บริการกี่บาทได้ 1 แต้ม'),
  ('off_peak_days',  '1,2,3,4,5', 'วันที่คิดราคาช่วงว่าง 0=อาทิตย์ ถึง 6=เสาร์'),
  ('off_peak_until', '12', 'ราคาช่วงว่างใช้ได้ถึงกี่โมง (ก่อนเที่ยง)')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- กติกาแต้มโบนัส — เก็บเป็นข้อมูลเหมือนกัน
--
-- ตอนแรกผมฝังตัวเลขพวกนี้ไว้ในโค้ด ซึ่งแปลว่าอยากเปลี่ยน +20 เป็น +30
-- ต้องแก้โค้ดแล้ว deploy ใหม่ ซึ่งคุณหมอทำเองไม่ได้
-- ย้ายมาเป็นตาราง แก้ตัวเลขในหน้า Supabase ได้เลย มีผลทันที
--
-- staff_toggle = โผล่เป็นช่องติ๊กในหน้าพนักงานไหม
--   บางข้อพนักงานติ๊กเอง (มาตามนัด) บางข้อระบบให้เอง (วันเกิด)
-- ---------------------------------------------------------------------
create table if not exists point_rules (
  code         text primary key,
  label        text not null,
  points       integer not null check (points > 0),
  hint         text,
  staff_toggle boolean not null default true,
  sort         integer not null default 0,
  active       boolean not null default true
);

insert into point_rules (code, label, points, hint, staff_toggle, sort) values
  ('ontime',   'มาตามนัดวัคซีน',            20, 'ภายใน ±7 วันจากวันนัด',        true,  10),
  ('parasite', 'ให้ยาปรสิตครบ 3 เดือนติด',  30, 'จุดที่เจ้าของหลุดบ่อยที่สุด',    true,  20),
  ('checkup',  'ตรวจสุขภาพประจำปี',         50, 'เจอโรคเร็วขึ้น ค่ารักษาถูกลง',   true,  30),
  ('weighin',  'ชั่งน้ำหนักประจำเดือน',       5, 'เดือนละครั้ง ไม่ต้องนัด',        true,  40),
  ('referral', 'แนะนำเพื่อน',               50, 'นับเมื่อเพื่อนมาใช้บริการครั้งแรก', true,  50),
  ('birthday', 'วันเกิดน้อง',               20, 'ระบบให้เอง ไม่ต้องติ๊ก',        false, 60)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- สมุดรายการแต้ม — ความจริงอยู่ที่นี่ ห้ามแก้ ห้ามลบ
-- ---------------------------------------------------------------------
create table if not exists point_entries (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  pet_id      uuid references pets(id) on delete set null,
  -- เก็บแค่ "ประเภทใหญ่" 5 อย่าง ส่วนว่าเป็นโบนัสข้อไหนไปดูที่ rule_code
  -- ทำแบบนี้เพราะกติกาโบนัสอยู่ในตาราง point_rules ซึ่งเพิ่มลบได้ตลอด
  -- ถ้าเอาชื่อโบนัสมาไว้ใน check ตรงนี้ จะเพิ่มกติกาใหม่ไม่ได้เลยถ้าไม่แก้ schema
  kind        text not null check (kind in ('purchase','bonus','redeem','expire','adjust')),
  rule_code   text references point_rules(code),    -- ใส่เฉพาะตอน kind='bonus'
  delta       integer not null check (delta <> 0),
  note        text,
  bill_amount integer,                              -- ยอดบิล ถ้า kind='purchase'
  created_at  timestamptz not null default now(),
  created_by  text                                  -- ชื่อพนักงานที่กด
);
create index if not exists point_entries_member_idx
  on point_entries(member_id, created_at desc);

-- ---------------------------------------------------------------------
-- รางวัล
--
-- off_peak_cost คือราคาช่วงที่ร้านว่าง (จ.–ศ. ก่อนเที่ยง)
-- สระกับสวนเป็นของที่มีอยู่แล้วไม่ว่าจะมีคนใช้หรือไม่ ต้นทุนต่อหัวจึงแทบศูนย์
-- การลดราคาแต้มในช่วงที่ไม่มีคนอยู่แล้วไม่ได้เสียอะไรเพิ่ม แต่ย้ายคนจาก
-- วันที่แน่นไปวันที่ว่าง และทำให้คนแต้มน้อยเอื้อมถึงรางวัลแรกได้เร็วขึ้น
-- null = ราคาเดียวตลอด
-- ---------------------------------------------------------------------
create table if not exists rewards (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  note       text,
  cost       integer not null check (cost > 0),
  off_peak_cost integer check (off_peak_cost is null or off_peak_cost > 0),
  category   text not null default 'pool'
             check (category in ('garden','pool','clinic','shop','charity','gift')),
  valid_days integer not null default 60,           -- คูปองใช้ได้กี่วันหลังแลก
  sort       integer not null default 0,
  active     boolean not null default true,
  constraint rewards_off_peak_cheaper
    check (off_peak_cost is null or off_peak_cost <= cost)
);

-- ---------------------------------------------------------------------
-- คูปองที่แลกแล้ว
-- ---------------------------------------------------------------------
create table if not exists coupons (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  reward_id  uuid not null references rewards(id),
  code       text not null,                         -- 6 หลัก ให้แจ้งที่เคาน์เตอร์
  status     text not null default 'active'
             check (status in ('active','used','expired')),
  issued_at  timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  used_by    text
);
create index if not exists coupons_member_idx on coupons(member_id, status);
-- รหัสต้องไม่ซ้ำเฉพาะในกลุ่มที่ยังใช้ได้ ของที่ใช้ไปแล้วซ้ำได้ไม่เป็นไร
create unique index if not exists coupons_active_code_idx
  on coupons(code) where status = 'active';

-- ---------------------------------------------------------------------
-- จองสระ / สวน
-- ---------------------------------------------------------------------
create table if not exists bookings (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  pet_id     uuid references pets(id) on delete set null,
  facility   text not null default 'pool' check (facility in ('pool','garden')),
  slot_at    timestamptz not null,
  coupon_id  uuid references coupons(id),           -- null = จ่ายเงินสด
  status     text not null default 'booked'
             check (status in ('booked','done','cancelled')),
  created_at timestamptz not null default now()
);
-- หนึ่งรอบรับหนึ่งตัว — กันจองชนกันที่ระดับฐานข้อมูล ไม่ใช่แค่ที่หน้าจอ
create unique index if not exists bookings_slot_idx
  on bookings(facility, slot_at) where status = 'booked';

-- ---------------------------------------------------------------------
-- รหัสยืนยันที่เคาน์เตอร์
--
-- ใช้ตอนที่มีคนอ้างเบอร์โทรที่ "มีสมาชิกอยู่แล้ว" เพื่อกันคนสวมรอย
-- เบอร์ใหม่ที่ยังไม่มีในระบบไม่ต้องใช้ เพราะไม่มีแต้มให้ขโมย
--
-- ทำแบบนี้แทน SMS OTP เพราะคลินิกมีเคาน์เตอร์จริงที่คนมายืนอยู่ตรงหน้า
-- ไม่เสียค่าส่ง และปลอดภัยกว่าด้วย เพราะต้องมาที่ร้านจริงถึงจะผูกได้
-- ---------------------------------------------------------------------
create table if not exists link_codes (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  -- ว่างได้ เพราะรหัสมีสองแบบ
  --   ลูกค้าขอเอง  → รู้ว่าเป็นบัญชีไลน์ไหน ผูก subject ไว้เลย ปลอดภัยกว่า
  --   พนักงานออกให้ → ลูกค้ายังไม่มีไลน์หรือยังไม่ได้เปิดหน้า จึงยังไม่รู้ subject
  --                   ใช้ทีหลังได้จากบัญชีไลน์ไหนก็ได้ แต่ต้องกรอกเบอร์ให้ตรงด้วย
  subject    text,
  code       text not null,                         -- 6 หลัก
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at    timestamptz
);
create index if not exists link_codes_lookup_idx on link_codes(code) where used_at is null;

-- หมายเหตุ: ไม่มีตารางพนักงาน
-- รหัสเข้าโหมดพนักงานเก็บเป็น environment variable ชื่อ STAFF_PIN
-- ไม่ได้อยู่ในฐานข้อมูล จะได้ไม่ต้องมีที่เก็บรหัสผ่านให้ต้องดูแล
-- เปลี่ยนรหัสเมื่อไหร่ก็แก้ค่า env แล้ว deploy ใหม่ ใช้เวลาไม่ถึงนาที
-- ส่วนชื่อคนที่กดจะถูกบันทึกไว้ที่ point_entries.created_by


-- =====================================================================
--  ยอดคงเหลือ — ให้ฐานข้อมูลคิดเอง ไม่ให้โค้ดฝั่งไหนคิด
-- =====================================================================
create or replace function fn_apply_point_entry()
returns trigger
language plpgsql
as $$
begin
  update members
     set points = points + new.delta,
         last_activity_at = greatest(last_activity_at, new.created_at)
   where id = new.member_id;
  return null;
end;
$$;

drop trigger if exists trg_point_entry_applied on point_entries;
create trigger trg_point_entry_applied
  after insert on point_entries
  for each row execute function fn_apply_point_entry();

-- สมุดรายการต้องแก้ไม่ได้ ไม่งั้นยอดคงเหลือกับประวัติจะเพี้ยนจากกัน
create or replace function fn_ledger_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'point_entries แก้หรือลบไม่ได้ ถ้าต้องแก้ให้ลงรายการ adjust เพิ่ม';
end;
$$;

drop trigger if exists trg_ledger_no_update on point_entries;
create trigger trg_ledger_no_update
  before update or delete on point_entries
  for each row execute function fn_ledger_is_append_only();


-- =====================================================================
--  ราคารางวัล ณ เวลานี้ — คิดจากเวลาไทยเสมอ
--  ฐานข้อมูลเดินด้วย UTC ถ้าไม่แปลงโซนก่อน ช่วง "ก่อนเที่ยง" จะเพี้ยนไป 7 ชั่วโมง
-- =====================================================================
create or replace function fn_reward_cost_now(r rewards)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now   timestamp := now() at time zone 'Asia/Bangkok';
  v_days  text;
  v_until int;
begin
  if r.off_peak_cost is null then
    return r.cost;
  end if;

  select value into v_days  from settings where key = 'off_peak_days';
  select value::int into v_until from settings where key = 'off_peak_until';

  if position(extract(dow from v_now)::int::text in coalesce(v_days, '')) > 0
     and extract(hour from v_now) < coalesce(v_until, 12) then
    return r.off_peak_cost;
  end if;
  return r.cost;
end;
$$;


-- =====================================================================
--  แคตตาล็อกรางวัลพร้อมราคา ณ ตอนนี้
--  หน้าเว็บต้องเห็นราคาเดียวกับที่ระบบจะตัดจริง ไม่งั้นจะกดแล้วเด้ง
--  off_peak = true แปลว่าตอนนี้เป็นราคาช่วงว่าง หน้าจอจะได้ขึ้นป้ายบอก
-- =====================================================================
create or replace function fn_rewards_now()
returns table (
  code text, name text, note text,
  cost integer, base_cost integer, off_peak boolean,
  category text, sort integer
)
language sql
stable
security definer
set search_path = public
as $$
  select r.code, r.name, r.note,
         fn_reward_cost_now(r),
         r.cost,
         fn_reward_cost_now(r) < r.cost,
         r.category, r.sort
    from rewards r
   where r.active
   order by r.sort;
$$;


-- =====================================================================
--  แลกรางวัล — ต้องเป็นก้อนเดียวจบ
--
--  ถ้าเช็คยอดแล้วค่อยตัดแยกกันคนละคำสั่ง ลูกค้ากดรัว ๆ สองครั้งพร้อมกัน
--  จะแลกได้สองใบทั้งที่แต้มพอใบเดียว  ฟังก์ชันนี้ล็อกแถวสมาชิกไว้ก่อน
--  แล้วค่อยทำทุกอย่าง จึงกันเคสนั้นได้จริง
-- =====================================================================
create or replace function fn_redeem(
  p_member_id uuid,
  p_reward_code text
)
returns coupons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member  members%rowtype;
  v_reward  rewards%rowtype;
  v_coupon  coupons%rowtype;
  v_cost    integer;
  v_code    text;
  v_try     int := 0;
begin
  -- ล็อกแถวสมาชิกไว้ก่อน คนอื่นที่ยิงพร้อมกันต้องรอ
  select * into v_member from members where id = p_member_id for update;
  if not found then
    raise exception 'ไม่พบสมาชิก';
  end if;

  select * into v_reward from rewards where code = p_reward_code and active;
  if not found then
    raise exception 'ไม่พบรางวัลนี้ หรือปิดใช้งานอยู่';
  end if;

  -- ราคาช่วงว่างคิดจากเวลาไทย ไม่ใช่ UTC ที่ฐานข้อมูลใช้อยู่
  -- ถ้าลืมแปลง คนไทยจะเห็นราคาถูกตอนตีห้าถึงเที่ยงคืน ซึ่งผิดหมด
  v_cost := fn_reward_cost_now(v_reward);

  if v_member.points < v_cost then
    raise exception 'แต้มไม่พอ (มี % ต้องใช้ %)', v_member.points, v_cost;
  end if;

  -- สุ่มรหัส 6 หลักที่ยังไม่ชนกับคูปองที่ใช้ได้อยู่
  loop
    v_try := v_try + 1;
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (
      select 1 from coupons where code = v_code and status = 'active'
    );
    if v_try > 50 then
      raise exception 'สุ่มรหัสคูปองไม่สำเร็จ';
    end if;
  end loop;

  insert into coupons (member_id, reward_id, code, expires_at)
  values (p_member_id, v_reward.id, v_code,
          now() + make_interval(days => v_reward.valid_days))
  returning * into v_coupon;

  insert into point_entries (member_id, kind, delta, note)
  values (p_member_id, 'redeem', -v_cost, 'แลก' || v_reward.name);

  return v_coupon;
end;
$$;


-- =====================================================================
--  ค้นหาสมาชิก — สำหรับหน้า admin
--
--  ค้นได้ทั้งเบอร์ ชื่อเจ้าของ และชื่อสัตว์ ด้วยช่องเดียว
--  เพราะเวลาลูกค้าโทรมาถามแต้ม เขามักบอกว่า "หมาชื่อข้าวปั้น"
--  ไม่ได้บอกเบอร์ และคนรับสายก็ไม่ควรต้องถามซ้ำว่าเบอร์อะไร
--
--  เบอร์ตัดอักขระที่ไม่ใช่ตัวเลขทิ้งก่อน จะได้ค้น 086-119 แล้วเจอ
-- =====================================================================
create or replace function fn_search_members(p_q text, p_limit int default 25)
returns table (
  id uuid, phone text, display_name text, points integer,
  last_activity_at timestamptz, pet_names text, login_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select coalesce(nullif(trim(p_q), ''), '')          as raw,
           regexp_replace(coalesce(p_q, ''), '\D', '', 'g') as digits
  )
  select m.id, m.phone, m.display_name, m.points, m.last_activity_at,
         (select string_agg(p.name, ' · ' order by p.name)
            from pets p where p.member_id = m.id and p.active),
         (select count(*) from member_logins l where l.member_id = m.id)
    from members m, q
   where q.raw <> ''
     and (
          (q.digits <> '' and m.phone like '%' || q.digits || '%')
       or m.display_name ilike '%' || q.raw || '%'
       or exists (select 1 from pets p
                   where p.member_id = m.id and p.name ilike '%' || q.raw || '%')
     )
   order by m.last_activity_at desc
   limit greatest(1, least(p_limit, 100));
$$;


-- =====================================================================
--  ตัวเลขรวมสำหรับหน้า admin
--
--  ตัวที่ควรจับตาที่สุดคือ points_outstanding — แต้มที่ลูกค้าถืออยู่
--  มันคือ "หนี้" ที่คลินิกต้องจ่ายคืนเป็นของรางวัลในอนาคต
--  ถ้าตัวเลขนี้โตเร็วกว่าที่ตั้งใจ แปลว่าแจกง่ายเกินไป ต้องรีบปรับกติกา
-- =====================================================================
create or replace function fn_admin_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'members',            (select count(*) from members),
    'members_with_line',  (select count(distinct member_id) from member_logins),
    'active_90d',         (select count(*) from members
                            where last_activity_at > now() - interval '90 days'),
    'points_outstanding', (select coalesce(sum(points), 0) from members),
    'issued_30d',         (select coalesce(sum(delta), 0) from point_entries
                            where delta > 0 and created_at > now() - interval '30 days'),
    'redeemed_30d',       (select coalesce(-sum(delta), 0) from point_entries
                            where kind = 'redeem' and created_at > now() - interval '30 days'),
    'coupons_active',     (select count(*) from coupons where status = 'active'),
    'coupons_used_30d',   (select count(*) from coupons
                            where status = 'used' and used_at > now() - interval '30 days'),
    'bookings_upcoming',  (select count(*) from bookings
                            where status = 'booked' and slot_at > now())
  );
$$;


-- =====================================================================
--  แต้มหมดอายุ — 18 เดือนนับจากครั้งล่าสุดที่มาใช้บริการ
--  เรียกวันละครั้งจาก Edge Function หรือ pg_cron
-- =====================================================================
create or replace function fn_expire_stale_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r       record;
begin
  for r in
    select id, points from members
     where points > 0
       and last_activity_at < now() - interval '18 months'
  loop
    insert into point_entries (member_id, kind, delta, note)
    values (r.id, 'expire', -r.points, 'ไม่มีการใช้บริการเกิน 18 เดือน');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;


-- =====================================================================
--  RLS — ปิดตายทุกตาราง
--  หน้าเว็บคุยผ่าน Edge Function เท่านั้น ซึ่งใช้ service_role
--  ที่ข้าม RLS อยู่แล้ว  การเปิด RLS โดยไม่มี policy จึงแปลว่า
--  ใครเอา anon key ไปยิงตรง ๆ จะไม่ได้อะไรกลับไปเลยสักแถว
-- =====================================================================
alter table settings      enable row level security;
alter table point_rules   enable row level security;
alter table members       enable row level security;
alter table member_logins enable row level security;
alter table pets          enable row level security;
alter table pet_due       enable row level security;
alter table point_entries enable row level security;
alter table rewards       enable row level security;
alter table coupons       enable row level security;
alter table bookings      enable row level security;
alter table link_codes    enable row level security;



-- =====================================================================
--  รางวัลตั้งต้น — ตัวเลขชุดเดียวกับที่คุยกันไว้
--  ราคาสระ/สวนยังเป็นค่าสมมติ ต้องมาแก้ให้ตรงของจริงก่อนเปิดใช้
-- =====================================================================
insert into rewards (code, name, note, cost, off_peak_cost, category, valid_days, sort) values
  -- สวน — ต้นทุนต่อหัวต่ำสุด จึงตั้งให้เอื้อมถึงง่ายที่สุด
  -- เป็นรางวัลแรกที่ลูกค้าใหม่จะได้ ซึ่งสำคัญมาก คนต้องได้ชิมของก่อนถึงจะเชื่อว่าระบบใช้ได้จริง
  ('garden1',  'ใช้สวน 1 ชั่วโมง',            'จองล่วงหน้า 1 วัน',           20,   10, 'garden',  60, 10),
  ('garden10', 'ใช้สวนไม่จำกัด 1 เดือน',      'เฉพาะ จ.–ศ.',                120,  null, 'garden',  40, 20),

  -- สระ — รางวัลหลักของทั้งระบบ
  ('swim1',    'ว่ายน้ำ 1 ครั้ง',              '45 นาที ครั้งละ 1 ตัว',       30,   15, 'pool',    60, 30),
  ('swim3',    'แพ็กว่ายน้ำ 3 ครั้ง',          'ใช้ได้ภายใน 90 วัน',          80,   45, 'pool',    90, 40),
  ('swimmo',   'ว่ายน้ำไม่จำกัด 1 เดือน',      'เฉพาะ จ.–ศ. ก่อนเที่ยง',      150, null, 'pool',    40, 50),

  -- คลินิก — ให้เฉพาะบริการเชิงป้องกัน ไม่ให้กับการรักษา
  -- ไม่งั้นระบบจะไปให้รางวัลกับการที่สัตว์ป่วยหนัก ซึ่งขัดกับงานที่หมอทำ
  ('nail',     'ตัดเล็บฟรี',                  'ทำได้เลยไม่ต้องนัด',           25, null, 'clinic',  60, 60),
  ('deworm',   'ถ่ายพยาธิฟรี',                'ตามน้ำหนักตัว',                50, null, 'clinic',  90, 70),
  ('daycare',  'ฝากเลี้ยงกลางวันฟรี 1 วัน',    'เฉพาะวันที่ยังว่าง',            60, null, 'clinic',  60, 80),
  ('checkup',  'ตรวจสุขภาพฟรี',               'ตรวจร่างกายโดยสัตวแพทย์',      90, null, 'clinic',  90, 90),

  -- เพ็ทช็อป
  ('shop100',  'ส่วนลดค่าสินค้า 100 บาท',      'ใช้กับสินค้าในร้าน',           120, null, 'shop',    90, 100),

  -- ช่วยสัตว์จร — ทางออกให้แต้มที่เหลือค้าง ไม่งั้นจะหมดอายุทิ้งเปล่า ๆ
  ('feed1',    'ค่าอาหารสัตว์จร 1 มื้อ',        'คลินิกสมทบให้เท่าตัว',          20, null, 'charity', 90, 110),
  ('vax1',     'สมทบค่าวัคซีนสัตว์จร 1 ตัว',   'ลงชื่อผู้ให้บนบอร์ดหน้าร้าน',   100, null, 'charity', 90, 120)
on conflict (code) do nothing;
