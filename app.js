// Admin dashboard client (uses Render API)
const API_BASE = "https://service-point-sa-1.onrender.com"; // <<-- replace if needed

document.addEventListener('DOMContentLoaded', ()=>{
  // nav
  $('showCreate').addEventListener('click', ()=>showPanel('create'));
  $('showContractors').addEventListener('click', ()=>showPanel('contractors'));
  $('showLeads').addEventListener('click', ()=>showPanel('leads'));
  $('showReviews').addEventListener('click', ()=>showPanel('reviews'));
  $('createContractor').addEventListener('click', createContractor);

  loadContractors();
  loadLeads();
  loadReviews();
});

function $(id){return document.getElementById(id)}
function showPanel(k){
  $('createSection').classList.add('hidden');
  $('contractorsSection').classList.add('hidden');
  $('leadsSection').classList.add('hidden');
  $('reviewsSection').classList.add('hidden');
  if(k==='create') $('createSection').classList.remove('hidden');
  if(k==='contractors') $('contractorsSection').classList.remove('hidden');
  if(k==='leads') $('leadsSection').classList.remove('hidden');
  if(k==='reviews') $('reviewsSection').classList.remove('hidden');
}

async function createContractor(){
  const company = $('cCompany').value.trim();
  const phone = $('cPhone').value.trim();
  const password = $('cPassword').value;
  const telegram = $('cTelegram').value.trim();
  const adminKey = $('adminKey').value.trim();

  if(!company||!phone||!password) return alert('company,phone,password required');

  const payload = { company, phone, password, telegram };

  const headers = { 'Content-Type':'application/json' };
  if(adminKey) headers['x-admin-key'] = adminKey;

  try{
    const res = await fetch(API_BASE + '/api/admin/create-contractor', { method:'POST', headers, body: JSON.stringify(payload) });
    const j = await res.json();
    if(!j.ok) { $('createResult').textContent = 'Error: ' + (j.error||''); return; }
    $('createResult').textContent = 'Contractor created.';
    loadContractors();
  }catch(e){$('createResult').textContent = 'Network error'}
}

async function loadContractors(){
  try{
    const res = await fetch(API_BASE + '/api/contractors');
    const j = await res.json();
    const list = $('contractorsList');
    list.innerHTML = '';
    (j.contractors||[]).forEach(c=>{
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<div><strong>${escape(c.company||c.name||'')}</strong><div class="muted">${escape(c.phone||'')}</div></div><div><button data-id="${c.id}" class="btn small">Edit</button></div>`;
      list.appendChild(row);
    });
  }catch(e){console.error(e)}
}

async function loadLeads(){
  try{
    const res = await fetch(API_BASE + '/api/leads');
    const j = await res.json();
    const list = $('leadsList');
    list.innerHTML = '';
    (j.leads||[]).forEach(l=>{
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<div><strong>${escape(l.name)}</strong><div class="muted">${escape(l.phone)} • ${escape(l.service)}</div></div><div>${new Date(l.created_at||'').toLocaleString()}</div>`;
      list.appendChild(row);
    });
  }catch(e){console.error(e)}
}

async function loadReviews(){
  try{
    const res = await fetch(API_BASE + '/api/reviews');
    const j = await res.json();
    const list = $('reviewsList');
    list.innerHTML = '';
    (j.reviews||[]).forEach(r=>{
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<div><strong>${escape(r.reviewer_name||r.name||'')}</strong><div class="muted">${escape(r.rating)} ★ — ${escape(r.comment||r.review||'')}</div></div><div>${new Date(r.created_at||'').toLocaleDateString()}</div>`;
      list.appendChild(row);
    });
  }catch(e){console.error(e)}
}

function escape(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
