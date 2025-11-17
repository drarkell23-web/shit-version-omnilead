// public/contractor-dashboard-auth.js (paste to public/)
import { supabase, getCurrentUser } from './supabase-client.js';

const $ = id => document.getElementById(id);

async function ensureUser(){
  const user = await getCurrentUser();
  if(!user){ window.location.href = '/contractor-login.html'; throw new Error('redirect'); }
  return user;
}

async function loadProfile(){
  const user = await ensureUser();
  // try load contractor by auth_id
  const { data } = await supabase.from('contractors').select('*').eq('auth_id', user.id).maybeSingle();
  if(!data){
    // create row
    const { data: inserted } = await supabase.from('contractors').insert([{ auth_id: user.id, email: user.email, company: user.user_metadata?.company||'', created_at: new Date().toISOString() }]).select().maybeSingle();
    window.omniProfile = inserted;
  } else {
    window.omniProfile = data;
  }

  // populate UI
  $('cName').textContent = window.omniProfile.company || user.user_metadata?.company || 'Contractor';
  $('cService').textContent = window.omniProfile.service || '';
  $('fieldTelegramChatId').value = window.omniProfile.telegram_chat_id || '';
  $('fieldTelegramToken').value = window.omniProfile.telegram_token || '';

  await renderReviews(window.omniProfile);
  await loadContractorMessages(window.omniProfile);
}

async function saveProfile(){
  const user = await getCurrentUser();
  if(!user) return alert('Not logged in');
  const payload = {
    auth_id: user.id,
    company: $('cName').textContent,
    telegram_chat_id: $('fieldTelegramChatId').value.trim(),
    telegram_token: $('fieldTelegramToken').value.trim(),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('contractors').upsert(payload, { onConflict: ['auth_id'] }).select().maybeSingle();
  if(error) return alert('Save failed: ' + error.message);
  window.omniProfile = data;
  alert('Saved.');
}

async function loadContractorMessages(profile){
  if(!profile) return;
  const { data } = await supabase.from('messages').select('*').eq('contractor_id', profile.id).order('created_at',{ascending:false}).limit(200);
  const box = $('chatBox'); box.innerHTML = '';
  (data||[]).forEach(m=>{
    const d = document.createElement('div'); d.textContent = `${new Date(m.created_at).toLocaleString()} — ${m.message}`; d.style.padding='6px'; d.style.borderBottom='1px solid rgba(255,255,255,0.03)';
    box.appendChild(d);
  });
}

function appendChat(txt){
  const box = $('chatBox'); const n = document.createElement('div'); n.textContent = txt; n.style.padding='6px'; box.prepend(n);
}

async function renderReviews(profile){
  if(!profile) return;
  const { data } = await supabase.from('reviews').select('*').eq('contractor_id', profile.id).order('created_at',{ascending:false}).limit(50);
  const el = $('reviewsList'); el.innerHTML='';
  (data||[]).forEach(r=>{
    const d = document.createElement('div'); d.style.padding='8px'; d.style.borderBottom='1px solid rgba(255,255,255,0.03)';
    d.innerHTML = `<strong>${r.reviewer_name}</strong> — ⭐ ${r.rating}<div class="muted small">${r.comment || ''}</div>`;
    el.appendChild(d);
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    await loadProfile();
  }catch(e){ console.warn(e); return; }
  $('saveProfileBtn').addEventListener('click', saveProfile);
  $('msgSend').addEventListener('click', async ()=>{
    const txt = $('msgInput').value.trim(); if(!txt) return;
    const profile = window.omniProfile;
    await supabase.from('messages').insert([{ contractor_id: profile.id, message: txt, created_at: new Date().toISOString() }]);
    await fetch('/api/message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractorId: profile.id, message: txt }) });
    appendChat(`You: ${txt}`);
    $('msgInput').value = '';
  });
  $('logoutBtn')?.addEventListener('click', async ()=>{ await supabase.auth.signOut(); window.location.href = '/'; });
});
