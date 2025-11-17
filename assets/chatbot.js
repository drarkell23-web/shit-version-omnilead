// assets/chatbot.js
// Extra helpers for the chatbot UI (keeps it lean; main logic is in main.js)

document.addEventListener('DOMContentLoaded', () => {
  // enhance lead service select change to show contractors by service
  const leadService = document.getElementById('leadService');
  if (leadService) {
    leadService.addEventListener('change', (e) => {
      const name = e.target.value;
      if (!name) return;
      // dispatch custom event so main.js can show contractors
      const detail = { name };
      window.dispatchEvent(new CustomEvent('chat-service-selected', { detail }));
    });
  }

  // listen for the global show contractor event from main.js
  window.addEventListener('chat-show-contractors', (e) => {
    // in case external components want to trigger contractor listing
    const s = e.detail;
    const evt = new CustomEvent('omni-service-selected', { detail: s });
    window.dispatchEvent(evt);
  });
});
