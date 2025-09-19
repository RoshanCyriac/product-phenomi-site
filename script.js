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
})();


