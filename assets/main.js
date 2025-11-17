// assets/main.js
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadServices();
  await loadContractors();
  await loadReviews();
  wireButtons();
  populateServiceSelect();
});

async function loadServices() {
  try {
    const res = await fetch("/api/services");
    const j = await res.json();
    SERVICES = j.services || j || [];
    renderCategories();
    renderServices();
  } catch (e) {
    console.warn("services load failed", e);
    $("#servicesGrid").textContent = "Services unavailable.";
  }
}

async function loadContractors() {
  try {
    const res = await fetch("/api/contractors");
    const j = await res.json();
    CONTRACTORS = j.contractors || j || [];
    renderTopContractors();
  } catch (e) {
    console.warn("contractors load failed", e);
  }
}

async function loadReviews() {
  try {
    const res = await fetch("/api/review");
    const j = await res.json();
    REVIEWS = j.reviews || j || [];
    renderTestimonials();
  } catch (e) {
    console.warn("reviews load failed", e);
  }
}

function renderCategories() {
  const catsEl = $("#categories");
  if (!catsEl) return;
  catsEl.innerHTML = "";
  const cats = Array.from(new Set(SERVICES.map(s => s.category || "Other")));
  cats.forEach(cat => {
    const d = document.createElement("div");
    d.className = "cat";
    d.textContent = cat;
    d.addEventListener("click", () => {
      document.querySelectorAll(".service-pill").forEach(p => p.style.display = "none");
      document.querySelectorAll(".service-pill").forEach(p => {
        if (p.dataset.cat === cat) p.style.display = "inline-block";
      });
    });
    catsEl.appendChild(d);
  });
}

function renderServices() {
  const grid = $("#servicesGrid");
  if (!grid) return;
  grid.innerHTML = "";
  (SERVICES || []).slice(0, 400).forEach(s => {
    const p = document.createElement("div");
    p.className = "service-pill";
    p.textContent = s.name;
    p.dataset.cat = s.category || "Other";
    p.addEventListener("click", () => onServiceClick(s));
    grid.appendChild(p);
  });
}

function renderTopContractors() {
  const el = $("#topList"); if (!el) return;
  el.innerHTML = "";
  const tops = (CONTRACTORS || []).filter(c => c.badge === "Platinum" || c.badge === "Diamond").slice(0,6);
  const use = tops.length ? tops : (CONTRACTORS || []).slice(0,6);
  use.forEach(c => {
    const row = document.createElement("div");
    row.className = "contractor-row";
    row.innerHTML = `<strong>${c.company || c.name || "Contractor"}</strong><div class="muted">${c.service||''}</div>`;
    row.addEventListener("click", ()=> window.open(`/c/${c.id || c.auth_id}`, "_blank"));
    el.appendChild(row);
  });
}

function renderTestimonials() {
  const el = $("#testimonials"); if (!el) return;
  el.innerHTML = "";
  (REVIEWS || []).slice(0,8).forEach(r => {
    const node = document.createElement("div");
    node.style.padding = "8px";
    node.style.borderBottom = "1px solid #ffffff06";
    node.innerHTML = `<strong>${r.name || r.reviewer_name || ""}</strong><div class="muted">${r.rating||0} ★</div><div>${r.review||r.comment||""}</div>`;
    el.appendChild(node);
  });
}

function onServiceClick(s) {
  const chatOpenBtn = $("#chatOpen");
  if (!chatOpenBtn) return;
  chatOpenBtn.click();
  setTimeout(() => {
    const leadService = document.getElementById("leadService");
    if (leadService) leadService.value = s.name;
    window.dispatchEvent(new CustomEvent("omni-service-selected", { detail: s }));
  }, 220);
}

function wireButtons() {
  const b1 = $("#btnContractor"); if (b1) b1.addEventListener("click", ()=> (location.href="/contractor-dashboard.html"));
  const b2 = $("#btnAdmin"); if (b2) b2.addEventListener("click", ()=> (location.href="/admin-dashboard.html"));
  const b3 = $("#btnReviews"); if (b3) b3.addEventListener("click", ()=> (location.href="/reviews.html"));

  const reqBtn = document.getElementById("reqSubmit");
  if (reqBtn) reqBtn.addEventListener("click", async () => {
    const payload = {
      name: $("#reqName").value,
      phone: $("#reqPhone").value,
      email: $("#reqEmail").value,
      service: $("#reqService").value,
      message: $("#reqMessage").value
    };
    if (!payload.name || !payload.phone || !payload.service) return alert("Please provide name, phone and service.");
    const res = await fetch("/api/lead", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) alert("Request sent. Thank you."); else alert("Failed to send.");
  });
}

function populateServiceSelect() {
  const sel = document.getElementById("reqService");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select a service</option>';
  (SERVICES || []).slice(0,400).forEach(s => {
    const o = document.createElement("option");
    o.value = s.name; o.textContent = `${s.name} — ${s.category || ''}`; sel.appendChild(o);
  });
}
