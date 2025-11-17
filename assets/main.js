/* assets/main.js (paste to assets/) */
/* Main + Chatbot wiring */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let SERVICES = [], CONTRACTORS = [], REVIEWS = [];

document.addEventListener('DOMContentLoaded', async ()=>{
  await loadAll();
  wireUI();
  renderSidebar();
  renderServices();
  renderTopSidebar();
  renderTestimonials();
});

async function loadAll(){
  await Promise.all([loadServices(), loadContractors(), loadReviews()]);
}
async function loadServices(){
  try{
    const res = await fetch('/api/services');
    const j = await res.json();
    SERVICES = j.services || [];
  }catch(e){ console.warn('services error',e) }
}
async function loadContractors(){
  try{
    const res = await fetch('/api/contractors');
    const j = await res.json();
    CONTRACTORS = j.contractors || [];
  }catch(e){ console.warn('contractors error',e) }
}
async function loadReviews(){
  try{
    const res = await fetch('/api/reviews');
    const j = await res.json();
    REVIEWS = j.reviews || [];
  }catch(e){ console.warn('reviews error',e) }
}

/* Sidebar and categories */
function renderSidebar(){
  const catEl = document.getElementById('categoryList');
  catEl.innerHTML = '';
  const cats = Array.from(new Set(SERVICES.map(s=>s.category || 'Other')));
  cats.forEach(cat=>{
    const wrapper = document.createElement('div');
    wrapper.className = 'cat';
    wrapper.innerHTML = `<div>${cat}</div><div class="caret">▸</div>`;
    const list = document.createElement('div'); list.className = 'sublist';
    SERVICES.filter(s=> (s.category||'Other')===cat ).slice(0,200).forEach(s=>{
      const b = document.createElement('div'); b.className='svc'; b.textContent=s.name;
      b.addEventListener('click', ()=> {
        document.getElementById('breadcrumb').textContent = cat + ' › ' + s.name;
        onServiceClick(s);
      });
      list.appendChild(b);
    });
    wrapper.appendChild(list);
    wrapper.addEventListener('click', (e)=>{
      if(e.target.classList.contains('svc')) return;
      const open = list.style.display === 'block';
      document.querySelectorAll('.sublist').forEach(n=>n.style.display='none');
      document.querySelectorAll('.cat .caret').forEach(c=>c.textContent='▸');
      if(!open){ list.style.display='block'; wrapper.querySelector('.caret').textContent='▾'; }
    });
    catEl.appendChild(wrapper);
  });
}

/* Services grid */
function renderServices(){
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';
  (SERVICES||[]).slice(0,400).forEach(s=>{
    const c = document.createElement('div'); c.className='service-card';
    c.innerHTML = `<div class="service-title">${s.name}</div><small>${s.category||'Other'}</small>`;
    c.addEventListener('click', ()=> onServiceClick(s));
    grid.appendChild(c);
  });
}

/* Top sidebar list */
function renderTopSidebar(){
  const el = document.getElementById('sidebarTop');
  el.innerHTML = '';
  (CONTRACTORS||[]).slice(0,6).forEach(c=>{
    const d = document.createElement('div'); d.textContent = c.company || c.name || 'Contractor';
    el.appendChild(d);
  });
}

/* Testimonials */
function renderTestimonials(){
  const el = document.getElementById('testimonials');
  el.innerHTML = '';
  (REVIEWS||[]).slice(0,6).forEach(r=>{
    const n = document.createElement('div'); n.className='t-item';
    n.innerHTML = `<strong>${r.reviewer_name||r.name||'Customer'}</strong><div class="muted">${r.rating||5} ★</div><div>${r.comment||r.review||''}</div>`;
    el.appendChild(n);
  });
}

/* When user clicks a service — prefill chat and open chatbot */
function onServiceClick(s){
  const leadService = document.getElementById('leadService');
  if(leadService) leadService.value = s.name;
  openChat();
  addBotMessage(`You selected <strong>${s.name}</strong>. Choose a contractor or send a request.`);
  showContractorOptions(s);
}

