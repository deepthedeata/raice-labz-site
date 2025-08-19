// Reveal on scroll
function reveal() {
  const reveals = document.querySelectorAll(".reveal");
  for (let i = 0; i < reveals.length; i++) {
    const windowH = window.innerHeight;
    const top = reveals[i].getBoundingClientRect().top;
    const visible = 150;
    if (top < windowH - visible) reveals[i].classList.add("active");
    else reveals[i].classList.remove("active");
  }
}
window.addEventListener("scroll", reveal);
window.addEventListener("load", reveal);

// Navbar shrink on scroll
window.addEventListener("scroll", () => {
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  if (window.scrollY > 50) {
    nav.style.padding = "10px 20px";
    nav.style.background = "rgba(255,255,255,0.98)";
    nav.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
  } else {
    nav.style.padding = "15px 30px";
    nav.style.background = "rgba(255,255,255,0.95)";
    nav.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
  }
});

// Progress bars (HIW + Specs + FAQ)
(function(){
  const animateBar = (selector, headerSel) => {
    const bar = document.querySelector(selector);
    const header = document.querySelector(headerSel);
    if(!bar || !header) return;
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ bar.style.width = '100%'; obs.unobserve(header); } });
    }, {threshold: .4});
    obs.observe(header);
  };
  animateBar('.hiw-progress-bar', '.hiw-header');
  animateBar('.specs-progress-bar', '.specs-header');
  animateBar('.faq-progress-bar', '.faq-header');
})();

// FAQ controls (accessible + animated)
(function(){
  const items = document.querySelectorAll('.faq-item');
  const setOpen = (btn, panel, open) => {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(open){
      panel.classList.add('open');
      panel.style.maxHeight = panel.scrollHeight + 'px';
    } else {
      panel.classList.remove('open');
      panel.style.maxHeight = 0;
    }
  };
  items.forEach(item=>{
    const btn = item.querySelector('.faq-q');
    const panel = item.querySelector('.faq-a');
    if(!btn || !panel) return;
    setOpen(btn, panel, false);
    btn.addEventListener('click', ()=>{
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      // close others
      document.querySelectorAll('.faq-q[aria-expanded="true"]').forEach(openBtn=>{
        if(openBtn !== btn){
          const p = document.getElementById(openBtn.getAttribute('aria-controls'));
          setOpen(openBtn, p, false);
        }
      });
      setOpen(btn, panel, !isOpen);
      if(!isOpen) history.replaceState(null, '', '#' + btn.id);
    });
    btn.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ setOpen(btn, panel, false); btn.focus(); } });
  });

  document.querySelectorAll('.faq-toggle-all').forEach(ctrl=>{
    ctrl.addEventListener('click', ()=>{
      const action = ctrl.getAttribute('data-action'); // expand | collapse
      items.forEach(item=>{
        const btn = item.querySelector('.faq-q');
        const panel = item.querySelector('.faq-a');
        setOpen(btn, panel, action === 'expand');
      });
    });
  });

  if(location.hash && document.querySelector(location.hash)){
    const btn = document.querySelector(location.hash);
    if(btn && btn.classList.contains('faq-q')){
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      setOpen(btn, panel, true);
      btn.scrollIntoView({behavior:'smooth', block:'center'});
    }
  }

  window.addEventListener('resize', ()=>{
    document.querySelectorAll('.faq-a.open').forEach(panel=>{
      panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  });
})();

// Booking form (front-end only demo handler)
(function(){
  const form = document.getElementById('booking-form');
  const status = document.getElementById('booking-status');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    // simple validation
    const data = new FormData(form);
    if(!data.get('name') || !data.get('email') || !data.get('phone')){
      status.textContent = 'Please fill all required fields.';
      status.style.color = '#b91c1c';
      return;
    }
    status.textContent = '✅ Thanks! We will contact you shortly to schedule your demo.';
    status.style.color = '#065f46';
    form.reset();
  });
})();

// Contact form (front-end only demo handler)
(function(){
  const form = document.getElementById('contact-form');
  const status = document.getElementById('contact-status');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = new FormData(form);
    if(!data.get('c_name') || !data.get('c_email') || !data.get('c_message')){
      status.textContent = 'Please fill all required fields.';
      status.style.color = '#b91c1c';
      return;
    }
    status.textContent = '✅ Message sent! Our team will get back to you soon.';
    status.style.color = '#065f46';
    form.reset();
  });
})();

// Smooth-scroll for hero CTAs
(function(){
  const go = (e) => {
    const href = e.currentTarget.getAttribute('href');
    if(href && href.startsWith('#')){
      e.preventDefault();
      const el = document.querySelector(href);
      if(el){ el.scrollIntoView({behavior:'smooth', block:'start'}); }
    }
  };
  document.querySelectorAll('.hero-btn').forEach(btn=>btn.addEventListener('click', go));
})();
