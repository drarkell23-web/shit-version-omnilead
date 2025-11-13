/**
 * Contractor Dashboard JS
 * - Designed for Tailwind + Chart.js
 * - Expects server endpoints (recommended):
 *    POST /api/contractor/saveTelegram   { contractorId, token, chatId }
 *    POST /api/contractor/uploadReview   (multipart)
 *    POST /api/contractor/generateAd     { title, desc, contractorId }
 *    POST /api/contractor/message        { to: 'admin'|'client', contractorId, text }
 *    GET  /api/contractor/:id/stats      -> returns leads array
 *
 * The script uses localStorage fallback so the dashboard works without server.
 */

const contractorId = localStorage.getItem('omni.contractorId') || `c_${Date.now().toString().slice(-6)}`;
const isPremium = JSON.parse(localStorage.getItem('omni.isPremium') || 'false');
const freeMonthlyLimit = 10; // free leads per month

// DOM refs
const contractorNameEl = document.getElementById('contractorName');
const contractorIdEl = document.getElementById('contractorId');
const leadsRemainingEl = document.getElementById('leadsRemaining');
const subTierEl = document.getElementById('subTier');
const themeToolsEl = document.getElementById('themeTools');
const accentStartEl = document.getElementById('accentStart');
const accentEndEl = document.getElementById('accentEnd');
const applyThemeBtn = document.getElementById('applyThemeBtn');
const purchasePremiumBtn = document.getElementById('purchasePremiumBtn');
const saveTelegramBtn = document.getElementById('saveTelegramBtn');
const telegramTokenIn = document.getElementById('telegramToken');
const telegramChatIdIn = document.getElementById('telegramChatId');
const openBotBtn = document.getElementById('openBotBtn');
const uploadReviewBtn = document.getElementById('uploadReviewBtn');
const reviewFilesIn = document.getElementById('reviewFiles');
const reviewsList = document.getElementById('reviewsList');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const msgInput = document.getElementById('msgInput');
const messageList = document.getElementById('messageList');
const genAdBtn = document.getElementById('genAdBtn');
const shareAdBtn = document.getElementById('shareAdBtn');
const adResult = document.getElementById('adResult');
const adModal = document.getElementById('adModal');
const adPreviewTitle = document.getElementById('adPreviewTitle');
const adPreviewDesc = document.getElementById('adPreviewDesc');
const adPreviewLink = document.getElementById('adPreviewLink');
const closeAdModal = document.getElementById('closeAdModal');
const reviewsData = JSON.parse(localStorage.getItem('omni.reviews') || '[]');

// init UI
contractorNameEl.textContent = localStorage.getItem('omni.contractorName') || 'Your Company';
contractorIdEl.textContent = contractorId;
document.getElementById('contractorId').textContent = contractorId;
document.getElementById('leadsCount').textContent = JSON.parse(localStorage.getItem('omni.leadsCount') || '0');
document.getElementById('activeJobs').textContent = JSON.parse(localStorage.getItem('omni.activeJobs') || '0');
document.getElementById('avgRating').textContent = (JSON.parse(localStorage.getItem('omni.avgRating') || '0')).toFixed(1);

// subscription UI
subTierEl.textContent = isPremium ? 'Premium' : 'Free';
leadsRemainingEl.textContent = isPremium ? 'Unlimited' : (freeMonthlyLimit - (JSON.parse(localStorage.getItem('omni.leadsThisMonth') || '0')));

// theme tools visibility
if (isPremium) themeToolsEl.classList.remove('hidden');

// CHARTS: Create Chart.js charts with placeholder datasets
const leadsCtx = document.getElementById('leadsChart').getContext('2d');
const leadsChart = new Chart(leadsCtx, {
  type: 'line',
  data: {
    labels: Array.from({length:30}, (_,i)=>`${i+1}`),
    datasets: [{
      label: 'Leads',
      data: Array.from({length:30}, ()=> Math.floor(Math.random()*3)),
      borderWidth: 2,
      fill: true,
      backgroundColor: gradientLine('#7b61ff','#42b3ff', leadsCtx),
      borderColor: '#7b61ff',
      tension: 0.4
    }]
  },
  options: { responsive:true, scales:{y:{beginAtZero:true}} }
});

const badgeCtx = document.getElementById('badgeChart').getContext('2d');
const badgeChart = new Chart(badgeCtx, {
  type: 'doughnut',
  data: {
    labels: ['Bronze','Silver','Gold','Platinum'],
    datasets: [{
      data: [12,5,3,2],
      backgroundColor: ['#c08a3d','#c9d1d8','#ffd34d','#bdb7ff'],
      hoverOffset: 6
    }]
  },
  options: { responsive:true }
});

function gradientLine(a,b, ctx){
  const g = ctx.createLinearGradient(0,0,0,200);
  g.addColorStop(0, tinycolor(a).setAlpha(0.8).toRgbString());
  g.addColorStop(1, tinycolor(b).setAlpha(0.2).toRgbString());
  return g;
}

