(function() {
  const bySel = (s, sc) => (sc || document).querySelector(s);
  const bySelAll = (s, sc) => Array.from((sc || document).querySelectorAll(s));

  // Mobile nav toggle
  const navToggle = bySel('.nav-toggle');
  const navList = bySel('#nav-list');
  if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
      const open = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Intersection animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

  bySelAll('[data-animate]').forEach((el) => observer.observe(el));

  // Parallax tilt for device mock
  const parallax = bySel('[data-parallax]');
  if (parallax && matchMedia('(pointer:fine)').matches) {
    const base = { x: 6, y: 6 };
    parallax.addEventListener('mousemove', (e) => {
      const r = parallax.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      parallax.style.transform = `rotateY(${cx * base.x}deg) rotateX(${cy * -base.y}deg)`;
    });
    parallax.addEventListener('mouseleave', () => {
      parallax.style.transform = 'rotate3d(1,1,0,6deg)';
    });
  }

  // Sticky CTA reveal on scroll
  const sticky = bySel('[data-sticky]');
  if (sticky) {
    let lastY = 0;
    const update = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      sticky.style.opacity = y > 300 ? '1' : '0';
      sticky.style.transform = y > 300 ? 'translateY(0)' : 'translateY(12px)';
      lastY = y; // reserved for future use
    };
    update();
    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  }

  // Current year in footer
  const y = bySel('#year');
  if (y) y.textContent = String(new Date().getFullYear());

  // Checkout modal logic
  const modal = bySel('#checkout-modal');
  const form = bySel('#checkout-form');
  const qty = bySel('#qty');
  const total = bySel('#total-amount');
  const PRICE = 149;

  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    const firstInput = bySel('#name');
    if (firstInput) firstInput.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  bySelAll('a[href="#purchase"], #purchase, .header-cta').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  bySelAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  if (qty && total) {
    const updateTotal = () => {
      const n = Math.max(1, Math.min(10, parseInt(qty.value || '1', 10)));
      qty.value = String(n);
      total.textContent = `$${(n * PRICE).toLocaleString()}`;
    };
    updateTotal();
    qty.addEventListener('input', updateTotal);
  }

  function setError(id, msg) {
    const errEl = bySel(`[data-err-for="${id}"]`);
    const input = bySel(`#${id}`);
    if (errEl) errEl.textContent = msg || '';
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  function validatePhone(value) {
    return /^\+?[0-9 ()-]{7,15}$/.test(value.trim());
  }

  if (form) {
    const pinInput = bySel('#pin');
    const countrySelect = bySel('#country');
    const address1 = bySel('#address1');
    const city = bySel('#city');
    const state = bySel('#state');
    const requiredFields = [address1, city, state, countrySelect, pinInput];

    function validatePin(pin, country) {
      const p = String(pin || '').trim();
      switch (country) {
        case 'IN': return /^\d{6}$/.test(p);
        case 'US': return /^\d{5}(-\d{4})?$/.test(p);
        case 'GB': return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(p);
        case 'CA': return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(p);
        case 'AU': return /^\d{4}$/.test(p);
        case 'SG': return /^\d{6}$/.test(p);
        default: return p.length >= 3; // minimal fallback
      }
    }

    [countrySelect, pinInput].forEach((el) => el && el.addEventListener('input', () => {
      if (pinInput && countrySelect) {
        const ok = validatePin(pinInput.value, countrySelect.value);
        setError('pin', ok ? '' : 'Enter a valid postal code');
      }
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      const name = bySel('#name').value.trim();
      const email = bySel('#email').value.trim();
      const phone = bySel('#phone').value.trim();
      const address1Val = address1 ? address1.value.trim() : '';
      const cityVal = city ? city.value.trim() : '';
      const stateVal = state ? state.value.trim() : '';
      const countryVal = countrySelect ? countrySelect.value : '';
      const pinVal = pinInput ? pinInput.value.trim() : '';
      const num = parseInt(bySel('#qty').value || '1', 10);

      setError('name', name ? '' : 'Please enter your name');
      ok = ok && Boolean(name);

      setError('email', validateEmail(email) ? '' : 'Enter a valid email');
      ok = ok && validateEmail(email);

      setError('phone', validatePhone(phone) ? '' : 'Enter a valid phone');
      ok = ok && validatePhone(phone);

      setError('address1', address1Val.length >= 4 ? '' : 'Enter address line 1');
      ok = ok && address1Val.length >= 4;
      setError('city', cityVal ? '' : 'Enter city');
      ok = ok && Boolean(cityVal);
      setError('state', stateVal ? '' : 'Enter state/province');
      ok = ok && Boolean(stateVal);
      setError('country', countryVal ? '' : 'Select country');
      ok = ok && Boolean(countryVal);
      setError('pin', validatePin(pinVal, countryVal) ? '' : 'Enter a valid postal code');
      ok = ok && validatePin(pinVal, countryVal);

      setError('qty', num >= 1 && num <= 10 ? '' : 'Quantity 1–10');
      ok = ok && num >= 1 && num <= 10;

      if (!ok) return;

      // Simulate success, then redirect home
      closeModal();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        // Reset form
        form.reset();
        if (qty) qty.value = '1';
        if (total) total.textContent = `$${PRICE}`;
        // Redirect to home (same page top)
        window.location.hash = '#home';
      }, 400);
    });
  }
})();


