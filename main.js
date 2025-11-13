let services = [];
let contractors = [];
let testimonials = [];
let selectedService = null;

/* ================================
   LOAD CATEGORIES & SERVICES
================================ */
async function loadServices() {
    const res = await fetch("/api/services");
    const data = await res.json();
    services = data.services || [];

    const cats = [...new Set(services.map(s => s.cat))];

    const catBox = document.getElementById("categoryList");
    catBox.innerHTML = "";

    cats.forEach(cat => {
        const div = document.createElement("div");
        div.className = "category";
        div.innerHTML = `<div class="category-name">${cat}</div>`;

        const under = services.filter(s => s.cat === cat);
        under.forEach(u => {
            const tag = document.createElement("div");
            tag.className = "service-tag";
            tag.textContent = u.name;
            tag.onclick = () => openLeadModal(u.name);
            div.appendChild(tag);
        });

        catBox.appendChild(div);
    });

    loadServiceCards();
}

function loadServiceCards() {
    const grid = document.getElementById("serviceList");
    grid.innerHTML = "";

    services.forEach(s => {
        const card = document.createElement("div");
        card.className = "service-card";
        card.textContent = s.name;
        card.onclick = () => openLeadModal(s.name);
        grid.appendChild(card);
    });
}

/* ================================
   CONTRACTORS (RIGHT SIDE)
================================ */
async function loadContractors() {
    const res = await fetch("/api/contractors");
    const data = await res.json();
    contractors = data.contractors || [];

    const box = document.getElementById("contractorCards");
    box.innerHTML = "";

    contractors.slice(0, 5).forEach(c => {
        const div = document.createElement("div");
        div.className = "contractor-card";
        div.innerHTML = `
            <b>${c.name}</b><br>
            ⭐ ${c.rating || 5}<br>
            <span style="font-size:12px">${c.service || ""}</span>
        `;
        box.appendChild(div);
    });
}

/* ================================
   TESTIMONIAL ROTATION
================================ */
function loadTestimonials() {
    testimonials = [
        { name: "Sarah", text: "Amazing service! Fast and friendly." },
        { name: "Jake", text: "Highly professional and reliable." },
        { name: "Thando", text: "Best pricing and quick turnaround." }
    ];

    rotateTestimonials();
}

function rotateTestimonials() {
    const box = document.getElementById("testimonials");
    box.innerHTML = "";

    testimonials.forEach(t => {
        const div = document.createElement("div");
        div.className = "testimonial";
        div.textContent = `${t.name}: ${t.text}`;
        box.appendChild(div);
    });
}

/* ================================
   LEAD MODAL
================================ */
function openLeadModal(serviceName) {
    selectedService = serviceName;
    document.getElementById("leadTitle").textContent = "Request: " + serviceName;
    document.getElementById("leadModal").classList.remove("hidden");
}

function closeLeadModal() {
    document.getElementById("leadModal").classList.add("hidden");
}

/* SEND LEAD */
async function submitLead() {
    const payload = {
        name: document.getElementById("leadName").value,
        phone: document.getElementById("leadPhone").value,
        email: document.getElementById("leadEmail").value,
        message: document.getElementById("leadMessage").value,
        service: selectedService
    };

    await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    closeLeadModal();
    alert("Your request has been sent!");
}

/* ================================
   INIT
================================ */
loadServices();
loadContractors();
loadTestimonials();
