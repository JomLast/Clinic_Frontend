/* โหมดพนักงาน — หน้าจอที่ตั้งอยู่หน้าเคาน์เตอร์
 *
 * ป้องกันด้วยรหัสร้านตัวเดียว ไม่ทำระบบบัญชีรายคน เพราะเป็นเครื่องกลาง
 * ของร้านเดียว การบังคับล็อกอินรายคนจะเพิ่มขั้นตอนโดยไม่ได้เพิ่มความปลอดภัย
 * แต่ยังบันทึกชื่อคนกดไว้ทุกครั้ง เผื่อต้องตรวจย้อนหลัง
 *
 * รหัสร้านเก็บใน sessionStorage ไม่ใช่ localStorage — ปิดแท็บแล้วต้องใส่ใหม่
 * ป้องกันกรณีลืมล็อกเครื่องทิ้งไว้ข้ามวัน
 */
(function () {
  "use strict";

  var CFG = window.ASIAPET || {};
  var API = CFG.SUPABASE_URL + "/functions/v1/staff";
  var $ = function (s) { return document.querySelector(s); };

  var BONUS = { bOntime: 20, bParasite: 30, bCheckup: 50 };
  var session = { pin: "", who: "" };
  var current = null;

  /* sessionStorage ใช้ไม่ได้เสมอไป — โหมดส่วนตัว เบราว์เซอร์ในแอปบางตัว
     หรือเครื่องที่ปิดคุกกี้ไว้ จะโยน error ทันทีที่แตะ
     ถ้าปล่อยให้ error หลุดออกไป พนักงานจะเข้าระบบไม่ได้เลยทั้งที่รหัสถูก
     กลืนไว้แล้วทำงานต่อโดยไม่จำ session ดีกว่าใช้ไม่ได้ทั้งหน้า        */
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ไม่จำก็ไม่เป็นไร */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* เหมือนกัน */ } }
  };

  /* ---------------- ตัวช่วย ---------------- */
  function api(action, args) {
    var body = Object.assign(
      { action: action, pin: session.pin, staffName: session.who }, args || {});
    return fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d && d.error ? d.error : "ระบบขัดข้อง");
        return d;
      });
    });
  }

  function go(id) {
    var list = document.querySelectorAll(".screen");
    for (var i = 0; i < list.length; i++) list[i].classList.toggle("on", list[i].id === id);
    var scr = document.getElementById(id);
    if (scr) scr.scrollTop = 0;
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go]");
    if (t) go(t.dataset.go);
  });

  var toastTimer;
  function toast(msg, bad) {
    $("#toastTxt").textContent = msg;
    $("#toast").classList.toggle("bad", !!bad);
    $("#toastIcon").innerHTML = bad
      ? '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>'
      : '<path d="m4 12 5 5L20 6"/>';
    $("#toast").classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $("#toast").classList.remove("on"); }, 3200);
  }

  function fmtPhone(p) { return String(p).replace(/^(\d{3})(\d{3})(\d+)$/, "$1-$2-$3"); }

  /* ---------------- เข้าใช้งาน ---------------- */
  $("#pinBtn").addEventListener("click", function () {
    var pin = $("#pin").value.replace(/\D/g, "");
    var who = $("#who").value.trim();
    if (pin.length < 4) { toast("ใส่รหัสร้านให้ครบ", true); return; }
    if (!who) { toast("ใส่ชื่อผู้ใช้งานด้วย", true); return; }

    var btn = this; btn.disabled = true; btn.textContent = "กำลังตรวจ…";
    session = { pin: pin, who: who };

    /* ยิงคำสั่งที่ไม่ทำอะไรเสียหายเพื่อตรวจว่ารหัสถูกไหม
       ใช้เบอร์ที่ไม่มีทางมีจริง จะได้ไม่ไปแตะข้อมูลใคร */
    api("lookup", { phone: "0000000000" })
      .then(function () { onLoggedIn(); })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "เข้าใช้งาน";
        // เบอร์ไม่ถูกรูปแบบ = รหัสร้านผ่านแล้ว (ด่านรหัสอยู่ก่อนด่านเบอร์)
        if (/เบอร์โทร/.test(err.message)) { onLoggedIn(); return; }
        session.pin = "";
        toast(err.message, true);
      });

    function onLoggedIn() {
      btn.disabled = false; btn.textContent = "เข้าใช้งาน";
      store.set("asiapet_staff", JSON.stringify(session));
      $("#pin").value = "";
      go("s-find");
      $("#findPhone").focus();
    }
  });

  $("#logout").addEventListener("click", function () {
    store.del("asiapet_staff");
    session = { pin: "", who: "" };
    current = null;
    go("s-pin");
  });

  /* ---------------- ค้นหา ---------------- */
  function phoneMask(el) {
    el.addEventListener("input", function () {
      var v = this.value.replace(/\D/g, "").slice(0, 10);
      this.value = v.length > 6 ? v.slice(0, 3) + "-" + v.slice(3, 6) + "-" + v.slice(6)
                 : v.length > 3 ? v.slice(0, 3) + "-" + v.slice(3) : v;
    });
  }
  phoneMask($("#findPhone"));

  $("#findBtn").addEventListener("click", function () {
    var phone = $("#findPhone").value.replace(/\D/g, "");
    if (!/^0[0-9]{8,9}$/.test(phone)) { toast("เบอร์โทรไม่ถูกต้อง", true); return; }
    var btn = this; btn.disabled = true; btn.textContent = "กำลังค้น…";

    api("lookup", { phone: phone })
      .then(function (d) {
        btn.disabled = false; btn.textContent = "ค้นหา";
        if (!d.found) {
          /* ไม่เจอไม่ใช่ทางตัน — พาไปหน้าสมัครให้เลย พร้อมเติมเบอร์ไว้ให้
             ลูกค้าที่ไม่มีไลน์ต้องสมัครได้ ไม่งั้นจะเสียลูกค้ากลุ่มนี้ทั้งกลุ่ม */
          $("#newPhone").value = $("#findPhone").value;
          $("#newName").value = "";
          $("#newPet").value = "";
          go("s-new");
          toast("ยังไม่มีสมาชิกเบอร์นี้ — สมัครให้ได้เลย");
          return;
        }
        current = d;
        showMember(d);
        go("s-member");
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "ค้นหา";
        toast(err.message, true);
      });
  });

  function showMember(d) {
    var petNames = d.pets.map(function (p) { return (p.emoji || "🐾") + " " + p.name; }).join("  ");
    $("#mWho").firstChild.textContent = d.member.display_name || fmtPhone(d.member.phone);
    $("#mSub").textContent = [fmtPhone(d.member.phone), petNames].filter(Boolean).join(" · ");
    $("#mPts").textContent = d.member.points;

    $("#linkPanel").hidden = !d.pendingCode;
    if (d.pendingCode) {
      $("#linkWhy").textContent = "ลูกค้ากดขอผูกบัญชีไลน์ค้างไว้ — อ่านรหัสนี้ให้ฟัง";
      $("#linkCode").textContent = d.pendingCode.replace(/^(\d{3})(\d{3})$/, "$1 $2");
      $("#linkExp").textContent = "";
    }
    // มีไลน์ผูกแล้วก็ยังออกรหัสได้ เผื่อคนในบ้านคนที่สองจะผูกเพิ่ม
    $("#linkBtn").hidden = false;

    renderCoupons(d.coupons || []);

    $("#bill").value = "";
    ["bOntime", "bParasite", "bCheckup"].forEach(function (k) { $("#" + k).checked = false; });
    calc();
  }

  /* คูปองที่ลูกค้าแลกไว้ — พนักงานกดใช้ได้เลย
     นี่คือทางยืนยันหลัก ลูกค้าไม่ต้องอ่านรหัสให้ฟัง พนักงานไม่ต้องพิมพ์
     เหลือแค่ดูว่าชื่อรางวัลตรงกับที่ลูกค้าขอไหม แล้วกด */
  function renderCoupons(list) {
    $("#cpBlk").hidden = !list.length;
    if (!list.length) { $("#cpList").innerHTML = ""; return; }

    $("#cpList").innerHTML = list.map(function (c) {
      var name = c.rewards ? c.rewards.name : "คูปอง";
      var left = Math.round((new Date(c.expires_at) - new Date()) / 864e5);
      return '<div class="panel" style="margin-bottom:9px;flex-direction:row;align-items:center;gap:12px">' +
        '<div style="min-width:0;line-height:1.35">' +
        '<b style="font-weight:500;color:#fff;font-size:.9rem;display:block">' + escHtml(name) + "</b>" +
        '<small style="color:rgba(255,255,255,.5);font-size:.72rem">รหัส ' +
        escHtml(c.code).replace(/^(\d{3})(\d{3})$/, "$1 $2") + " · เหลือ " + left + " วัน</small></div>" +
        '<button class="useCp" data-cp="' + escHtml(c.id) + '" data-name="' + escHtml(name) + '" ' +
        'style="margin-left:auto;flex:none;background:var(--red);color:#fff;border-radius:999px;' +
        'padding:9px 18px;font-size:.82rem;font-weight:500">ใช้เลย</button></div>';
    }).join("");
  }

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cp]");
    if (!b) return;
    if (!confirm("ยืนยันตัดคูปอง " + b.dataset.name + " ?\nตัดแล้วคืนไม่ได้")) return;

    b.disabled = true; b.textContent = "กำลังตัด…";
    api("useCoupon", { couponId: b.dataset.cp })
      .then(function () {
        toast("ตัดแล้ว — " + b.dataset.name);
        // โหลดใหม่ให้เห็นสถานะจริง ไม่ใช่แค่ลบออกจากหน้าจอ
        return api("lookup", { phone: current.member.phone });
      })
      .then(function (d) { current = d; showMember(d); })
      .catch(function (err) {
        b.disabled = false; b.textContent = "ใช้เลย";
        toast(err.message, true);
      });
  });

  /* ---------------- คิดแต้ม ----------------
     ตัวเลขที่โชว์ตรงนี้เป็นแค่การแสดงผลให้พนักงานเห็นก่อนกด
     ของจริงหลังบ้านคิดใหม่เองทั้งหมด ไม่เชื่อค่าที่หน้าเว็บส่งไป   */
  function calc() {
    var bill = parseInt(($("#bill").value || "0").replace(/\D/g, ""), 10) || 0;
    var base = Math.floor(bill / 100);
    var bonus = 0;
    Object.keys(BONUS).forEach(function (k) { if ($("#" + k).checked) bonus += BONUS[k]; });
    $("#cBase").textContent = base;
    $("#cBonus").textContent = bonus;
    $("#cTot").textContent = base + bonus;
    $("#giveBtn").disabled = (base + bonus) === 0;
    return { base: base, bonus: bonus, total: base + bonus };
  }
  $("#bill").addEventListener("input", calc);
  ["bOntime", "bParasite", "bCheckup"].forEach(function (k) {
    $("#" + k).addEventListener("change", calc);
  });

  $("#giveBtn").addEventListener("click", function () {
    if (!current) return;
    var c = calc();
    if (!c.total) return;
    var btn = this; btn.disabled = true; btn.textContent = "กำลังบันทึก…";

    api("award", {
      memberId: current.member.id,
      billAmount: parseInt(($("#bill").value || "0").replace(/\D/g, ""), 10) || 0,
      bonuses: {
        ontime: $("#bOntime").checked,
        parasite: $("#bParasite").checked,
        checkup: $("#bCheckup").checked
      }
    })
      .then(function (d) {
        btn.textContent = "ยืนยัน บวกแต้มให้ลูกค้า";
        current.member.points = d.points;
        $("#mPts").textContent = d.points;
        $("#bill").value = "";
        ["bOntime", "bParasite", "bCheckup"].forEach(function (k) { $("#" + k).checked = false; });
        calc();
        toast("บวกให้แล้ว " + d.gained + " แต้ม · รวมเป็น " + d.points);
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "ยืนยัน บวกแต้มให้ลูกค้า";
        toast(err.message, true);
      });
  });

  /* ---------------- สมัครให้ลูกค้าที่ไม่มีไลน์ ---------------- */
  phoneMask($("#newPhone"));

  $("#newBtn").addEventListener("click", function () {
    var phone = $("#newPhone").value.replace(/\D/g, "");
    if (!/^0[0-9]{8,9}$/.test(phone)) { toast("เบอร์โทรไม่ถูกต้อง", true); return; }
    var btn = this; btn.disabled = true; btn.textContent = "กำลังสมัคร…";

    api("createMember", {
      phone: phone,
      name: $("#newName").value.trim() || null,
      petName: $("#newPet").value.trim() || null
    })
      .then(function (d) {
        btn.disabled = false; btn.textContent = "สมัครให้";
        current = d;
        showMember(d);
        go("s-member");
        toast("สมัครให้แล้ว บวกแต้มได้เลย");
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "สมัครให้";
        toast(err.message, true);
      });
  });

  /* ---------------- ออกรหัสผูกบัญชีไลน์ ---------------- */
  $("#linkBtn").addEventListener("click", function () {
    if (!current) return;
    var btn = this; btn.disabled = true; btn.textContent = "กำลังออกรหัส…";

    api("issueCode", { phone: current.member.phone })
      .then(function (d) {
        btn.disabled = false; btn.textContent = "ออกรหัสผูกบัญชีไลน์";
        $("#linkWhy").textContent = "ให้ลูกค้าเปิดบัตรสมาชิกในไลน์ ใส่เบอร์ แล้วพิมพ์รหัสนี้";
        $("#linkCode").textContent = d.code.replace(/^(\d{3})(\d{3})$/, "$1 $2");
        $("#linkExp").textContent = d.hours >= 1
          ? "ใช้ได้ถึงพรุ่งนี้ · กลับบ้านแล้วค่อยทำก็ได้"
          : "ใช้ได้ 10 นาที";
        $("#linkPanel").hidden = false;
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "ออกรหัสผูกบัญชีไลน์";
        toast(err.message, true);
      });
  });

  /* ---------------- ตัดคูปอง ---------------- */
  $("#cpCode").addEventListener("input", function () {
    var v = this.value.replace(/\D/g, "").slice(0, 6);
    this.value = v.length > 3 ? v.slice(0, 3) + " " + v.slice(3) : v;
  });

  $("#cpBtn").addEventListener("click", function () {
    var code = $("#cpCode").value.replace(/\D/g, "");
    if (code.length !== 6) { toast("ใส่รหัสคูปอง 6 หลัก", true); return; }
    var btn = this; btn.disabled = true; btn.textContent = "กำลังตัด…";

    api("useCoupon", { code: code })
      .then(function (d) {
        btn.disabled = false; btn.textContent = "ตัดคูปอง";
        $("#cpCode").value = "";
        var name = d.coupon && d.coupon.rewards ? d.coupon.rewards.name : "คูปอง";
        toast("ตัดแล้ว — " + name);
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "ตัดคูปอง";
        toast(err.message, true);
      });
  });

  /* ---------------- เริ่มทำงาน ---------------- */
  (function boot() {
    if (!CFG.SUPABASE_URL || CFG.SUPABASE_URL.indexOf("PUT-") >= 0) {
      toast("ยังไม่ได้ใส่ค่า SUPABASE_URL ใน member/config.js", true);
      return;
    }
    var saved = store.get("asiapet_staff");
    if (saved) {
      try {
        session = JSON.parse(saved);
        if (session.pin) { go("s-find"); return; }
      } catch (e) { /* ข้อมูลเสีย ให้ใส่รหัสใหม่ */ }
    }
    $("#pin").focus();
  })();
})();
