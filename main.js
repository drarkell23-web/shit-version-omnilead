// public/assets/main.js
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadServices();
  await loadContractors();
  await loadReviews();
  renderCategories();
  renderServices();
  renderTopContractors();
  renderTestimonials();
  wireUI();
  wireSearch();
});

// fetch helpers
async function apiGET(path){ try{ const r = await fetch(path); return await r.json(); }catch(e){ console.warn('api err',e); return {}; } }

async function loadServices(){
  const j = await apiGET('/api/services');
  SERVICES = j.services || [];
}
async function loadContractors(){
  const j = await apiGET('/api/contractors');
  CONTRACTORS = j.contractors || [];
}
async function loadReviews(){
  const j = await apiGET('/api/reviews');
  REVIEWS = j.reviews || [];
}

// render categories
function renderCategories(){
  const el = $('#categories');
  if(!el) return;
  el.innerHTML = '';
  const cats = Array.from(new Set(SERVICES.map(s=>s.category||'Other')));
  cats.forEach(cat=>{
    const d = document.createElement('div'); d.className='cat-pill'; d.textContent = cat;
    d.addEventListener('click', ()=> filterByCategory(cat));
    el.appendChild(d);
  });
}
function filterByCategory(cat){
  document.querySelectorAll('.service-pill').forEach(p => {
    p.style.display = (p.dataset.cat === cat) ? 'inline-flex' : 'none';
  });
}

// render services
function renderServices(){
  const grid = $('#servicesGrid');
  if(!grid) return;
  grid.innerHTML = '';
  (SERVICES||[]).forEach(s=>{
    const p = document.createElement('div'); p.className='service-pill'; p.textContent = s.name; p.dataset.cat = s.category || 'Other';
    p.addEventListener('click', ()=> onServiceClick(s));
    grid.appendChild(p);
  });
}

// service clicked -> open chat and prefill
function onServiceClick(s){
  const evt = new CustomEvent('omni-service-selected', { detail: s });
  window.dispatchEvent(evt);
  // also open chat by clicking button
  const chatBtn = document.getElementById('chatOpen');
  if(chatBtn) chatBtn.click();
}

// top contractors
function renderTopContractors(){
  const el = document.getElementById('topList');
  if(!el) return;
  el.innerHTML = '';
  const tops = (CONTRACTORS||[]).slice(0,6);
  tops.forEach(c=>{
    const row = document.createElement('div');
    row.innerHTML = `<strong>${c.company||c.name||'Contractor'}</strong><div class="muted">${c.service||''}</div>`;
    row.addEventListener('click', ()=> window.location.href = `/c/${c.id}`);
    el.appendChild(row);
  });
}

// testimonials
function renderTestimonials(){
  const el = document.getElementById('testimonials');
  if(!el) return;
  el.innerHTML = '';
  (REVIEWS||[]).slice(0,8).forEach(r=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<strong>${r.reviewer_name||r.name||'Customer'}</strong><div class="muted">${r.rating||5} ★</div><div class="muted small">${r.comment||r.review||''}</div>`;
    el.appendChild(card);
  });
}

// UI wiring
function wireUI(){
  $('#menuToggle')?.addEventListener('click', ()=> {
    const sb = document.getElementById('sidebar');
    if(sb.style.display === 'none') sb.style.display = 'flex'; else sb.style.display = 'none';
  });

  // chat open/close are handled in chatbot.js but ensure events exist
  // deep link support for /c/<id>
  const path = location.pathname;
  if(path.startsWith('/c/')){
    const id = path.split('/c/')[1];
    if(id) { window.location.hash = ''; setTimeout(()=> { showContractorProfile(id); }, 400); }
  }
}

// search (simple)
function wireSearch(){
  $('#searchInput')?.addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.service-pill').forEach(p=>{
      const t = p.textContent.toLowerCase();
      p.style.display = t.includes(q) ? 'inline-flex' : 'none';
    });
  });
}

// show contractor profile — basic client-side loader (server should serve data)
async function showContractorProfile(id){
  const r = await apiGET('/api/contractor?id=' + encodeURIComponent(id));
  if(!r.ok) return alert('Contractor not found');
  const c = r.contractor;
  const html = `
    <div style="padding:20px;">
      <a href="/" style="color:#9aa3b2">← Back</a>
      <h1>${c.company||c.name}</h1>
      <div style="color:#9aa3b2">${c.service||''}</div>
      <p>${c.about||c.description||''}</p>
      <div style="margin-top:12px">
        <button onclick="window.dispatchEvent(new CustomEvent('omni-service-selected',{detail:{name:'${c.service||'Service'}'}})); document.getElementById('chatOpen').click();" class="btn primary">Request ${c.service}</button>
      </div>
    </div>
  `;
  document.body.innerHTML = html;
}
