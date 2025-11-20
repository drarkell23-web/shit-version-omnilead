// assets/main.js
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  renderCategories();
  renderServices();
  renderTopContractors();
  renderTestimonials();
  wireUI();
});

async function loadData(){
  try {
    const s = await fetch('/data/services.json').then(r=>r.json()).catch(()=>({services:[]}));
    SERVICES = s.services || [];
  } catch(e){ SERVICES = []; }
  try {
    const c = await fetch('/data/contractors.json').then(r=>r.json()).catch(()=>({contractors:[]}));
    CONTRACTORS = c.contractors || [];
  } catch(e){ CONTRACTORS = []; }
  try {
    const r = await fetch('/data/reviews.json').then(r=>r.json()).catch(()=>({reviews:[]}));
    REVIEWS = r.reviews || [];
  } catch(e){ REVIEWS = []; }
}

function renderCategories(){
  const cats = Array.from(new Set(SERVICES.map(s=>s.category||'Other')));
  const el = document.getElementById('categories');
  el.innerHTML = '';
  cats.forEach(cat=>{
    const d = document.createElement('div'); d.className='cat-pill'; d.textContent = cat;
    d.addEventListener('click', ()=> {
      $$('#servicesGrid .service-pill').forEach(p=>p.style.display='none');
      $$('#servicesGrid .service-pill').forEach(p=>{
        if(p.dataset.cat===cat) p.style.display = 'inline-block';
      });
    });
    el.appendChild(d);
  });
}

function renderServices(){
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';
  SERVICES.slice(0,400).forEach(s=>{
    const p = document.createElement('div');
    p.className = 'service-pill';
    p.dataset.cat = s.category || 'Other';
    p.textContent = s.name;
    p.addEventListener('click', ()=> onServiceClick(s));
    grid.appendChild(p);
  });
}

function renderTopContractors(){
  const el = document.getElementById('topList');
  el.innerHTML = '';
  CONTRACTORS.slice(0,10).forEach(c=>{
    const row = document.createElement('div'); row.className='contractor-row';
    row.innerHTML = `<div><strong>${c.company||c.name}</strong><div class="muted">${c.service||''}</div></div><div class="muted">${c.phone||''}</div>`;
    row.addEventListener('click', ()=> window.open(`/c/${c.id || ''}`,'_blank'));
    el.appendChild(row);
  });
}

function renderTestimonials(){
  const el = document.getElementById('testimonials'); el.innerHTML = '';
  (REVIEWS||[]).slice(0,6).forEach(r=>{
    const e = document.createElement('div'); e.className='testimonial';
    e.innerHTML = `<strong>${r.reviewer_name||r.name||'Customer'}</strong><div class="muted">${r.rating||5} ★</div><div>${r.comment||r.review||''}</div>`;
    el.appendChild(e);
  });
}

function onServiceClick(s){
  // prefill chat
  const chatOpen = document.getElementById('chatOpen');
  if (chatOpen) chatOpen.click();
  setTimeout(()=> {
    const leadService = document.getElementById('leadService');
    if (leadService) leadService.value = s.name;
    // dispatch event consumed by chatbot
    window.dispatchEvent(new CustomEvent('omni-service-selected',{detail:s}));
  },200);
}

function wireUI(){
  document.getElementById('chatOpen').addEventListener('click', ()=> {
    const cm = document.getElementById('chatModal');
    if (cm.classList.contains('hidden')) cm.classList.remove('hidden'); else cm.classList.add('hidden');
    // add starter message
    const f = document.getElementById('chatFlow');
    if (f && f.children.length===0) {
      addBotMessage("Hi! I'm Service Assistant — tell me the service you need or pick from the site. I'll send your request to a contractor.");
    }
  });
  document.getElementById('chatClose').addEventListener('click', ()=> document.getElementById('chatModal').classList.add('hidden'));

  // search
  const sInput = document.getElementById('searchInput');
  if (sInput) sInput.addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    $$('#servicesGrid .service-pill').forEach(p => {
      const ok = p.textContent.toLowerCase().includes(q) || (p.dataset.cat||'').toLowerCase().includes(q);
      p.style.display = ok ? 'inline-block' : 'none';
    });
  });

  // signup button
  const signup = document.getElementById('openSignup');
  if (signup) signup.addEventListener('click', ()=> window.location.href = '/contractor-signup.html');

  // delegate global service-selected to show contractor options in chat
  window.addEventListener('omni-service-selected', (e)=>{
    showContractorOptionsForService(e.detail);
  });
}

// show contractor shortcards inside chat
function showContractorOptionsForService(s){
  const holder = document.getElementById('contractorOptions');
  if (!holder) return;
  holder.innerHTML=''; holder.style.display='flex';
  const matches = (CONTRACTORS||[]).filter(c => (c.service||'').toLowerCase().includes((s.name||'').split(' ')[0].toLowerCase()));
  const use = matches.length ? matches.slice(0,6) : (CONTRACTORS||[]).slice(0,6);
  use.forEach(c => {
    const card = document.createElement('div'); card.className='contractor-card';
    card.innerHTML = `<img src="${c.logo||'/assets/logo-placeholder.png'}"><div class="meta"><strong>${c.company||c.name}</strong><div class="muted">${c.service||''}</div></div><div><button class="btn small pick-btn">Select</button></div>`;
    card.querySelector('.pick-btn').addEventListener('click', ()=>{
      // mark selected contractor id on form
      document.getElementById('leadForm').dataset.contractorId = c.id;
      addBotMessage(`You chose <strong>${c.company}</strong>. I'll send the lead to them.`);
    });
    holder.appendChild(card);
  });
}
