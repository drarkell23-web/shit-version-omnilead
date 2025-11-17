// public/assets/chatbot.js
// Chat UI + lead submit. This front-end posts leads to /api/lead
const $ = sel => document.querySelector(sel);

let SERVICES = [];
let CONTRACTORS = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  wireChatUI();
  window.addEventListener('omni-service-selected', onServiceSelected);
});

async function loadData(){
  try{ const s = await fetch('/api/services'); SERVICES = (await s.json()).services || []; }catch(e){}
  try{ const c = await fetch('/api/contractors'); CONTRACTORS = (await c.json()).contractors || []; }catch(e){}
}

function wireChatUI(){
  const chatOpen = document.getElementById('chatOpen');
  const chatClose = document.getElementById('chatClose');
  const chatModal = document.getElementById('chatModal');
  const leadForm = document.getElementById('leadForm');
  const chatCancel = document.getElementById('chatCancel');

  chatOpen?.addEventListener('click', ()=> { chatModal.classList.toggle('hidden'); scrollChatToBottom(); addBotMessage('Hi! Tell me what you need, or choose a service.'); });
  chatClose?.addEventListener('click', ()=> chatModal.classList.add('hidden'));
  chatCancel?.addEventListener('click', ()=> chatModal.classList.add('hidden'));

  leadForm?.addEventListener('submit', async (ev)=> {
    ev.preventDefault();
    await submitLeadFromForm();
  });

  // wire initial bot message area
  addBotMessage('Welcome to Service Point SA. Choose a service or tell me what you need.');
}

function onServiceSelected(e){
  const svc = e.detail;
  const leadService = document.getElementById('leadService');
  if(leadService) leadService.value = svc.name || svc;
  addBotMessage(`You selected <strong>${svc.name||svc}</strong>. Tell me a little about the job or pick a contractor.`);
  showContractorOptionsForService(svc);
  // open chat
  const chatModal = document.getElementById('chatModal');
  if(chatModal) chatModal.classList.remove('hidden');
}

function addBotMessage(html){
  const flow = document.getElementById('chatFlow');
  if(!flow) return;
  const d = document.createElement('div'); d.className='msg bot'; d.innerHTML = html;
  flow.appendChild(d); scrollChatToBottom();
}
function addUserMessage(text){
  const flow = document.getElementById('chatFlow');
  if(!flow) return;
  const d = document.createElement('div'); d.className='msg user'; d.textContent = text;
  flow.appendChild(d); scrollChatToBottom();
}
function scrollChatToBottom(){ const f = document.getElementById('chatFlow'); if(f) f.scrollTop = f.scrollHeight; }

// show contractor options for a service
function showContractorOptionsForService(s){
  const holder = document.getElementById('contractorOptions');
  const pick = document.getElementById('contractorPick');
  if(!holder || !pick) return;
  holder.innerHTML = '';
  pick.style.display = 'block';
  const q = (s.name || s).split(' ')[0].toLowerCase();
  const matches = (CONTRACTORS||[]).filter(c => (c.service||'').toLowerCase().includes(q));
  const list = matches.length ? matches.slice(0,6) : (CONTRACTORS||[]).slice(0,6);
  list.forEach(c=>{
    const node = document.createElement('div'); node.className='contractor-card';
    node.innerHTML = `<img src="${c.logo_url || '/assets/default-logo.png'}" alt="logo"><div class="meta"><strong>${c.company||c.name}</strong><div class="muted">${c.service||''}</div></div>`;
    const btn = document.createElement('button'); btn.textContent = 'Select';
    btn.addEventListener('click', ()=> {
      document.getElementById('leadForm').dataset.contractorId = c.id;
      addBotMessage(`Will send to <strong>${c.company||c.name}</strong>.`);
    });
    node.appendChild(btn);
    holder.appendChild(node);
  });
}

// submit lead
async function submitLeadFromForm(){
  const name = (document.getElementById('leadName') || {}).value?.trim();
  const phone = (document.getElementById('leadPhone') || {}).value?.trim();
  const email = (document.getElementById('leadEmail') || {}).value?.trim();
  const service = (document.getElementById('leadService') || {}).value?.trim();
  const message = (document.getElementById('leadMessage') || {}).value?.trim();
  const contractorId = document.getElementById('leadForm').dataset.contractorId || null;

  if(!name || !phone || !service){
    addBotMessage('Please provide your name, phone and service.');
    return;
  }
  addUserMessage(`${name} — ${phone}`);
  addBotMessage('Sending your request...');

  try{
    const res = await fetch('/api/lead', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        name, phone, email, service, message, contractor_id: contractorId
      })
    });
    const j = await res.json();
    if(j.ok){
      addBotMessage('✅ Request sent. A contractor will contact you soon.');
      document.getElementById('leadForm').reset();
      document.getElementById('contractorPick').style.display='none';
      // optional small confetti or animation -> keep simple
      setTimeout(()=> document.getElementById('chatModal')?.classList.add('hidden'), 1400);
    } else {
      addBotMessage('❌ Failed to send: ' + (j.error || 'unknown error'));
    }
  }catch(err){
    console.error(err);
    addBotMessage('Network error sending lead.');
  }
}
