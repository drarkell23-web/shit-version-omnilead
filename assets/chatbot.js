// chatbot.js — handles chat widget, lead submission, contractor selection
const $ = sel => document.querySelector(sel);

// small helpers from main.js are already defined in that file when both load. If loaded independently, add fallbacks:
const chatWidget = document.getElementById('chatWidget');
const chatOpenBtn = document.getElementById('chatOpen');
const chatCloseBtn = document.getElementById('chatClose');
const chatFlow = document.getElementById('chatFlow');
const leadForm = document.getElementById('leadForm');

let selectedContractorId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!chatWidget) return;
  chatWidget.style.display = 'none';
  chatOpenBtn.addEventListener('click', ()=> {
    chatWidget.style.display = 'flex';
    addBotMessage('Hi — I am Service Assistant. Tell me your name and what you need or choose a service from the site.');
  });
  chatCloseBtn.addEventListener('click', ()=> chatWidget.style.display = 'none');
  document.getElementById('chatCancel').addEventListener('click', ()=> leadForm.reset());

  // prefill if someone triggered from main.js openChatWithService
  leadForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await submitLeadFromChat();
  });

  // when service select changes hide/show contractor options
  const s = document.getElementById('leadService');
  if (s) s.addEventListener('change', ()=> {
    selectedContractorId = null;
    document.getElementById('contractorPick').style.display = 'none';
  });

  addBotMessage('Welcome! I can help you find the right service or send a request.');
});

/* messages */
function addBotMessage(html){
  const d = document.createElement('div'); d.className='msg bot'; d.innerHTML = html;
  chatFlow.appendChild(d); chatFlow.scrollTop = chatFlow.scrollHeight;
}
function addUserMessage(text){
  const d = document.createElement('div'); d.className='msg user'; d.innerHTML = text;
  chatFlow.appendChild(d); chatFlow.scrollTop = chatFlow.scrollHeight;
}

/* contractor selection UI */
function showContractorOptionsForService(s){
  const holder = document.getElementById('contractorOptions');
  holder.innerHTML = '';
  document.getElementById('contractorPick').style.display = 'block';

  // match by service words
  const matches = (window.CONTRACTORS||[]).filter(c => (c.service||'').toLowerCase().includes((s.name||'').split(' ')[0].toLowerCase()));
  const top = matches.length ? matches.slice(0,4) : (window.CONTRACTORS||[]).slice(0,4);

  top.forEach(c=>{
    const btn = document.createElement('div');
    btn.className = 'card';
    btn.style.display = 'inline-block';
    btn.style.margin = '6px';
    btn.style.cursor = 'pointer';
    btn.innerHTML = `<strong>${c.company||c.name}</strong><div style="font-size:12px;color:rgba(255,255,255,0.6)">${c.service||''}</div>`;
    btn.addEventListener('click', ()=> {
      selectedContractorId = c.id || c.auth_id || null;
      // highlight selection
      Array.from(holder.children).forEach(ch=>ch.style.opacity=0.6);
      btn.style.opacity = 1;
      addBotMessage(`I'll try sending your lead to <strong>${c.company||c.name}</strong>.`);
    });
    holder.appendChild(btn);
  });
}

/* submit lead */
async function submitLeadFromChat(){
  const name = document.getElementById('leadName').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();
  const email = document.getElementById('leadEmail').value.trim();
  const service = document.getElementById('leadService').value.trim();
  const message = document.getElementById('leadMessage').value.trim();

  if (!name || !phone || !service) {
    addBotMessage('Please enter your name, phone and service.');
    return;
  }

  addUserMessage(`${name} — ${phone} — ${service}`);
  addBotMessage('Sending your request...');

  const payload = {
    name, phone, email, service, message, contractorId: selectedContractorId || undefined, source: 'chat'
  };

  try {
    const res = await fetch('/api/lead', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) {
      addBotMessage('✅ Request sent. You will be contacted shortly.');
      leadForm.reset();
      selectedContractorId = null;
      document.getElementById('contractorPick').style.display = 'none';
      // update main page stats if available
      const statEl = document.getElementById('stat-leads');
      if (statEl) statEl.innerText = Number(statEl.innerText || 0) + 1;
      setTimeout(()=> chatWidget.style.display = 'none', 1200);
    } else {
      addBotMessage('❌ Failed to send — please try again.');
    }
  } catch (err){
    console.error(err);
    addBotMessage('Network error while sending lead.');
  }
}
