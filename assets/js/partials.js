/* ===================================================================
   Asiapet Animal Hospital — Shared Header & Footer
   แก้ข้อมูลติดต่อ/เมนู ที่ไฟล์นี้ที่เดียว → เปลี่ยนทุกหน้า
   =================================================================== */

/* ----- ข้อมูลติดต่อกลาง (แก้ที่นี่ที่เดียว) ----- */
const SITE = {
  phone:    "086 119 9349",
  phoneTel: "0861199349",
  email:    "contact@asiapet.com",        // 👉 ใส่อีเมลจริง (ถ้ามี)
  facebook: "https://www.facebook.com/asiapetclinic",
  messenger:"https://m.me/asiapetclinic",
  line:     "https://line.me/ti/p/tK01btn-wu",
  lineId:   "asiapet310",
  lineQR:   "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=https%3A%2F%2Fline.me%2Fti%2Fp%2FtK01btn-wu",
  instagram:"https://www.instagram.com/asiapet01/",
  address:  "320/12 ข้างบิ๊กซีนครสวรรค์ ถ.สายเอเชีย ต.ปากน้ำโพ อ.เมือง จ.นครสวรรค์ 60000",
  mapLink:  "https://maps.app.goo.gl/9gafEAtYKx8WSJxn7",
  mapEmbed: "https://www.google.com/maps?q=15.6959822,100.1217192&z=17&hl=th&output=embed",
  hours: "09:00 – 20:00 น.",          // เปิดทุกวัน เวลาเดียวกันหมด
};

