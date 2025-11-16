// main.js — loads services, contractors, reviews and wires UI buttons
// guard to avoid double load
if (!window.__omni_main_loaded) {
  window.__omni_main_loaded = true;

  (function () {
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

    // --- safe fetch helper (tries several endpoints) ---
    async function tryJsonFetch(urls) {
      for (const u of urls) {
        try {
          const res = await fetch(u, { cache: 'no-store' });
          if (!res.ok) continue;
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            return await res.json();
          } else {
            const txt = await res.text();
            if (txt.trim().startsWith('<')) continue;
            try { return JSON.parse(txt); } catch (e) { continue; }
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    }

    // =========================
    // LOAD SERVICES
    // =========================
    async function loadServices() {
      const j = await tryJsonFetch(['/api/services', '/services', '/api/service', '/api/services.js']);
      if (j && (j.services || Array.isArray(j))) {
        SERVICES = j.services || j;
        renderCategories();
        renderServices();
      } else {
        SERVICES = [];
        console.warn("services load failed or returned non-json. Showing 'Services unavailable.'");
        const el = $("#servicesGrid");
        if (el) el.textContent = "Services unavailable.";
      }
    }

    // =========================
    // LOAD CONTRACTORS
    // =========================
    async function loadContractors() {
      const j = await tryJsonFetch(['/api/contractors', '/contractors', '/api/contractor', '/api/contractors.js']);
      if (j && (j.contractors || Array.isArray(j))) {
        CONTRACTORS = j.contractors || j;
        renderTopContractors();
      } else {
        CONTRACTORS = [];
        console.warn("contractors load failed or returned non-json.");
      }
    }

    // =========================
    // LOAD REVIEWS
    // =========================
    async function loadReviews() {
      // try plural and singular endpoints used in different servers
      const j = await tryJsonFetch(['/api/reviews', '/api/review', '/reviews', '/review']);
      if (j && (j.reviews || Array.isArray(j))) {
        REVIEWS = j.reviews || j || [];
        renderTestimonials();
      } else {
        REVIEWS = [];
        console.warn("reviews load failed or returned non-json.");
      }
    }

    // =========================
    // RENDER CATEGORIES
    // =========================
    function renderCategories() {
      const catsEl = $("#categories");
      if (!catsEl) return;
      catsEl.innerHTML = "";
      const cats = Array.from(new Set(SERVICES.map(s => s.category || "Other")));
      cats.forEach(cat => {
        const d = document.createElement("div"); d.className = "cat"; d.textContent = cat;
        d.addEventListener("click", () => {
          document.querySelectorAll(".service-pill").forEach(p => (p.style.display = "none"));
          document.querySelectorAll(".service-pill").forEach(p => { if (p.dataset.cat === cat) p.style.display = "inline-block"; });
        });
        catsEl.appendChild(d);
      });
    }

    // =========================
    // RENDER SERVICES
    // =========================
    function renderServices() {
      const grid = $("#servicesGrid"); if (!grid) return;
      grid.innerHTML = "";
      (SERVICES || []).slice(0, 400).forEach(s => {
        const p = document.createElement("div"); p.className = "service-pill"; p.textContent = s.name; p.dataset.cat = s.category;
        p.addEventListener("click", () => onServiceClick(s));
        grid.appendChild(p);
      });
    }

    // =========================
    // TOP CONTRACTORS
    // =========================
    function renderTopContractors() {
      const el = $("#topList"); if (!el) return;
      el.innerHTML = "";
      const tops = (CONTRACTORS || []).filter(c => c.badge === "Platinum" || c.badge === "Diamond").slice(0, 6);
      const use = tops.length ? tops : (CONTRACTORS || []).slice(0, 6);
      use.forEach(c => {
        const row = document.createElement("div"); row.className = "contractor-row";
        row.innerHTML = `<strong>${c.company || c.name || "Contractor"}</strong><div class="muted">${c.service || ""}</div>`;
        row.addEventListener("click", () => window.open(`/c/${c.id}`, "_blank"));
        el.appendChild(row);
      });
    }

    // =========================
    // RENDER TESTIMONIALS
    // =========================
    function renderTestimonials() {
      const el = $("#testimonials"); if (!el) return;
      el.innerHTML = "";
      (REVIEWS || []).slice(0, 8).forEach(r => {
        const node = document.createElement("div"); node.style.padding = "8px"; node.style.borderBottom = "1px solid #ffffff06";
        node.innerHTML = `<strong>${r.name || r.reviewer_name || ""}</strong><div class="muted">${r.rating || 0} ★</div><div>${r.review || r.comment || ""}</div>`;
        el.appendChild(node);
      });
    }

    // =========================
    // SERVICE CLICK → Chatbot
    // =========================
    function onServiceClick(s) {
      const chatOpenBtn = $("#chatOpen"); if (!chatOpenBtn) return;
      chatOpenBtn.click();
      setTimeout(() => {
        const leadService = document.getElementById("leadService"); if (leadService) leadService.value = s.name;
        window.dispatchEvent(new CustomEvent("omni-service-selected", { detail: s }));
      }, 220);
    }

    // =========================
    // BUTTON LOGIC
    // =========================
    function wireButtons() {
      const b1 = $("#btnContractor"); if (b1) b1.addEventListener("click", () => (location.href = "/contractor-dashboard.html"));
      const b2 = $("#btnAdmin"); if (b2) b2.addEventListener("click", () => (location.href = "/admin-dashboard.html"));
      const b3 = $("#btnReviews"); if (b3) b3.addEventListener("click", () => (location.href = "/reviews.html"));
      const b4 = $("#topContractorsBtn"); if (b4) b4.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); });

      // Lead Submit button (non-chat form)
      const reqBtn = document.getElementById("reqSubmit");
      if (reqBtn) reqBtn.addEventListener("click", async () => {
        const payload = { name: $("#reqName") ? $("#reqName").value : "", phone: $("#reqPhone") ? $("#reqPhone").value : "", email: $("#reqEmail") ? $("#reqEmail").value : "", service: $("#reqService") ? $("#reqService").value : "", message: $("#reqMessage") ? $("#reqMessage").value : "" };
        if (!payload.name || !payload.phone || !payload.service) return alert("Please provide name, phone and service.");

        // try server endpoints list
        const leadUrls = ['/api/lead', '/lead', '/api/leads', '/leads'];
        let ok = false;
        for (const url of leadUrls) {
          try {
            const res = await fetch(url, { method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) continue;
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const j = await res.json();
              if (j.ok) { ok = true; break; }
              else { alert('Failed: ' + (j.error || 'server error')); ok = true; break; }
            } else {
              // HTML returned, try next
              continue;
            }
          } catch (e) { continue; }
        }
        if (ok) alert("Request sent. Thank you."); else alert("Failed to send. Check console.");
      });
    }

    // =========================
    // POPULATE DROPDOWN
    // =========================
    function populateServiceSelect() {
      const sel = document.getElementById("reqService"); if (!sel) return;
      sel.innerHTML = '<option value="">Select a service</option>';
      (SERVICES || []).slice(0, 400).forEach(s => {
        const o = document.createElement("option"); o.value = s.name; o.textContent = `${s.name} — ${s.category}`; sel.appendChild(o);
      });
    }

    // expose small helpers if needed
    window.omniMain = { reloadAll: async () => { await loadServices(); await loadContractors(); await loadReviews(); renderServices(); renderTopContractors(); renderTestimonials(); } };

  })();
}
