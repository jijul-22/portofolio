(function () {
  'use strict';

  const portfolioData = window.portfolioData || { projects: [], profile: { stats: [] } };

  // DOM Elements
  const preloader = document.getElementById('pre');
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const navLinks = document.querySelectorAll('.nav-link');
  const railButtons = document.querySelectorAll('.rail button');
  const chips = document.querySelectorAll('.chip');
  const modalBackdrop = document.getElementById('project-modal');
  const modalClose = document.getElementById('modal-close');
  const modalContent = document.getElementById('modal-content');
  const cursorDot = document.getElementById('cursor-dot');
  const sections = document.querySelectorAll('section[id], footer[id]');
  const peekCard = document.getElementById('hero-peek');

  let mouseX = -100;
  let mouseY = -100;
  let curX = -100;
  let curY = -100;
  let isCursorActive = false;

  /* ------------------------------------------------------------ 1 · Preloader & Engine Boot */
  function boot() {
    if (window.KageEngine) {
      window.KageEngine.start(() => {
        // Dismiss preloader
        if (preloader) {
          preloader.classList.add('done');
        }
        // Trigger initial reveal animations
        triggerReveals();
        // Initial scroll position update
        updateScroll();
      });
    } else {
      if (preloader) preloader.classList.add('done');
      triggerReveals();
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ------------------------------------------------------------ 2 · Smooth Scroll & Engine Sync */
  function getScrollProgress() {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return 0;
    return Math.max(0, Math.min(1, window.scrollY / docH));
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScroll();
        ticking = false;
      });
      ticking = true;
    }
  }

  function updateScroll() {
    const prog = getScrollProgress();
    if (window.KageEngine) {
      window.KageEngine.setScrollProgress(prog);
    }

    // ── Scroll Progress Bar ──
    const progressBar = document.getElementById('scroll-progress');
    if (progressBar) {
      progressBar.style.width = (prog * 100).toFixed(2) + '%';
    }

    // Sticky nav state
    if (window.scrollY > 40) {
      nav?.classList.add('stuck');
    } else {
      nav?.classList.remove('stuck');
    }

    // Active section detection
    const scrollMid = window.scrollY + window.innerHeight * 0.35;
    let activeId = 'top';

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollMid >= top && scrollMid < top + height) {
        activeId = sec.getAttribute('id') || 'top';
      }
    });

    // Update Nav links
    navLinks.forEach(link => {
      const target = link.getAttribute('href')?.replace('#', '');
      if (target === activeId) {
        link.classList.add('on');
      } else {
        link.classList.remove('on');
      }
    });

    // Update Rail buttons
    railButtons.forEach(btn => {
      const target = btn.getAttribute('data-target');
      if (target === activeId) {
        btn.classList.add('on');
      } else {
        btn.classList.remove('on');
      }
    });

    // Update Hero Chapter chips
    chips.forEach(chip => {
      const target = chip.getAttribute('data-target');
      if (target === activeId) {
        chip.classList.add('on');
      } else {
        chip.classList.remove('on');
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------ 3 · Chapter Chips & Rail Navigation */
  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const navOffset = id === 'top' ? 0 : 40;
    const topPos = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
    window.scrollTo({
      top: topPos,
      behavior: 'smooth'
    });
  }

  chips.forEach((chip, idx) => {
    chip.addEventListener('click', () => {
      const target = chip.getAttribute('data-target');
      if (target) scrollToSection(target);
    });

    chip.addEventListener('mouseenter', () => {
      if (window.KageEngine) window.KageEngine.setHoverFocus(idx + 1);
    });

    chip.addEventListener('mouseleave', () => {
      if (window.KageEngine) window.KageEngine.setHoverFocus(-1);
    });
  });

  railButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (target) scrollToSection(target);
    });
  });

  // Hero interactive peek card click
  if (peekCard) {
    peekCard.addEventListener('click', e => {
      e.preventDefault();
      scrollToSection('work');
    });
    peekCard.addEventListener('mouseenter', () => {
      if (window.KageEngine) window.KageEngine.setHoverFocus(3);
    });
    peekCard.addEventListener('mouseleave', () => {
      if (window.KageEngine) window.KageEngine.setHoverFocus(-1);
    });
  }

  /* ------------------------------------------------------------ 4 · Mobile Burger Navigation */
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('menu-open');
      burger.classList.toggle('active', isOpen);
      document.body.classList.toggle('is-locked', isOpen);
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('menu-open');
        burger.classList.remove('active');
        document.body.classList.remove('is-locked');
      });
    });
  }

  /* ------------------------------------------------------------ 5 · Project Cards & Detail Modal */
  const projectCards = document.querySelectorAll('.card[data-project-id]');

  projectCards.forEach((card, idx) => {
    const projId = card.getAttribute('data-project-id');
    const project = portfolioData.projects.find(p => p.id === projId) || portfolioData.projects[idx];

    // Card hover push-in in WebGL viewport
    card.addEventListener('mouseenter', () => {
      if (window.KageEngine) window.KageEngine.setHoverFocus(idx);
    });

    card.addEventListener('mouseleave', () => {
      if (window.KageEngine) window.KageEngine.setHoverFocus(-1);
    });

    // Card click opens modal
    card.addEventListener('click', () => {
      if (project) openProjectModal(project);
    });
  });

  function openProjectModal(p) {
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-cat">${p.badge || 'Project'} • ${p.category}</div>
        <h3 class="modal-title">${p.title}</h3>
        <div class="modal-role">Role: ${p.role}</div>
      </div>

      <div class="modal-body">
        <p>${p.description}</p>
      </div>

      <div class="modal-features">
        <h4>Key Features & Architecture</h4>
        <ul>
          ${p.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>

      <div class="modal-tech">
        <h4>Technology Stack</h4>
        <div class="modal-tech-pills">
          ${p.technologies.map(t => `<span class="modal-tech-pill">${t}</span>`).join('')}
        </div>
      </div>

      <div style="margin-top: 32px; display: flex; gap: 12px; flex-wrap: wrap;">
        ${p.demo ? `<a href="${p.demo}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="font-size: 10px; padding: 10px 20px;">Live Preview <svg viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>` : ''}
        ${p.github ? `<a href="${p.github}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 10px; padding: 10px 20px;">Repository</a>` : ''}
        ${!p.demo && !p.github ? `<span style="font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); padding: 10px 0;">Internal Enterprise System / Protected IP</span>` : ''}
      </div>
    `;

    modalBackdrop.classList.add('open');
    document.body.classList.add('is-locked');
  }

  function closeProjectModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('open');
    document.body.classList.remove('is-locked');
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeProjectModal);
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', e => {
      if (e.target === modalBackdrop) {
        closeProjectModal();
      }
    });
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeProjectModal();
      if (nav && nav.classList.contains('menu-open')) {
        nav.classList.remove('menu-open');
        burger?.classList.remove('active');
        document.body.classList.remove('is-locked');
      }
    }
  });

  /* ------------------------------------------------------------ 6 · Custom Magnetic Cursor */
  if (cursorDot) {
    window.addEventListener('pointermove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function renderCursor() {
      if (mouseX >= 0) {
        curX += (mouseX - curX) * 0.22;
        curY += (mouseY - curY) * 0.22;
        cursorDot.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      }
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    const interactables = 'a, button, .chip, .card, .skill-row, .pillar-card, .exp-item, .contact-chip, .peek';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(interactables)) {
        cursorDot.classList.add('act');
      }
    });

    document.addEventListener('mouseout', e => {
      if (e.target.closest(interactables)) {
        cursorDot.classList.remove('act');
      }
    });
  }

  /* ------------------------------------------------------------ 7 · Intersection Reveal Observer */
  function triggerReveals() {
    const reveals = document.querySelectorAll('[data-rv]');
    const maskLines = document.querySelectorAll('.mask-line');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('rv-in');
            obs.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      });

      reveals.forEach(el => observer.observe(el));
      maskLines.forEach(el => observer.observe(el));
    } else {
      reveals.forEach(el => el.classList.add('rv-in'));
      maskLines.forEach(el => el.classList.add('rv-in'));
    }
  }

  // Populate dynamic elements from portfolioData if available
  function initDynamicData() {
    // Stat numbers
    const statContainers = document.querySelectorAll('.about-stats > div');
    if (statContainers.length >= portfolioData.profile.stats.length) {
      portfolioData.profile.stats.forEach((st, i) => {
        const c = statContainers[i];
        if (c) {
          const b = c.querySelector('b');
          const span = c.querySelector('span');
          const iEl = c.querySelector('i');
          if (b) b.textContent = st.num;
          if (span) span.textContent = st.label;
          if (iEl) iEl.textContent = st.sub;
        }
      });
    }
  }

  /* ------------------------------------------------------------ 8 · Hero IDE Terminal Tabs */
  function initIdeTabs() {
    const ideTabs = document.querySelectorAll('.ide-tab');
    const ideBodies = document.querySelectorAll('.ide-body');

    ideTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabKey = tab.getAttribute('data-tab');
        ideTabs.forEach(t => t.classList.remove('active'));
        ideBodies.forEach(b => b.classList.remove('active'));

        tab.classList.add('active');
        const targetBody = document.querySelector(`.ide-body--${tabKey}`);
        if (targetBody) targetBody.classList.add('active');
      });
    });
  }

  /* ------------------------------------------------------------ 9 · Interactive 3D Card Tilt */
  function initCardTilt() {
    const tiltCards = document.querySelectorAll('.card, .ide-terminal, .pillar-card');
    if (window.matchMedia('(hover: none)').matches) return;

    tiltCards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        card.style.setProperty('--card-mx', `${x}px`);
        card.style.setProperty('--card-my', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // Interactive UI Sandbox Switch & Button
  function initSandboxControls() {
    const sbSwitch = document.querySelector('.sb-switch');
    if (sbSwitch) {
      sbSwitch.addEventListener('click', () => {
        sbSwitch.classList.toggle('on');
      });
    }
  }

  initDynamicData();
  initIdeTabs();
  initCardTilt();
  initSandboxControls();

})();