/* ----- ไอคอนเส้น (SVG, Lucide-style) — ใช้ currentColor เข้าธีมอัตโนมัติ ----- */
const ICON = {
  phone:    `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  clock:    `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  pin:      `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  facebook: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
  chat:     `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  instagram:`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg>`,
  alert:    `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

/* ----- สถิติผู้เข้าชม (ปิดอยู่จนกว่าจะใส่รหัส) -----
   ใส่รหัสอันใดอันหนึ่งแล้วสถิติจะเริ่มเก็บทันทีทุกหน้า — เว้นว่าง = ไม่โหลดอะไรเลย

   ga4        Google Analytics 4  ("G-XXXXXXXXXX")
              analytics.google.com > Admin > Data streams > สร้าง Web stream
              ข้อดี: เชื่อมกับ Search Console ได้ ดูข้อมูลได้ละเอียดมาก
              ข้อเสีย: ใช้คุกกี้ ตาม PDPA ควรมีแถบขอความยินยอม

   cloudflare Cloudflare Web Analytics (token ยาว ๆ)
              dash.cloudflare.com > Analytics > Web Analytics > Add a site
              ข้อดี: ไม่ใช้คุกกี้ จึงไม่ต้องมีแถบขอความยินยอม เบากว่ามาก
              เหมาะกับเว็บนี้ที่อยากรู้แค่ว่ามีคนเข้ากี่คน หน้าไหนคนดูเยอะ   */
const ANALYTICS = {
  ga4: "",
  cloudflare: "",
};

function initAnalytics(){
  if(location.hostname === "localhost" || location.hostname === "127.0.0.1") return;  // ไม่นับตอนทดสอบ

  if(ANALYTICS.cloudflare){
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", JSON.stringify({ token: ANALYTICS.cloudflare }));
    document.head.appendChild(s);
  }

  if(ANALYTICS.ga4){
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ANALYTICS.ga4;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", ANALYTICS.ga4);
  }
}

/* ----- เมนูหลัก (มี dropdown) ----- */
const NAV = [
  { label:"หน้าหลัก", href:"index.html", id:"home" },
  { label:"บริการของเรา", href:"services.html", id:"services", sub:[
      { label:"ตรวจสุขภาพ", href:"service-checkup.html" },
      { label:"ฉีดวัคซีน", href:"vaccine.html" },
      { label:"ผ่าตัด & ทำหมัน", href:"service-surgery.html" },
      { label:"อาบน้ำ & ตัดขน", href:"service-grooming.html" },
      { label:"ศูนย์เฉพาะทาง", href:"centers.html" },
      { label:"ค่าบริการ", href:"prices.html" },
      { label:"ดูบริการทั้งหมด →", href:"services.html" },
  ]},
  { label:"สัตว์ที่เรารักษา", href:"animals.html", id:"animals", sub:[
      { label:"สุนัข", href:"animal-dog.html" },
      { label:"แมว", href:"animal-cat.html" },
      { label:"กระต่าย", href:"animal-rabbit.html" },
      { label:"นก", href:"animal-bird.html" },
      { label:"สัตว์ฟันแทะ", href:"animal-rodent.html" },
      { label:"สัตว์ปีก", href:"animal-poultry.html" },
      { label:"สัตว์พิเศษ (Exotic)", href:"animal-exotic.html" },
      { label:"ดูทั้งหมด →", href:"animals.html" },
  ]},
  { label:"เพ็ทช็อป", href:"shop.html", id:"shop" },
  { label:"บทความ", href:"articles.html", id:"articles", sub:[
      { label:"คำถามที่พบบ่อย", href:"faq.html" },
      { label:"บทความทั้งหมด →", href:"articles.html" },
  ]},
  { label:"เกี่ยวกับเรา", href:"about.html", id:"about" },
  { label:"ติดต่อเรา", href:"contact.html", id:"contact" },
];

/* ----- สร้าง Header ----- */
function buildHeader(active){
  const links = NAV.map(item => {
    const cls = (item.id === active) ? "active-link" : "";
    if(item.sub){
      const subs = item.sub.map(s => `<a href="${s.href}">${s.label.replace(/^[^\p{L}\p{N}]+/u, "").trim()}</a>`).join("");
      return `<div class="nav-item has-drop">
        <a href="${item.href}" class="${cls}">${item.label}</a>
        <div class="dropdown">${subs}</div>
      </div>`;
    }
    return `<div class="nav-item"><a href="${item.href}" class="${cls}">${item.label}</a></div>`;
  }).join("");

  return `
  <div class="topbar">
    <div class="container">
      <div class="left">
        <a href="tel:${SITE.phoneTel}" class="tb-phone">${ICON.phone} ${SITE.phone}</a>
        <span class="tb-hours">${ICON.clock} เปิดทุกวัน ${SITE.hours}</span>
      </div>
    </div>
  </div>
  <header>
    <nav class="container">
      <a href="index.html" class="brand" aria-label="Asiapet เอเชียเพ็ท">
        <img class="brand-logo" src="assets/img/logo.png" alt="เอเชียเพ็ท (Asiapet) นครสวรรค์" />
      </a>
      <div class="nav-links" id="navLinks">${links}</div>
      <div class="nav-right">
        <button class="search-btn" id="searchBtn" aria-label="ค้นหาในเว็บไซต์" title="ค้นหา"><i data-lucide="search" class="ico"></i></button>
        <a href="contact.html" class="emergency">${ICON.alert} <span class="full">แจ้งสัตว์ป่วยอาการฉุกเฉิน</span></a>
        <button class="menu-toggle" id="menuToggle" aria-label="เมนู"><i data-lucide="menu" class="ico"></i></button>
      </div>
    </nav>
  </header>`;
}

/* ----- สร้าง Footer (ข้อมูลติดต่อ — อยู่ทุกหน้า) ----- */
function buildFooter(){
  return `
  <footer>
    <div class="container">
      <div class="foot-grid">
        <div>
          <a href="index.html" class="footer-brand" aria-label="Asiapet เอเชียเพ็ท">
            <span class="fb-name">Asiapet</span>
            <span class="fb-sub">เอเชียเพ็ท · นครสวรรค์</span>
          </a>
          <p class="foot-tag">รักษาสุนัข แมว กระต่าย นก และสัตว์พิเศษ (Exotic) เปิดทุกวัน</p>
          <p class="foot-addr">${ICON.pin} <span>${SITE.address}</span></p>
          <div class="socials">
            <a href="${SITE.facebook}" target="_blank" rel="noopener" aria-label="Facebook" title="Facebook">${ICON.facebook}</a>
            <a href="${SITE.line}" target="_blank" rel="noopener" aria-label="LINE" title="LINE">${ICON.chat}</a>
            <a href="${SITE.instagram}" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram">${ICON.instagram}</a>
          </div>
        </div>
        <div>
          <h5>เมนู</h5>
          <ul>
            <li><a href="services.html">บริการของเรา</a></li>
            <li><a href="prices.html">ค่าบริการ</a></li>
            <li><a href="animals.html">สัตว์ที่เรารักษา</a></li>
            <li><a href="shop.html">เพ็ทช็อป</a></li>
            <li><a href="articles.html">บทความ</a></li>
            <li><a href="faq.html">คำถามที่พบบ่อย</a></li>
            <li><a href="about.html">เกี่ยวกับเรา</a></li>
          </ul>
        </div>
        <div>
          <h5>ติดต่อ &amp; เวลาทำการ</h5>
          <ul>
            <li><a href="tel:${SITE.phoneTel}">${ICON.phone} ${SITE.phone}</a></li>
            <li><a href="${SITE.line}" target="_blank" rel="noopener">${ICON.chat} LINE: ${SITE.lineId}</a></li>
            <li><a href="${SITE.facebook}" target="_blank" rel="noopener">${ICON.facebook} Facebook: asiapetclinic</a></li>
            <li><a href="${SITE.mapLink}" target="_blank" rel="noopener">${ICON.pin} ดูแผนที่ / นำทาง</a></li>
            <li style="margin-top:6px">เปิดทุกวัน ${SITE.hours}</li>
            <li style="color:var(--red);display:flex;align-items:center;gap:7px">${ICON.alert} ฉุกเฉิน: โทรปรึกษาได้</li>
          </ul>
        </div>
      </div>
      <div class="foot-bottom">© 2026 เอเชียเพ็ท (Asiapet) — สงวนลิขสิทธิ์ทุกประการ</div>
    </div>
  </footer>`;
}

/* ----- ติดตั้งลงหน้า ----- */
function initSite(){
  const active = document.body.getAttribute("data-page") || "";
  const h = document.getElementById("site-header");
  const f = document.getElementById("site-footer");
  if(h) h.innerHTML = buildHeader(active);
  if(f) f.innerHTML = buildFooter();

  // ===== ปุ่มย้อนกลับ (เฉพาะหน้าที่ตั้ง data-back บน <body>) =====
  const backTo = document.body.getAttribute("data-back");
  if(backTo){
    const firstSection = document.querySelector("section");
    if(firstSection){
      const bar = document.createElement("div");
      bar.className = "back-bar";
      bar.innerHTML = `<div class="container"><a href="${backTo}" class="back-link" onclick="if(document.referrer.indexOf(location.host)>-1){history.back();return false;}"><i data-lucide="arrow-left" class="ico"></i> ย้อนกลับ</a></div>`;
      firstSection.parentNode.insertBefore(bar, firstSection);
    }
  }

  // เมนูมือถือ
  const toggle = document.getElementById("menuToggle");
  const links  = document.getElementById("navLinks");
  if(toggle && links){
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    document.querySelectorAll(".nav-item.has-drop > a").forEach(a => {
      a.addEventListener("click", (e) => {
        if(window.innerWidth <= 1040){
          e.preventDefault();
          a.parentElement.classList.toggle("open-sub");
        }
      });
    });
  }

  // ===== Scroll reveal: ค่อย ๆ ลอยขึ้นตอนเลื่อนถึง =====
  const revealSel = [
    ".section-head", ".card", ".step", ".animal-chip", ".article-card",
    ".about-grid > div", ".info-box", ".booking-form", ".map-wrap",
    ".qr-card", ".cta-band", ".hero-inner > *", ".page-banner > .container > *"
  ];
  const revealEls = document.querySelectorAll(revealSel.join(","));
  revealEls.forEach(el => el.classList.add("reveal"));

  // หน่วงเวลาแบบไล่ลำดับให้การ์ดในแถวเดียวกันทยอยขึ้น
  document.querySelectorAll(".cards, .animals-row, .article-grid, .roadmap").forEach(group => {
    Array.from(group.children).forEach((child, i) => {
      if (child.classList.contains("reveal")) child.style.transitionDelay = (i * 0.09) + "s";
    });
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("in"));
  }

  // ===== Lucide icons (แทน emoji ด้วยไอคอนเส้น) =====
  const renderIcons = () => { if (window.lucide) window.lucide.createIcons(); };
  if (window.lucide) {
    renderIcons();
  } else if (!document.getElementById("lucide-lib")) {
    const s = document.createElement("script");
    s.id = "lucide-lib";
    s.src = "assets/js/lucide-subset.js";   // ชุดย่อ 55 ไอคอนที่ใช้จริง (13KB) แทนไลบรารีเต็ม 399KB
    s.onload = renderIcons;
    document.head.appendChild(s);
  }

  initSearch();
  initOpenStatus();
  initAnalytics();

  // หมายเหตุ: ฟอร์มจองนัดส่งเข้าอีเมลคลินิกผ่าน Web3Forms — สคริปต์อยู่ท้าย contact.html (ไม่มี backend)
}

/* ===== ป้ายสถานะ "เปิดอยู่ตอนนี้" =====
   คำนวณจากนาฬิกาเครื่องผู้ใช้เทียบเวลาทำการ (เปิดทุกวัน 09:00–20:00 น.)
   ถ้าเปลี่ยนเวลาทำการ แก้ที่ SITE.hours + OPEN/CLOSE ตรงนี้           */
const OPEN_HOUR = 9, CLOSE_HOUR = 20;

function initOpenStatus(){
  const el = document.getElementById("openNow");
  if(!el) return;

  const render = () => {
    const now  = new Date();
    const h    = now.getHours() + now.getMinutes() / 60;
    const open = h >= OPEN_HOUR && h < CLOSE_HOUR;

    let text;
    if(open){
      text = (CLOSE_HOUR - h <= 1)
        ? "ใกล้ปิดแล้ว · ปิด 20:00 น."
        : "เปิดอยู่ตอนนี้ · ถึง 20:00 น.";
    } else {
      text = (h < OPEN_HOUR)
        ? "ยังไม่เปิด · เปิด 09:00 น. วันนี้"
        : "ปิดแล้ววันนี้ · เปิดพรุ่งนี้ 09:00 น.";
    }

    el.className = "hero-badge status " + (open ? "is-open" : "is-closed");
    el.innerHTML = '<span class="dot"></span>' + text +
                   '<span class="bar"></span>ข้างบิ๊กซีนครสวรรค์';
  };

  render();
  setInterval(render, 60000);   // อัปเดตทุกนาที เผื่อเปิดค้างไว้ข้ามเวลาปิด
}

/* ===== ค้นหาในเว็บ =====
   ดัชนีอยู่ใน search-index.json (สร้างด้วย node tools/make-search-index.js)
   โหลดตอนเปิดกล่องค้นหาครั้งแรกเท่านั้น — ไม่ถ่วงการโหลดหน้า          */
function initSearch(){
  const btn = document.getElementById("searchBtn");
  if(!btn) return;

  const box = document.createElement("div");
  box.className = "search-overlay";
  box.innerHTML = `
    <div class="search-panel" role="dialog" aria-modal="true" aria-label="ค้นหาในเว็บไซต์">
      <div class="search-bar">
        <i data-lucide="search" class="ico"></i>
        <input type="search" id="searchInput" placeholder="ค้นหา เช่น ทำหมันกระต่าย, วัคซีน, อาบน้ำ" autocomplete="off" />
        <button class="search-close" aria-label="ปิด">&times;</button>
      </div>
      <div class="search-results" id="searchResults"></div>
    </div>`;
  document.body.appendChild(box);

  const input = box.querySelector("#searchInput");
  const list  = box.querySelector("#searchResults");
  let docs = null, loading = false;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const mark = (s, q) => {
    const i = s.toLowerCase().indexOf(q);
    if(i < 0) return esc(s);
    return esc(s.slice(0,i)) + "<mark>" + esc(s.slice(i, i+q.length)) + "</mark>" + esc(s.slice(i+q.length));
  };

  function snippet(text, q){
    const i = text.indexOf(q);
    if(i < 0) return text.slice(0, 90);
    const from = Math.max(0, i - 35);
    return (from ? "…" : "") + text.slice(from, from + 110);
  }

  function render(q){
    if(!q){ list.innerHTML = `<p class="search-hint">พิมพ์เพื่อค้นหาบริการ สัตว์ที่รักษา ราคา หรือบทความ</p>`; return; }
    if(!docs){ list.innerHTML = `<p class="search-hint">กำลังโหลด…</p>`; return; }

    const hits = docs
      .map(d => {
        let score = 0;
        if(d.t.toLowerCase().includes(q)) score += 10;
        if(d.d.toLowerCase().includes(q)) score += 4;
        if(d.x.includes(q)) score += 1;
        return { d, score };
      })
      .filter(h => h.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0, 12);

    if(!hits.length){
      list.innerHTML = `<p class="search-hint">ไม่พบ “${esc(q)}” — ลองคำอื่น หรือ
        <a href="contact.html">สอบถามทีมงานโดยตรง</a></p>`;
      return;
    }
    list.innerHTML = hits.map(h => `
      <a class="search-hit" href="${h.d.u}">
        <span class="sec">${esc(h.d.s)}</span>
        <strong>${mark(h.d.t, q)}</strong>
        <span class="snip">${mark(snippet(h.d.x, q), q)}</span>
      </a>`).join("");
  }

  function load(){
    if(docs || loading) return;
    loading = true;
    fetch("data/search-index.json")
      .then(r => r.ok ? r.json() : [])
      .then(d => { docs = d; render(input.value.trim().toLowerCase()); })
      .catch(() => { docs = []; list.innerHTML = `<p class="search-hint">ค้นหาไม่ได้ในขณะนี้ —
        <a href="contact.html">ติดต่อทีมงาน</a></p>`; });
  }

  function open(){
    box.classList.add("open");
    document.body.style.overflow = "hidden";
    load();
    render("");
    setTimeout(() => input.focus(), 30);
    if(window.lucide) window.lucide.createIcons();
  }
  function close(){
    box.classList.remove("open");
    document.body.style.overflow = "";
    input.value = "";
  }

  btn.addEventListener("click", open);
  box.querySelector(".search-close").addEventListener("click", close);
  box.addEventListener("click", e => { if(e.target === box) close(); });
  input.addEventListener("input", () => render(input.value.trim().toLowerCase()));
  input.addEventListener("keydown", e => {
    if(e.key === "Enter"){
      const first = list.querySelector(".search-hit");
      if(first) location.href = first.getAttribute("href");
    }
  });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape" && box.classList.contains("open")) close();
  });
}

document.addEventListener("DOMContentLoaded", initSite);
