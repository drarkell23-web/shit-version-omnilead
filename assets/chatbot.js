// assets/chatbot.js
const $ = sel => document.querySelector(sel);

function addBotMessage(text){
  const flow = document.getElementById('chatFlow');
  if (!flow) return;
  const d = document.createElement('div'); d.className='msg bot'; d.innerHTML = text;
  flow.appendChild(d); flow.scrollTop = flow.scrollHeight;
}
function addUserMessage(text){
  const flow = document.getElementById('chatFlow');
  if (!flow) return;
  const d = document.createElement('div'); d.className='msg user'; d.innerHTML = text;
  flow.appendChild(d); flow.scrollTop = flow.scrollHeight;
}

// wire form
document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('leadForm');
  if (form){
    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const name = document.getElementById('leadName').value.trim();
      const phone = document.getElementById('leadPhone').value.trim();
      const email = document.getElementById('leadEmail').value.trim();
      const service = document.getElementById('leadService').value.trim();
      const message = document.getElementById('leadMessage').value.trim();
      const contractorId = form.dataset.contractorId || undefined;

      if (!name || !phone || !service) { addBotMessage('Please provide your name, phone and service.'); return; }
      addUserMessage(`${name} — ${phone} — ${service}`);

      addBotMessage('Sending your request...');

      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ name, phone, email, service, message, contractorId, source: 'chat' })
        });
        const j = await res.json();
        if (j.ok) {
          addBotMessage('✅ Request sent. A contractor will contact you soon.');
          form.reset(); form.dataset.contractorId = '';
          // hide contractor options
          const holder = document.getElementById('contractorOptions'); if(holder) holder.style.display='none';
          // auto close after a bit
          setTimeout(()=> document.getElementById('chatModal').classList.add('hidden'), 1200);
        } else {
          addBotMessage('❌ Failed to send: ' + (j.error || 'server error'));
        }
      } catch (err) {
        console.error(err);
        addBotMessage('Network error sending request.');
      }
    });
  }
});
S