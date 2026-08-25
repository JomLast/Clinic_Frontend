/* บัตรสมาชิกเอเชียเพ็ท — ตรรกะฝั่งหน้าเว็บ
 *
 * หน้าเดียวใช้ได้สองทาง
 *   - เปิดจากเมนูล่างในไลน์ → LIFF บอกเองว่าเป็นใคร ลูกค้าไม่ต้องล็อกอิน
 *   - เปิดจากเบราว์เซอร์ปกติ → liff.login() พาไปหน้าล็อกอินไลน์แล้วเด้งกลับ
 *
 * หน้าเว็บไม่เคยคุยกับฐานข้อมูลตรง ๆ ทุกอย่างผ่าน Edge Function ชื่อ member
 * ซึ่งเอา ID token ไปให้ไลน์ยืนยันก่อนทุกครั้ง จึงปลอมตัวเป็นคนอื่นไม่ได้
 */
(function () {
  "use strict";

  var CFG = window.ASIAPET || {};
  var API = CFG.SUPABASE_URL + "/functions/v1/member";
  var $ = function (s) { return document.querySelector(s); };

  var state = null;   // ข้อมูลทั้งก้อนที่ได้จาก action:me
  var idToken = null;
  var pendingPhone = "";

  /* ---------------- ไอคอน ---------------- */
  var I = {
    pool: '<path d="M2 15c1.6 0 1.6 1.4 3.2 1.4S6.8 15 8.4 15s1.6 1.4 3.2 1.4S13.2 15 14.8 15s1.6 1.4 3.2 1.4S19.6 15 22 15"/><path d="M7 15V5a2 2 0 1 1 4 0"/>',
    cash: '<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    star: '<path d="M12 2l2.4 6.9H22l-6 4.5 2.3 7-6.3-4.4L5.7 20.4 8 13.4 2 8.9h7.6z"/>',
    bag:  '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    vax:  '<path d="M18 2 8 12l-2 6 6-2L22 6z"/><path d="M2 22l4-1"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    box:  '<path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    garden:'<path d="M3 20h18M5 16h14"/><path d="M8 16V7a2 2 0 1 1 4 0M14 16V7a2 2 0 1 1 4 0"/><path d="M8 11h4"/>',
    paw:  '<circle cx="6" cy="9" r="2"/><circle cx="11" cy="6" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="19.5" cy="13" r="1.8"/><path d="M12.5 12c2.8 0 5 2.4 5 4.6 0 1.7-1.3 2.9-3 2.9-1 0-1.4-.4-2-.4s-1 .4-2 .4c-1.7 0-3-1.2-3-2.9C7.5 14.4 9.7 12 12.5 12z"/>'
  };
  function svg(d) { return '<svg viewBox="0 0 24 24">' + d + "</svg>"; }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------------- คุยกับหลังบ้าน ---------------- */
  function api(action, args) {
    var body = Object.assign({ action: action, idToken: idToken }, args || {});
    return fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data && data.error ? data.error : "ระบบขัดข้อง");
        return data;
      });
    });
  }

  /* ---------------- เปลี่ยนหน้า ---------------- */
  function go(id) {
    var list = document.querySelectorAll(".screen");
    for (var i = 0; i < list.length; i++) list[i].classList.toggle("on", list[i].id === id);

    var tabs = document.querySelectorAll(".tab");
    for (var j = 0; j < tabs.length; j++) {
      tabs[j].setAttribute("aria-current", tabs[j].dataset.go === id ? "true" : "false");
    }
    // แถบล่างโผล่เฉพาะตอนเป็นสมาชิกแล้ว ระหว่างสมัครยังไม่ต้องมี
    var inApp = ["s-card", "s-rewards", "s-pool", "s-pet", "s-coupons"].indexOf(id) >= 0;
    $("#tabbar").hidden = !inApp;
    var scr = document.getElementById(id);
    if (scr) scr.scrollTop = 0;
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go]");
    if (t) go(t.dataset.go);
  });

  /* ---------------- แจ้งเตือน ---------------- */
  var toastTimer;
  function toast(msg, bad) {
    $("#toastTxt").textContent = msg;
    $("#toast").classList.toggle("bad", !!bad);
    $("#toastIcon").innerHTML = bad
      ? '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>'
      : '<path d="m4 12 5 5L20 6"/>';
    $("#toast").classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $("#toast").classList.remove("on"); }, 3000);
  }

  /* ---------------- แผ่นเด้ง ---------------- */
  function sheet(html) { $("#sheet").innerHTML = html; $("#veil").classList.add("on"); }
  function closeSheet() { $("#veil").classList.remove("on"); }
  $("#veil").addEventListener("click", function (e) { if (e.target === $("#veil")) closeSheet(); });
  document.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeSheet(); });

  /* ---------------- ตัวช่วยวันที่ ---------------- */
  var TH_MON = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  var TH_DAY = ["อา","จ","อ","พ","พฤ","ศ","ส"];
  function thDate(d) { return d.getDate() + " " + TH_MON[d.getMonth()]; }
  function thDateTime(iso) {
    var d = new Date(iso);
    return thDate(d) + " " + String(d.getHours()).padStart(2, "0") + ":" +
           String(d.getMinutes()).padStart(2, "0");
  }
  function daysBetween(a, b) { return Math.round((b - a) / 864e5); }

  /* ---------------- QR ประดับ ----------------
     ตัวจริงใช้เบอร์โทรค้นที่เคาน์เตอร์อยู่แล้ว QR นี้จึงเป็นแค่ภาพ
     ไว้ให้ลูกค้ารู้สึกว่ามีอะไรให้ยื่น ไม่ได้เก็บข้อมูลอะไรจริง       */
  (function () {
    var el = $("#qr"), N = 21, seed = 20260825;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    function finder(cx, cy, r, c) {
      var d = Math.max(Math.abs(r - cy), Math.abs(c - cx));
      return d === 0 || d === 1 || d === 3;
    }
    var f = document.createDocumentFragment();
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var on;
      if (r < 7 && c < 7) on = finder(3, 3, r, c);
      else if (r < 7 && c > N - 8) on = finder(N - 4, 3, r, c);
      else if (r > N - 8 && c < 7) on = finder(3, N - 4, r, c);
      else if ((r < 8 && c < 8) || (r < 8 && c > N - 9) || (r > N - 9 && c < 8)) on = false;
      else on = rnd() > 0.52;
      var i = document.createElement("i");
      i.style.background = on ? "var(--ink)" : "transparent";
      f.appendChild(i);
    }
    el.appendChild(f);
  })();

  /* ================= วาดหน้าจอ ================= */
  function render() {
    var m = state.member, pts = m.points;

    $("#bal").textContent = pts;
    var bx = document.querySelectorAll(".balx");
    for (var i = 0; i < bx.length; i++) bx[i].textContent = pts;

    var pet = state.pets[0];
    $("#cardEmoji").textContent = pet ? (pet.emoji || "🐾") : "🐾";
    $("#cardPet").textContent = pet ? pet.name : (m.display_name || "สมาชิก");
    $("#cardOwner").textContent = [pet && pet.species, pet && pet.breed, m.display_name]
      .filter(Boolean).join(" · ") || "สมาชิกเอเชียเพ็ท";
    $("#myPhone").textContent = m.phone.replace(/^(\d{3})(\d{3})(\d+)$/, "$1-$2-$3");

    /* วงแหวน — ความคืบหน้าไปยังรางวัลถัดไปที่ยังแลกไม่ได้ */
    var next = null, prev = 0;
    state.rewards.forEach(function (r) {
      if (r.cost <= pts) prev = Math.max(prev, r.cost);
      else if (!next || r.cost < next.cost) next = r;
    });
    var C = 169.6;   // เส้นรอบวง 2πr ของ r=27 ในบัตร ถ้าแก้ขนาดวงต้องแก้ตรงนี้ด้วย
    if (next) {
      var span = next.cost - prev, done = pts - prev;
      $("#ringArc").style.strokeDashoffset = C - C * Math.max(0, Math.min(1, done / span));
      $("#ringLab").innerHTML = "อีก " + (next.cost - pts) + "<br>แต้ม";
      $("#nextTxt").textContent = "อีก " + (next.cost - pts) + " แต้ม แลก" + next.name + "ได้";
    } else {
      $("#ringArc").style.strokeDashoffset = 0;
      $("#ringLab").innerHTML = state.rewards.length ? "ครบ<br>ทุกอัน" : "";
    }

    /* ช่องล่างของบัตรมีที่ให้อันเดียว — แลกได้แล้วขึ้นปุ่ม ยังไม่ถึงขึ้นความคืบหน้า */
    var ready = state.rewards.filter(function (r) { return pts >= r.cost; }).length;
    $("#redeemCta").hidden = ready === 0;
    $("#nextLine").hidden = ready > 0 || !next;
    if (ready) {
      $("#redeemCtaTxt").textContent =
        ready === 1 ? "แลกรางวัลได้แล้ว" : "แลกได้ " + ready + " อย่าง";
    }

    renderFeed();
    renderRewards();
    renderCoupons();
    renderPets();
    renderBookings();
    renderBadge();
  }

  function renderFeed() {
    if (!state.feed.length) {
      $("#feed").innerHTML = '<div class="empty">' + svg(I.star) + "ยังไม่มีรายการ<br>แต้มแรกรอคุณอยู่ที่เคาน์เตอร์</div>";
      return;
    }
    /* note ถูกเขียนไว้ตอนบันทึกแล้ว ตารางนี้เป็นแค่ตัวสำรองเวลา note ว่าง */
    var LABEL = {
      purchase: "ค่าบริการ", bonus: "แต้มโบนัส", redeem: "แลกรางวัล",
      expire: "แต้มหมดอายุ", adjust: "ปรับแต้ม"
    };
    $("#feed").innerHTML = state.feed.map(function (f) {
      var cls = f.kind === "redeem" ? "pl" : (f.kind === "bonus" ? "gd" : "");
      var ico = f.kind === "redeem" ? I.pool : (f.kind === "purchase" ? I.bag : I.star);
      var sub = thDate(new Date(f.created_at)) +
                (f.bill_amount ? " · " + f.bill_amount.toLocaleString("en-US") + " ฿" : "");
      return '<div class="frow"><div class="ic ' + cls + '">' + svg(ico) + "</div>" +
             '<div class="ft">' + esc(f.note || LABEL[f.kind] || f.kind) +
             "<small>" + sub + "</small></div>" +
             '<div class="fp' + (f.delta < 0 ? " mn" : "") + '">' +
             (f.delta < 0 ? "−" + Math.abs(f.delta) : "+" + f.delta) + "</div></div>";
    }).join("");
  }

  /* หมวดรางวัล — สวนกับสระอยู่ในคลินิกเดียวกัน จึงเรียงจากถูกไปแพง
     ให้ของที่เอื้อมถึงง่ายที่สุดอยู่บนสุด คนใหม่จะได้เห็นว่ามีของที่แลกไหว */
  var CATS = {
    garden:  { label: "สวน",              ic: "garden", cls: "" },
    pool:    { label: "สระว่ายน้ำ",        ic: "pool",   cls: "" },
    clinic:  { label: "บริการในคลินิก",    ic: "heart",  cls: "rd" },
    shop:    { label: "เพ็ทช็อป",          ic: "bag",    cls: "rd" },
    charity: { label: "ช่วยสัตว์จร",       ic: "paw",    cls: "gd" },
    gift:    { label: "ของขวัญ",           ic: "star",   cls: "gd" }
  };

  function renderRewards() {
    var pts = state.member.points;
    var order = Object.keys(CATS);
    var html = "";

    order.forEach(function (cat) {
      var list = state.rewards.filter(function (r) { return r.category === cat; });
      if (!list.length) return;

      html += '<h4 style="margin-top:6px">' + esc(CATS[cat].label) + "</h4>";
      html += list.map(function (r) {
        var can = pts >= r.cost;
        var note = can ? (r.note || "") : "อีก " + (r.cost - pts) + " แต้ม";
        /* ราคาช่วงว่าง — โชว์ราคาเต็มขีดฆ่าไว้ข้าง ๆ ไม่งั้นลูกค้าไม่รู้ว่ากำลังได้ส่วนลด */
        var price = r.off_peak
          ? '<s style="opacity:.5;font-weight:600;margin-right:5px">' + r.base_cost + "</s>" + r.cost
          : String(r.cost);
        var badge = r.off_peak
          ? '<span style="display:block;font-size:.64rem;color:var(--pool);font-weight:400">' +
            "ราคาช่วงว่าง จ.–ศ. ก่อนเที่ยง</span>"
          : "";
        return '<button class="rw" data-rw="' + esc(r.code) + '"' + (can ? "" : " disabled") + ">" +
               '<div class="ri ' + CATS[cat].cls + '">' + svg(I[CATS[cat].ic]) + "</div>" +
               '<div class="rt"><b>' + esc(r.name) + "</b><small>" + esc(note) + "</small>" +
               badge + "</div>" +
               '<div class="rb">' + price + "</div></button>";
      }).join("");
    });

    $("#rewards").innerHTML = html ||
      '<div class="empty">' + svg(I.star) + "ยังไม่ได้ตั้งรางวัล</div>";
  }

  function renderCoupons() {
    var cps = state.coupons;
    $("#cpHow").hidden = !cps.length;
    $("#coupons").innerHTML = cps.length ? cps.map(function (c) {
      var name = c.rewards ? c.rewards.name : "คูปอง";
      var left = daysBetween(new Date(), new Date(c.expires_at));
      return '<div class="cp"><div class="cp-h">' + svg(I.pool) +
             "<div><b>" + esc(name) + "</b><small>ใช้ได้อีก " + left + " วัน · ถึง " +
             thDate(new Date(c.expires_at)) + "</small></div></div>" +
             '<div class="cp-b"><span class="code">' +
             esc(c.code).replace(/^(\d{3})(\d{3})$/, "$1 $2") + "</span>" +
             '<span class="cm">รหัสสำรอง<br>ปกติไม่ต้องใช้</span></div></div>';
    }).join("") : '<div class="empty">' + svg(I.pool) + "ยังไม่มีคูปอง<br>แลกได้ที่หน้ารางวัล</div>";

    $("#cpCount").textContent = cps.length
      ? "มีคูปองใช้ได้ " + cps.length + " ใบ"
      : "ยังไม่มีคูปอง · แลกได้ที่หน้ารางวัล";
  }

  function renderPets() {
    $("#petList").innerHTML = state.pets.length ? state.pets.map(function (p) {
      var age = p.birthdate
        ? Math.floor(daysBetween(new Date(p.birthdate), new Date()) / 365) + " ปี" : "";
      return '<div class="petcard"><div class="pa">' + esc(p.emoji || "🐾") + "</div>" +
             '<div class="pi"><b>' + esc(p.name) + "</b><small>" +
             [p.species, p.breed, age].filter(Boolean).map(esc).join(" · ") + "</small></div></div>";
    }).join("") : '<div class="empty">' + svg(I.heart) +
      "ยังไม่ได้บันทึกน้อง<br>แจ้งพนักงานตอนมาครั้งหน้าได้เลย</div>";

    var dues = state.dues || [];
    $("#dueBlk").hidden = !dues.length;
    if (!dues.length) return;

    var today = new Date(); today.setHours(0, 0, 0, 0);
    $("#dues").innerHTML = dues.map(function (d) {
      var due = new Date(d.due_on);
      var left = daysBetween(today, due);
      var cls = "", label = "", note = "";
      if (d.done_on) { cls = ""; label = "ทำแล้ว"; note = "ทำเมื่อ " + thDate(new Date(d.done_on)); }
      else if (left < 0) { cls = "late"; label = "เลยกำหนด"; note = "เลยมา " + Math.abs(left) + " วัน"; }
      else if (left <= 30) { cls = "soon"; label = "ใกล้ถึง"; note = "อีก " + left + " วัน · " + thDate(due); }
      else { cls = ""; label = "ยังไม่ถึง"; note = "ครบกำหนด " + thDate(due); }
      var ico = d.kind === "vaccine" ? I.vax : d.kind === "parasite" ? I.bag : I.heart;
      var icCls = d.kind === "parasite" ? "gd" : "";
      return '<div class="due"><div class="ic ' + icCls + '">' + svg(ico) + "</div>" +
             '<div class="dt">' + esc(d.label) + "<small>" + note + "</small></div>" +
             '<span class="pill ' + cls + '">' + label + "</span></div>";
    }).join("");
  }

  function renderBookings() {
    var bs = state.bookings || [];
    $("#myBookingsBlk").hidden = !bs.length;
    if (!bs.length) return;
    $("#myBookings").innerHTML = bs.map(function (b) {
      return '<div class="frow"><div class="ic pl">' + svg(I.pool) + "</div>" +
             '<div class="ft">' + (b.facility === "garden" ? "ใช้สวน" : "ว่ายน้ำ") +
             "<small>" + thDateTime(b.slot_at) + " น.</small></div></div>";
    }).join("");
  }

  function renderBadge() {
    var pts = state.member.points;
    var ready = state.rewards.filter(function (r) { return pts >= r.cost; }).length;
    var tab = document.querySelector('.tab[data-go="s-rewards"]');
    var old = tab.querySelector(".dot");
    if (old) old.remove();
    if (ready) {
      var b = document.createElement("span");
      b.className = "dot"; b.textContent = ready;
      tab.appendChild(b);
    }
  }

  /* ================= แลกรางวัล ================= */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-rw]");
    if (!b) return;
    var r = state.rewards.filter(function (x) { return x.code === b.dataset.rw; })[0];
    if (!r) return;
    sheet(
      '<div class="sh-ic">' + svg(I[(CATS[r.category] || CATS.pool).ic]) + "</div>" +
      "<h3>แลก" + esc(r.name) + "?</h3>" +
      '<div class="ledger">' +
      "<div>แต้มที่มี <span>" + state.member.points + "</span></div>" +
      "<div>ใช้ไป <span>−" + r.cost + "</span></div>" +
      '<div class="tot">เหลือ <span>' + (state.member.points - r.cost) + "</span></div></div>" +
      "<p>แลกแล้วคืนแต้มไม่ได้ · คูปองจะเก็บไว้ในบัตรของคุณ " +
      "<b>วันที่มาใช้แค่แจ้งเบอร์โทร</b> พนักงานเห็นในระบบและกดตัดให้เอง</p>" +
      '<div class="btns"><button class="no" data-close>ยังก่อน</button>' +
      '<button class="yes' + (r.category === "clinic" || r.category === "shop" ? "" : " pool") +
      '" data-ok="' + esc(r.code) + '">แลกเลย</button></div>'
    );
  });

  document.addEventListener("click", function (e) {
    var ok = e.target.closest("[data-ok]");
    if (!ok) return;
    ok.disabled = true;
    ok.textContent = "กำลังแลก…";
    api("redeem", { rewardCode: ok.dataset.ok }).then(function (data) {
      state = data;
      closeSheet(); render(); go("s-coupons");
      toast("แลกสำเร็จ คูปองอยู่ในหน้านี้แล้ว");
    }).catch(function (err) {
      closeSheet();
      toast(err.message, true);
    });
  });

  /* ================= จองสระ ================= */
  var TIMES = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
  var sel = { day: null, time: null };
  var taken = [];

  function buildDays() {
    var out = "", now = new Date();
    for (var i = 0; i < 7; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      out += '<button class="chip" data-day="' + d.toISOString().slice(0, 10) +
             '" aria-pressed="false"><b>' + d.getDate() + "</b><small>" +
             (i === 0 ? "วันนี้" : TH_DAY[d.getDay()]) + "</small></button>";
    }
    $("#days").innerHTML = out;
  }

  function buildSlots() {
    if (!sel.day) { $("#slots").innerHTML = '<p class="sub">เลือกวันก่อน</p>'; return; }
    var now = Date.now();
    $("#slots").innerHTML = TIMES.map(function (t) {
      var iso = new Date(sel.day + "T" + t + ":00").toISOString();
      var isTaken = taken.indexOf(iso) >= 0;
      var isPast = new Date(iso).getTime() < now;
      var off = isTaken || isPast;
      return '<button class="slot" data-time="' + t + '" aria-pressed="false"' +
             (off ? " disabled" : "") + ">" + t + "<small>" +
             (isTaken ? "เต็ม" : isPast ? "ผ่านแล้ว" : "ว่าง") + "</small></button>";
    }).join("");
  }

  function refreshBookBtn() {
    var ready = sel.day && sel.time;
    $("#bookBtn").disabled = !ready;
    $("#bookBtn").textContent = ready ? "ยืนยันการจอง" : "เลือกวันและรอบก่อน";
  }

  document.addEventListener("click", function (e) {
    var d = e.target.closest("[data-day]");
    if (d) {
      document.querySelectorAll("[data-day]").forEach(function (x) {
        x.setAttribute("aria-pressed", x === d ? "true" : "false");
      });
      sel.day = d.dataset.day; sel.time = null;
      buildSlots(); refreshBookBtn();
      return;
    }
    var t = e.target.closest("[data-time]");
    if (t && !t.disabled) {
      document.querySelectorAll("[data-time]").forEach(function (x) {
        x.setAttribute("aria-pressed", x === t ? "true" : "false");
      });
      sel.time = t.dataset.time;
      refreshBookBtn();
    }
  });

  $("#bookBtn").addEventListener("click", function () {
    var hasCoupon = state.coupons.length > 0;
    var when = thDate(new Date(sel.day)) + " เวลา " + sel.time;
    sheet(
      '<div class="sh-ic">' + svg(I.pool) + "</div>" +
      "<h3>จองสระ " + when + " น.</h3>" +
      (hasCoupon
        ? '<div class="ledger"><div>ใช้คูปอง <span>' + esc(state.coupons[0].rewards.name) + "</span></div>" +
          '<div class="tot">จ่ายเพิ่ม <span>0 ฿</span></div></div>' +
          "<p>คูปองจะถูกตัดทันทีที่ยืนยัน</p>"
        : "<p>ยังไม่มีคูปองว่ายน้ำ จองรอบนี้แล้วจ่ายที่เคาน์เตอร์ หรือไปแลกคูปองที่หน้ารางวัลก่อนก็ได้</p>") +
      '<div class="btns"><button class="no" data-close>ยังก่อน</button>' +
      '<button class="yes pool" data-book="' + (hasCoupon ? "1" : "0") + '">ยืนยันจอง</button></div>'
    );
  });

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-book]");
    if (!b) return;
    b.disabled = true; b.textContent = "กำลังจอง…";
    var slotAt = new Date(sel.day + "T" + sel.time + ":00").toISOString();
    api("book", { facility: "pool", slotAt: slotAt, useCoupon: b.dataset.book === "1" })
      .then(function (data) {
        state = data;
        closeSheet(); render();
        sel.time = null; refreshBookBtn();
        loadSlots();
        toast("จองแล้ว " + thDate(new Date(sel.day)) + " เวลา " + sel.time + " น.");
      })
      .catch(function (err) { closeSheet(); toast(err.message, true); loadSlots(); });
  });

  function loadSlots() {
    return api("slots", { facility: "pool" }).then(function (d) {
      taken = d.taken || [];
      buildSlots();
    }).catch(function () { /* ไม่สำคัญพอจะขัดจังหวะผู้ใช้ */ });
  }

  /* ================= สมัคร / ผูกบัญชี ================= */
  $("#regBtn").addEventListener("click", function () {
    var phone = $("#regPhone").value.replace(/\D/g, "");
    if (!/^0[0-9]{8,9}$/.test(phone)) { toast("เบอร์โทรไม่ถูกต้อง", true); return; }
    var btn = this; btn.disabled = true; btn.textContent = "กำลังสมัคร…";
    pendingPhone = phone;

    api("register", { phone: phone, petName: $("#regPet").value.trim() || null })
      .then(function (data) {
        btn.disabled = false; btn.textContent = "สมัครสมาชิก";
        if (data.needsCounterCode) { go("s-code"); $("#codeInput").focus(); return; }
        state = data; render(); go("s-card");
        toast("สมัครเรียบร้อย ยินดีต้อนรับครับ");
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "สมัครสมาชิก";
        toast(err.message, true);
      });
  });

  $("#codeBtn").addEventListener("click", function () {
    var code = $("#codeInput").value.replace(/\D/g, "");
    if (code.length !== 6) { toast("ใส่รหัส 6 หลัก", true); return; }
    var btn = this; btn.disabled = true; btn.textContent = "กำลังยืนยัน…";
    /* ส่งเบอร์ไปด้วย — หลังบ้านต้องเช็คว่ารหัสกับเบอร์ตรงกัน
       ไม่งั้นรหัสที่พนักงานออกให้แบบไม่ผูกบัญชี จะเดา 6 หลักเอาได้ */
    api("confirmLink", { code: code, phone: pendingPhone })
      .then(function (data) {
        btn.disabled = false; btn.textContent = "ยืนยัน";
        state = data; render(); go("s-card");
        toast("ผูกบัญชีเรียบร้อย");
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "ยืนยัน";
        $("#codeInput").value = "";
        toast(err.message, true);
      });
  });
  $("#codeBack").addEventListener("click", function () { go("s-register"); });

  /* พิมพ์เบอร์แล้วใส่ขีดให้อ่านง่าย */
  $("#regPhone").addEventListener("input", function () {
    var v = this.value.replace(/\D/g, "").slice(0, 10);
    this.value = v.length > 6 ? v.slice(0, 3) + "-" + v.slice(3, 6) + "-" + v.slice(6)
               : v.length > 3 ? v.slice(0, 3) + "-" + v.slice(3) : v;
  });

  /* ================= เริ่มทำงาน ================= */
  function fail(msg) {
    $("#bootSpin").hidden = true;
    $("#bootMsg").hidden = true;
    $("#bootErr").hidden = false;
    $("#bootErr").textContent = msg;
  }

  function boot() {
    if (!CFG.LIFF_ID || CFG.LIFF_ID.indexOf("PUT-") === 0) {
      fail("ยังไม่ได้ใส่ค่า LIFF_ID กับ SUPABASE_URL ใน member/config.js");
      return;
    }
    liff.init({ liffId: CFG.LIFF_ID })
      .then(function () {
        if (!liff.isLoggedIn()) {
          $("#bootMsg").textContent = "กำลังพาไปหน้าล็อกอินไลน์…";
          liff.login({ redirectUri: location.href });
          return null;           // หน้าจะถูกเปลี่ยนไปแล้ว ไม่ต้องทำต่อ
        }
        idToken = liff.getIDToken();
        if (!idToken) {
          fail("ไม่ได้รับ ID token จากไลน์ — ตรวจว่า LIFF เปิด scope openid ไว้แล้ว");
          return null;
        }
        return api("me");
      })
      .then(function (data) {
        if (!data) return;
        if (!data.registered) {
          if (data.profile && data.profile.name) {
            $("#regPet").placeholder = "เช่น ข้าวปั้น";
          }
          go("s-register");
          return;
        }
        state = data;
        render();
        go("s-card");
        buildDays();
        loadSlots();
      })
      .catch(function (err) {
        console.error(err);
        fail(err && err.message ? err.message : "เปิดบัตรสมาชิกไม่สำเร็จ ลองใหม่อีกครั้ง");
      });
  }

  boot();
})();
