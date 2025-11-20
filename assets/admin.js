
const $ = id=>document.getElementById(id);
async function create(){
  const body = { company: $('company').value, phone: $('phone').value, password: $('password').value, telegram: $('telegram').value };
  if(!body.company||!body.phone||!body.password){$('status').innerText='Fill required';return;}
  const res = await fetch('/api/admin/create-contractor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j = await res.json();
  if(j.ok){ $('status').innerText='Created'; listContractors(); } else $('status').innerText = j.error || 'Failed';
}
$('createBtn').addEventListener('click', create);

async function listContractors(){
  const res = await fetch('/api/contractors');
  const j = await res.json();
  const list = $('list'); list.innerHTML = '';
  if(j.contractors && j.contractors.length){
    j.contractors.forEach(c=>{
      const el = document.createElement('div'); el.innerHTML = `<strong>${c.company}</strong> — ${c.phone} ${c.telegram_chat_id?'<span style="color:#9fb5d4">('+c.telegram_chat_id+')</span>':''}`;
      list.appendChild(el);
    });
  } else list.innerText = 'No contractors';
}
$('refreshBtn').addEventListener('click', listContractors);
listContractors();
