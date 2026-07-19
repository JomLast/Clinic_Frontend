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
  address:  "320/12 ข้างบิ๊กซีนครสวรรค์ ถ.สายเอเชีย ต.นครสวรรค์ตก อ.เมือง จ.นครสวรรค์ 60000",
  mapLink:  "https://maps.app.goo.gl/9gafEAtYKx8WSJxn7",
  mapEmbed: "https://www.google.com/maps?q=15.6959822,100.1217192&z=17&hl=th&output=embed",
  hoursWeekday: "09:00 – 20:00 น.",
  hoursWeekend: "09:00 – 18:00 น.",
};

/* ----- ไอคอนเส้น (SVG, Lucide-style) — ใช้ currentColor เข้าธีมอัตโนมัติ ----- */
const ICON = {
  phone:    `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  clock:    `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  pin:      `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  facebook: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
  chat:     `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  alert:    `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

/* ----- เมนูหลัก (มี dropdown) ----- */
const NAV = [
  { label:"หน้าหลัก", href:"index.html", id:"home" },
  { label:"สายพันธุ์ที่เรารักษา", href:"animals.html", id:"animals", sub:[
      { label:"🐶 สุนัข", href:"animals.html" },
      { label:"🐱 แมว", href:"animals.html" },
      { label:"🐰 กระต่าย", href:"animals.html" },
      { label:"🦜 นก", href:"animals.html" },
      { label:"🦎 สัตว์พิเศษ (Exotic)", href:"animals.html" },
  ]},
  { label:"ศูนย์ และคลินิกเฉพาะทาง", href:"centers.html", id:"centers", sub:[
      { label:"🩺 อายุรกรรม", href:"centers.html" },
      { label:"✂️ ศัลยกรรม", href:"centers.html" },
      { label:"🦷 ทันตกรรม", href:"centers.html" },
      { label:"🔬 ห้องปฏิบัติการ", href:"centers.html" },
  ]},
  { label:"บริการของเรา", href:"services.html", id:"services", sub:[
      { label:"💉 ฉีดวัคซีน", href:"services.html" },
      { label:"🩺 ตรวจสุขภาพ", href:"services.html" },
      { label:"✂️ ผ่าตัด & ทำหมัน", href:"services.html" },
      { label:"🚨 รับปรึกษาฉุกเฉิน", href:"services.html" },
  ]},
  { label:"เพ็ทช็อป", href:"shop.html", id:"shop" },
  { label:"เกี่ยวกับเรา", href:"about.html", id:"about", sub:[
      { label:"🏥 รู้จัก Asiapet", href:"about.html" },
      { label:"🚀 วิสัยทัศน์ & อนาคต", href:"about.html#future" },
  ]},
  { label:"สาระน่ารู้", href:"articles.html", id:"articles" },
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
        <span>${ICON.phone} ${SITE.phone}</span>
        <span>${ICON.clock} เปิดทุกวัน ${SITE.hoursWeekday}</span>
      </div>
    </div>
  </div>
  <header>
    <nav class="container">
      <a href="index.html" class="brand" aria-label="Asiapet Animal Hospital">
        <img class="brand-logo" src="logo.png" alt="Asiapet Animal Hospital" />
      </a>
      <div class="nav-links" id="navLinks">${links}</div>
      <div class="nav-right">
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
          <a href="index.html" class="footer-logo" aria-label="Asiapet Animal Hospital">
            <span class="footer-logo-img" role="img" aria-label="Asiapet Animal Hospital"></span>
          </a>
          <p>โรงพยาบาลสัตว์ครบวงจร ดูแลสัตว์เลี้ยงของคุณด้วยหัวใจ มุ่งสู่การเป็นโรงพยาบาลสัตว์เต็มรูปแบบ</p>
          <p style="display:flex;gap:8px;align-items:flex-start"><span>${ICON.pin}</span> ${SITE.address}</p>
          <div class="socials">
            <a href="${SITE.facebook}" target="_blank" rel="noopener" title="Facebook">f</a>
            <a href="${SITE.line}" target="_blank" rel="noopener" title="LINE">L</a>
            <a href="${SITE.instagram}" target="_blank" rel="noopener" title="Instagram">IG</a>
          </div>
        </div>
        <div>
          <h5>เมนู</h5>
          <ul>
            <li><a href="about.html">เกี่ยวกับเรา</a></li>
            <li><a href="services.html">บริการของเรา</a></li>
            <li><a href="centers.html">ศูนย์เฉพาะทาง</a></li>
            <li><a href="animals.html">สายพันธุ์ที่เรารักษา</a></li>
            <li><a href="shop.html">เพ็ทช็อป</a></li>
            <li><a href="articles.html">สาระน่ารู้</a></li>
            <li><a href="vaccine.html">ตารางวัคซีน</a></li>
          </ul>
        </div>
        <div>
          <h5>เวลาทำการ</h5>
          <ul>
            <li>เปิดทุกวัน<br>${SITE.hoursWeekday}</li>
            <li style="color:var(--red);display:flex;align-items:center;gap:7px">${ICON.alert} ฉุกเฉิน: โทรปรึกษาได้</li>
          </ul>
        </div>
        <div>
          <h5>ติดต่อเรา</h5>
          <ul>
            <li><a href="tel:${SITE.phoneTel}">${ICON.phone} ${SITE.phone}</a></li>
            <li><a href="${SITE.facebook}" target="_blank" rel="noopener">${ICON.facebook} Facebook: asiapetclinic</a></li>
            <li><a href="${SITE.line}" target="_blank" rel="noopener">${ICON.chat} LINE: ${SITE.lineId}</a></li>
            <li><a href="${SITE.mapLink}" target="_blank" rel="noopener">${ICON.pin} ดูแผนที่ / นำทาง</a></li>
          </ul>
        </div>
      </div>
      <div class="foot-bottom">© 2026 Asiapet Animal Hospital — สงวนลิขสิทธิ์ทุกประการ</div>
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
    ".qr-card", ".cta-band", ".fb-item", ".hero-inner > *", ".page-banner > .container > *"
  ];
  const revealEls = document.querySelectorAll(revealSel.join(","));
  revealEls.forEach(el => el.classList.add("reveal"));

  // หน่วงเวลาแบบไล่ลำดับให้การ์ดในแถวเดียวกันทยอยขึ้น
  document.querySelectorAll(".cards, .animals-row, .article-grid, .roadmap, .feature-bar .container").forEach(group => {
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
    s.src = "lucide.min.js";
    s.onload = renderIcons;
    document.head.appendChild(s);
  }

  // หมายเหตุ: ฟอร์มจองนัดส่งเข้าอีเมลคลินิกผ่าน Web3Forms — สคริปต์อยู่ท้าย contact.html (ไม่มี backend)
}
document.addEventListener("DOMContentLoaded", initSite);