/* Contractor selection UI inside chat */
function showContractorOptions(s){
  const holder = document.getElementById('contractorOptions');
  holder.innerHTML = '';
  const matches = (CONTRACTORS||[]).filter(c => (c.service||'').toLowerCase().includes((s.name||'').split(' ')[0].toLowerCase()));
  const top = matches.length ? matches.slice(0,4) : (CONTRACTORS||[]).slice(0,4);
  top.forEach(c=>{
    const card = document.createElement('div'); card.className='contractor-card';
    const img = document.createElement('img'); img.src = c.logo_url || 'assets/logo-placeholder.png';
    const meta = document.createElement('div'); meta.innerHTML = `<div><strong>${c.company||c.name||'Contractor'}</strong></div><div class="muted">${c.service||''}</div>`;
    const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Select';
    btn.addEventListener('click', ()=> {
      document.getElementById('leadForm').dataset.contractorId = c.id;
      addUserMessage(`Selected contractor: ${c.company||c.name}`);
      addBotMessage('Contractor selected — will forward lead to them.');
    });
    card.appendChild(img); card.appendChild(meta); card.appendChild(btn);
    holder.appendChild(card);
  });
}

/* Chat modal helpers */
function wireUI(){
  document.getElementById('openChatBtn').addEventListener('click', openChat);
  document.getElementById('chatClose').addEventListener('click', closeChat);
  document.getElementById('leadForm').addEventListener('submit', async (ev)=>{ ev.preventDefault(); await submitLead(); });
  document.getElementById('searchInput').addEventListener('input', onSearch);
}

/* messages area */
function addBotMessage(txt){ const f=document.getElementById('chatFlow'); const d=document.createElement('div'); d.className='msg bot'; d.innerHTML=txt; f.appendChild(d); f.scrollTop = f.scrollHeight; }
function addUserMessage(txt){ const f=document.getElementById('chatFlow'); const d=document.createElement('div'); d.className='msg user'; d.innerHTML=txt; f.appendChild(d); f.scrollTop = f.scrollHeight; }

function openChat(){ document.getElementById('chatModal').classList.remove('hidden'); addBotMessage('Hi — tell me what you need or pick a service.'); }
function closeChat(){ document.getElementById('chatModal').classList.add('hidden'); }

/* Lead submit */
async function submitLead(){
  const name = document.getElementById('leadName').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();
  const email = document.getElementById('leadEmail').value.trim();
  const service = document.getElementById('leadService').value.trim();
  const message = document.getElementById('leadMessage').value.trim();
  if(!name||!phone||!service){ addBotMessage('Please fill name, phone and service.'); return; }
  addUserMessage(`${name} — ${phone}`);
  addBotMessage('Sending your request...');
  const payload = { name, phone, email, service, message, contractor_id: document.getElementById('leadForm').dataset.contractorId || null };
  try{
    const res = await fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const j = await res.json();
    if(j.ok){ addBotMessage('✅ Request sent. A contractor will contact you.'); document.getElementById('leadForm').reset(); document.getElementById('contractorOptions').innerHTML=''; }
    else addBotMessage('❌ Failed to send: ' + (j.error||'unknown'));
  }catch(e){ console.error(e); addBotMessage('Network error sending lead.'); }
}

/* Search filter */
function onSearch(ev){
  const q = ev.target.value.trim().toLowerCase();
  const filtered = SERVICES.filter(s => s.name.toLowerCase().includes(q) || (s.category||'').toLowerCase().includes(q));
  const grid = document.getElementById('servicesGrid'); grid.innerHTML='';
  filtered.slice(0,200).forEach(s=>{
    const c = document.createElement('div'); c.className='service-card';
    c.innerHTML = `<div class="service-title">${s.name}</div><small>${s.category||'Other'}</small>`;
    c.addEventListener('click', ()=> onServiceClick(s));
    grid.appendChild(c);
  });
}

/* make canvas animation small */
window.addEventListener('resize', ()=>{ const c=document.getElementById('graffitiCanvas'); if(c){ c.width = window.innerWidth; c.height = window.innerHeight; } });
(function initCanvas(){ const c=document.getElementById('graffitiCanvas'); if(!c) return; c.width=window.innerWidth; c.height=window.innerHeight; })();