// REVIEW LIST render
function renderReviews(){
  reviewsList.innerHTML = '';
  (reviewsData || []).forEach(r=>{
    const d = document.createElement('div'); d.className = 'p-2 rounded-md bg-[rgba(255,255,255,0.02)]';
    d.innerHTML = `<div class="flex gap-3 items-start"><img class="reviewer-thumb" src="${r.thumb||'/data/uploads/assets/ChatGPT_Image_Nov_13_2025_05_08_40_AM.png'}" alt=""><div><div class="font-semibold">${r.reviewer}</div><div class="text-xs text-slate-400">${'⭐'.repeat(r.stars)}</div><div class="text-sm text-slate-300 mt-1">${r.comment}</div></div></div>`;
    reviewsList.appendChild(d);
  });
}
renderReviews();

// SAVE telegram settings (client-side save + optional server call)
saveTelegramBtn.addEventListener('click', async ()=>{
  const token = telegramTokenIn.value.trim();
  const chatId = telegramChatIdIn.value.trim();
  if(!token || !chatId) return alert('Enter token and chat id');

  // Save locally first
  localStorage.setItem('omni.telegramToken', token);
  localStorage.setItem('omni.telegramChatId', chatId);
  document.getElementById('tgStatusTxt').textContent = 'Saved (local)';

  // Try to call server endpoint to persist securely (if server exists)
  try {
    const res = await fetch('/api/contractor/saveTelegram', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ contractorId, token, chatId }) });
    if (res.ok) {
      const j = await res.json();
      if (j.ok) document.getElementById('tgStatusTxt').textContent = 'Saved on server';
    }
  } catch(e){
    console.warn('Telegram save failed', e);
  }
});

// open bot link
openBotBtn.addEventListener('click', ()=> {
  const chatId = telegramChatIdIn.value.trim() || localStorage.getItem('omni.telegramChatId');
  const token = localStorage.getItem('omni.telegramToken') || telegramTokenIn.value.trim();
  if (!token || !chatId) return alert('Link your bot first');
  const botLink = `https://t.me/${token.split(':')[0]}`;
  window.open(botLink, '_blank');
});

