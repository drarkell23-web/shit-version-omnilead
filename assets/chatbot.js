// chatbot.js — conversation flow, contractor pick, lead submit, graffiti
// Wrapped in a guard so re-loading the script won't redeclare things and crash the page.
if (!window.__omni_chatbot_loaded) {
  window.__omni_chatbot_loaded = true;

  (function () {
    const $ = sel => document.querySelector(sel);

    let SERVICES = [];
    let CONTRACTORS = [];
    let selectedService = null;
    let selectedContractor = null;

    const chatOpen = $('#chatOpen');
    const chatModal = $('#chatModal');
    const chatClose = $('#chatClose');
    const chatFlow = $('#chatFlow');
    const leadForm = $('#leadForm');
    const graffitiCanvas = document.getElementById('graffitiCanvas');

    document.addEventListener('DOMContentLoaded', async () => {
      await loadServices();
      await loadContractors();
      initUI();
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      window.addEventListener('omni-service-selected', (e) => {
        selectedService = e.detail;
        const ls = $('#leadService');
        if (ls) ls.value = selectedService.name;
        openChat();
        addBotMessage(`You selected <strong>${selectedService.name}</strong>. Tell me a little about the job or choose a contractor.`);
        showContractorOptionsForService(selectedService);
      });
    });

    // --- fetch helpers with fallbacks ---
    async function tryJsonFetch(urls) {
      // urls: array of candidate URLs to try in order
      for (const u of urls) {
        try {
          const res = await fetch(u, { cache: 'no-store' });
          // If server returned HTML (index page) you'll get text starting with '<'
          const ct = res.headers.get('content-type') || '';
          if (!res.ok) {
            // continue to next candidate
            continue;
          }
          if (ct.includes('application/json')) {
            return await res.json();
          } else {
            // try to parse anyway, but if it's HTML bail
            const txt = await res.text();
            if (txt.trim().startsWith('<')) {
              // not JSON
              continue;
            }
            try { return JSON.parse(txt); } catch (e) { continue; }
          }
        } catch (e) {
          // network error -> next candidate
          continue;
        }
      }
      // all candidates failed
      return null;
    }

    async function loadServices() {
      // Try multiple endpoints (server may expose different names)
      const j = await tryJsonFetch(['/api/services', '/services', '/api/service', '/api/services.js']);
      if (j && (j.services || Array.isArray(j))) {
        SERVICES = j.services || j;
      } else {
        SERVICES = [];
        console.warn('services load failed or returned non-json. Using empty list.');
      }
    }

    async function loadContractors() {
      const j = await tryJsonFetch(['/api/contractors', '/api/contractor', '/contractors', '/api/contractors.js']);
      if (j && (j.contractors || Array.isArray(j))) {
        CONTRACTORS = j.contractors || j;
      } else {
        CONTRACTORS = [];
        console.warn('contractors load failed or returned non-json. Using empty list.');
      }
    }

    function initUI() {
      if (chatOpen) chatOpen.addEventListener('click', () => chatModal.classList.toggle('hidden'));
      if (chatClose) chatClose.addEventListener('click', () => chatModal.classList.add('hidden'));
      if (leadForm) leadForm.addEventListener('submit', async (ev) => { ev.preventDefault(); await submitLead(); });

      // deep link
      const qp = new URLSearchParams(location.search);
      if (qp.get('openChat')) {
        const svc = qp.get('service'); const contractor = qp.get('contractor');
        if (svc) {
          selectedService = { name: svc, category: '' };
          const ls = $('#leadService');
          if (ls) ls.value = svc;
          openChat();
          addBotMessage(`You selected <strong>${svc}</strong>.`);
          if (contractor) {
            selectedContractor = { id: contractor };
            addBotMessage('Prefilled contractor selected — will attempt to send lead to them.');
          }
        }
      }
    }

    function openChat() { if (chatModal) chatModal.classList.remove('hidden'); addBotMessage('Hi — I can help you pick a service or send a lead.'); }
    function addBotMessage(text) { if (!chatFlow) return; const d = document.createElement('div'); d.className = 'msg bot'; d.innerHTML = text; chatFlow.appendChild(d); chatFlow.scrollTop = chatFlow.scrollHeight; }
    function addUserMessage(text) { if (!chatFlow) return; const d = document.createElement('div'); d.className = 'msg user'; d.innerHTML = text; chatFlow.appendChild(d); chatFlow.scrollTop = chatFlow.scrollHeight; }

    function showContractorOptionsForService(s) {
      const holder = document.getElementById('contractorOptions');
      if (!holder) return;
      holder.innerHTML = '';
      const pickWrap = document.getElementById('contractorPick');
      if (pickWrap) pickWrap.style.display = 'block';
      const matches = (CONTRACTORS || []).filter(c => (c.service || '').toLowerCase().includes((s.name || '').split(' ')[0].toLowerCase()));
      const top = matches.length ? matches.slice(0, 3) : (CONTRACTORS || []).slice(0, 3);
      top.forEach(c => {
        const card = document.createElement('div'); card.className = 'contractor-card';
        const img = document.createElement('img'); img.src = c.logo || 'assets/logo.png';
        const meta = document.createElement('div'); meta.className = 'meta'; meta.innerHTML = `<div><strong>${c.company || c.name || 'Contractor'}</strong></div><div class="muted">${c.service || ''}</div>`;
        const btn = document.createElement('button'); btn.className = 'pick-btn'; btn.textContent = 'Select';
        btn.addEventListener('click', () => {
          selectedContractor = c;
          addBotMessage(`You chose <strong>${c.company || c.name}</strong>.`);
          if (leadForm) leadForm.dataset.contractorId = c.id;
        });
        card.appendChild(img); card.appendChild(meta); card.appendChild(btn);
        holder.appendChild(card);
      });
    }

    async function submitLead() {
      if (!leadForm) { console.warn('leadForm missing'); return; }
      const nameEl = document.getElementById('leadName');
      const phoneEl = document.getElementById('leadPhone');
      const emailEl = document.getElementById('leadEmail');
      const messageEl = document.getElementById('leadMessage');
      const serviceEl = document.getElementById('leadService');

      const name = nameEl ? nameEl.value.trim() : '';
      const phone = phoneEl ? phoneEl.value.trim() : '';
      const email = emailEl ? emailEl.value.trim() : '';
      const message = messageEl ? messageEl.value.trim() : '';
      const service = serviceEl ? serviceEl.value.trim() : '';

      if (!name || !phone || !service) { addBotMessage('Please enter your name, phone and chosen service.'); return; }
      addUserMessage(`${name} — ${phone}`);
      addBotMessage('Sending your request...');

      const payload = {
        name, phone, email, message, service,
        // unify contractor id field names
        contractor_id: leadForm.dataset.contractorId || leadForm.dataset.contractorId || (selectedContractor && selectedContractor.id) || undefined,
        source: 'chat'
      };

      // Try to post to server's lead endpoint(s)
      const leadUrls = ['/api/lead', '/lead', '/api/leads', '/leads'];
      let sent = false;
      for (const url of leadUrls) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) {
            // try next
            continue;
          }
          // attempt to parse json safely
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await res.json();
            if (j.ok) {
              addBotMessage('✅ Request sent. You will be contacted shortly.');
              if (leadForm) leadForm.reset();
              const pickWrap = document.getElementById('contractorPick');
              if (pickWrap) pickWrap.style.display = 'none';
              playGraffiti();
              setTimeout(() => chatModal.classList.add('hidden'), 1500);
              sent = true;
              break;
            } else {
              // server returned JSON but not ok — show server message
              addBotMessage('❌ Failed to send: ' + (j.error || 'server error'));
              sent = true;
              break;
            }
          } else {
            // If server returned HTML, it's not the right endpoint — try next
            continue;
          }
        } catch (err) {
          console.warn('post lead attempt failed for', url, err);
          continue;
        }
      }

      if (!sent) {
        addBotMessage('❌ Failed to send. Network/server did not accept the request. Check console for details.');
      }
    }

    /* graffiti canvas animation */
    function resizeCanvas() { if (!graffitiCanvas) return; graffitiCanvas.width = window.innerWidth; graffitiCanvas.height = window.innerHeight; }
    function playGraffiti() {
      if (!graffitiCanvas) return;
      const ctx = graffitiCanvas.getContext('2d'); const particles = []; const count = 80;
      for (let i = 0; i < count; i++) {
        particles.push({ x: Math.random() * graffitiCanvas.width, y: -30 - Math.random() * 120, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 2 + Math.random() * 4, life: 80 + Math.random() * 40, color: ['#6b5cff', '#ee6ee9', '#00e6c3', '#ffd27a', '#ff6b6b', '#2ec1ff'][Math.floor(Math.random() * 6)] });
      }
      let t = 0;
      function loop() {
        t++; ctx.clearRect(0, 0, graffitiCanvas.width, graffitiCanvas.height);
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--; ctx.beginPath(); ctx.fillStyle = p.color; ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
        if (t < 140) requestAnimationFrame(loop); else ctx.clearRect(0, 0, graffitiCanvas.width, graffitiCanvas.height);
      }
      loop();
    }

    // expose openChat for other scripts
    window.omniOpenChat = openChat;

  })();
} // end guard
