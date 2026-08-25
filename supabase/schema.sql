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
-- สมุดรายการแต้ม — ความจริงอยู่ที่นี่ ห้ามแก้ ห้ามลบ
-- ---------------------------------------------------------------------
create table if not exists point_entries (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  pet_id      uuid references pets(id) on delete set null,
  kind        text not null check (kind in (
                'purchase',    -- จากยอดบิล
                'ontime',      -- โบนัสมาตามนัด
                'parasite',    -- โบนัสให้ยาต่อเนื่อง
                'checkup',     -- โบนัสตรวจประจำปี
                'referral',    -- แนะนำเพื่อน
                'birthday',    -- ของขวัญวันเกิด
                'redeem',      -- แลกรางวัล (ติดลบ)
                'expire',      -- หมดอายุ (ติดลบ)
                'adjust'       -- แก้มือโดยพนักงาน
              )),
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
-- ---------------------------------------------------------------------
create table if not exists rewards (
  id       uuid primary key default gen_random_uuid(),
  code     text not null unique,
  name     text not null,
  note     text,
  cost     integer not null check (cost > 0),
  kind     text not null default 'pool' check (kind in ('pool','service','cash','gift')),
  valid_days integer not null default 60,           -- คูปองใช้ได้กี่วันหลังแลก
  sort     integer not null default 0,
  active   boolean not null default true
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
  subject    text not null,                         -- LINE userId ที่ขอผูก
  code       text not null,                         -- 6 หลัก
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at    timestamptz
);
create index if not exists link_codes_lookup_idx on link_codes(subject, code);

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

  if v_member.points < v_reward.cost then
    raise exception 'แต้มไม่พอ (มี % ต้องใช้ %)', v_member.points, v_reward.cost;
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
  values (p_member_id, 'redeem', -v_reward.cost, 'แลก' || v_reward.name);

  return v_coupon;
end;
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
insert into rewards (code, name, note, cost, kind, valid_days, sort) values
  ('garden',  'ใช้สวน 1 ชั่วโมง',          'จองล่วงหน้า 1 วัน',      20,  'pool',    60, 10),
  ('swim1',   'ว่ายน้ำฟรี 1 ครั้ง',         'ใช้ได้ภายใน 60 วัน',     30,  'pool',    60, 20),
  ('daycare', 'ฝากเลี้ยงกลางวันฟรี 1 วัน',  'เฉพาะวันที่ยังว่าง',      60,  'service', 60, 30),
  ('swim3',   'แพ็กว่ายน้ำ 3 ครั้ง',        'ใช้ได้ภายใน 90 วัน',     80,  'pool',    90, 40),
  ('cash200', 'ส่วนลดค่าบริการ 200 บาท',    'ใช้กับค่าบริการเท่านั้น', 250, 'cash',    90, 50)
on conflict (code) do nothing;