// send message (to admin or store)
sendMsgBtn.addEventListener('click', async ()=>{
  const text = msgInput.value.trim();
  if (!text) return;
  // append to list
  const b = document.createElement('div'); b.className='msg-bubble'; b.textContent = `You: ${text}`;
  messageList.prepend(b);
  msgInput.value='';

  // post to server (optional)
  try {
    await fetch('/api/contractor/message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractorId, text, to:'admin' })});
  } catch(e){ console.warn('message send failed', e); }
});

// upload review (client demonstration + server API)
uploadReviewBtn.addEventListener('click', async ()=>{
  const files = reviewFilesIn.files;
  const reviewer = document.querySelector('[name=reviewer]').value || 'Anonymous';
  const stars = document.querySelector('[name=stars]').value || 5;
  const comment = document.querySelector('[name=comment]').value || '';

  if (!files.length){
    alert('Choose at least one image (free: one image).');
    return;
  }
  // enforce free limit: 1 image unless premium
  const isP = JSON.parse(localStorage.getItem('omni.isPremium')||'false');
  if (!isP && files.length > 1) {
    alert('Free accounts can only upload 1 image. Upgrade for multiple images.');
    return;
  }

  // For demo, we'll create local object and push to reviewsData; server call would be multipart upload
  const file = files[0];
  const reader = new FileReader();
  reader.onload = function(e){
    reviewsData.unshift({ reviewer, stars, comment, thumb: e.target.result, created: Date.now() });
    localStorage.setItem('omni.reviews', JSON.stringify(reviewsData));
    renderReviews();
    alert('Review saved locally. (Server upload recommended)');
  };
  reader.readAsDataURL(file);

  // optional: POST to /api/contractor/uploadReview with FormData
  try{
    const fd = new FormData();
    fd.append('contractorId', contractorId);
    fd.append('reviewer', reviewer);
    fd.append('stars', stars);
    fd.append('comment', comment);
    fd.append('image', files[0]);
    await fetch('/api/contractor/uploadReview', { method:'POST', body: fd });
  }catch(e){ console.warn('review upload failed', e); }
});

// ad generator
genAdBtn.addEventListener('click', async ()=>{
  const title = document.getElementById('adTitle').value.trim();
  const desc = document.getElementById('adDesc').value.trim();
  if (!title || !desc) return alert('Add title and description');
  // generate public contractor page link
  const publicLink = `${location.origin}/c/${contractorId}`;
  const payload = { contractorId, title, desc, link: publicLink, created: Date.now() };

  // Save to server
  try {
    const res = await fetch('/api/contractor/generateAd', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) {
      adResult.classList.remove('hidden');
      adResult.textContent = `Ad generated: ${j.url || publicLink}`;
      // show modal preview
      adPreviewTitle.textContent = title;
      adPreviewDesc.textContent = desc;
      adPreviewLink.textContent = j.url || publicLink;
      adModal.classList.remove('hidden');
    } else {
      adResult.classList.remove('hidden');
      adResult.textContent = `Ad generated locally: ${publicLink}`;
      adPreviewTitle.textContent = title;
      adPreviewDesc.textContent = desc;
      adPreviewLink.textContent = publicLink;
      adModal.classList.remove('hidden');
    }
  } catch(e){
    console.warn('ad generation failed', e);
    adResult.classList.remove('hidden');
    adResult.textContent = `Ad generated locally: ${publicLink}`;
    adPreviewTitle.textContent = title;
    adPreviewDesc.textContent = desc;
    adPreviewLink.textContent = publicLink;
    adModal.classList.remove('hidden');
  }
});

// share ad (basic copy)
shareAdBtn.addEventListener('click', ()=>{
  const link = adPreviewLink.textContent;
  if (!link) return alert('Generate an ad first');
  navigator.clipboard.writeText(link).then(()=> alert('Ad link copied to clipboard'));
});

// ad modal close
closeAdModal.addEventListener('click', ()=> adModal.classList.add('hidden'));

// purchase premium (demo)
purchasePremiumBtn.addEventListener('click', ()=>{
  // in production redirect to billing flow
  if (!confirm('Purchase Premium for R500/month (demo) ?')) return;
  localStorage.setItem('omni.isPremium', 'true');
  alert('Premium enabled (demo). Refresh to see premium features.');
  location.reload();
});

// Theme application
applyThemeBtn.addEventListener('click', ()=>{
  const a = accentStartEl.value;
  const b = accentEndEl.value;
  const text = document.getElementById('textColor').value || '#efeaf8';
  document.documentElement.style.setProperty('--accent-from', a);
  document.documentElement.style.setProperty('--accent-to', b);
  document.documentElement.style.setProperty('--accent-text', tinycolor(text).toHexString());
  // update chart colors
  leadsChart.data.datasets[0].backgroundColor = gradientLine(a,b, leadsChart.ctx);
  leadsChart.data.datasets[0].borderColor = a;
  leadsChart.update();
  // store
  localStorage.setItem('omni.theme', JSON.stringify({a,b,text}));
  alert('Theme applied (client). For persistent changes, use admin tools or server save.');
});

// helpers
function gradientLine(a,b, ctx){
  const g = ctx.createLinearGradient(0,0,0,200);
  g.addColorStop(0, tinycolor(a).setAlpha(0.85).toRgbString());
  g.addColorStop(1, tinycolor(b).setAlpha(0.15).toRgbString());
  return g;
}

// lead limit simulation: when a lead is "received" increase monthly counter
function simulateIncomingLead(){
  const leadsThisMonth = JSON.parse(localStorage.getItem('omni.leadsThisMonth')||'0');
  const newCount = leadsThisMonth + 1;
  localStorage.setItem('omni.leadsThisMonth', newCount.toString());
  document.getElementById('leadsCount').textContent = parseInt(document.getElementById('leadsCount').textContent||'0') + 1;
  // enforce free limit client-side UI
  if (!JSON.parse(localStorage.getItem('omni.isPremium')||'false')){
    const remaining = Math.max(0, freeMonthlyLimit - newCount);
    document.getElementById('leadsRemaining').textContent = remaining;
    if (remaining === 0) alert('You reached your free monthly lead limit. Upgrade to Premium for unlimited leads.');
  } else {
    document.getElementById('leadsRemaining').textContent = 'Unlimited';
  }
}

// set a small demo message on load
(function initDemo(){
  // load saved theme
  const savedTheme = JSON.parse(localStorage.getItem('omni.theme')||'null');
  if (savedTheme){
    document.documentElement.style.setProperty('--accent-from', savedTheme.a);
    document.documentElement.style.setProperty('--accent-to', savedTheme.b);
  }
  // populate telegram fields if available
  telegramTokenIn.value = localStorage.getItem('omni.telegramToken') || '';
  telegramChatIdIn.value = localStorage.getItem('omni.telegramChatId') || '';
  // load sample messages
  const sampleMsg = document.createElement('div'); sampleMsg.className='msg-bubble admin'; sampleMsg.textContent = 'Welcome! This is your contractor dashboard. Premium unlocks more tools.';
  messageList.appendChild(sampleMsg);

  // render reviews if any
  renderReviews();
})();

// Utility: renderReviews re-used from above (but within this file scope)
function renderReviews(){
  reviewsList.innerHTML = '';
  const arr = JSON.parse(localStorage.getItem('omni.reviews') || '[]');
  arr.forEach((r)=>{
    const d = document.createElement('div'); d.className='p-2 rounded-md bg-[rgba(255,255,255,0.02)]';
    d.innerHTML = `<div class="flex gap-3 items-start"><img class="reviewer-thumb" src="${r.thumb||'/data/uploads/assets/ChatGPT_Image_Nov_13_2025_05_08_40_AM.png'}" alt=""><div><div class="font-semibold">${r.reviewer}</div><div class="text-xs text-slate-400">${'⭐'.repeat(r.stars)}</div><div class="text-sm text-slate-300 mt-1">${r.comment}</div></div></div>`;
    reviewsList.appendChild(d);
  });
}

// EXPORTS for potential inline tests
window._omni = {
  simulateIncomingLead,
  contractorId,
  generateAdPreview: () => ({ url:`${location.origin}/c/${contractorId}` })
};
