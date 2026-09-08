/**
 * CYBER-TECH BACKGROUND & PARTICLE ENGINE — JIDAN JULIANA PORTFOLIO
 * High-performance, crisp Retina-ready interactive background:
 * 1. Crystal-clear Constellation Particle Grid
 * 2. Floating Developer Code Glyphs & Tokens (Sharp High-DPI Typography)
 * 3. Dynamic Interactive Mouse Repulsion & Spotlight Tracking
 */

(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  if (window.innerWidth < 768 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) {
    canvas.style.display = 'none';
    return;
  }

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let mouse = {
    x: width * 0.5,
    y: height * 0.3,
    targetX: width * 0.5,
    targetY: height * 0.3,
    radius: 190,
    active: false
  };

  const CODE_TOKENS = [
    '<div />', 'const', 'async / await', 'useState()', 'useEffect()',
    'npm run dev', '0101', 'UI / UX', '<Section />', 'THREE.js',
    ':hover', 'backdrop-blur', 'px-4', 'opacity: 1', 'display: grid',
    'var(--blue)', 'border-radius', 'fetch()', 'React', 'WebGL',
    'Flexbox', 'CSS Grid', 'API', 'Promise', '=>', '{ ...props }'
  ];

  const PARTICLE_COUNT = window.innerWidth < 768 ? 40 : 80;
  const particles = [];

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 20;
      this.size = Math.random() * 1.8 + 0.8;
      this.vx = (Math.random() - 0.5) * 0.32;
      this.vy = -(Math.random() * 0.42 + 0.14);
      this.baseAlpha = Math.random() * 0.45 + 0.25;
      this.alpha = this.baseAlpha;
      const hues = [195, 210, 225, 245, 260, 280];
      this.hue = hues[Math.floor(Math.random() * hues.length)];
      this.isToken = width >= 768 && Math.random() < 0.28;
      this.token = this.isToken ? CODE_TOKENS[Math.floor(Math.random() * CODE_TOKENS.length)] : null;
      this.tokenSize = Math.floor(Math.random() * 2 + 10); // 10px - 11px
      this.pulseSpeed = Math.random() * 0.02 + 0.008;
      this.pulseVal = Math.random() * Math.PI;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulseVal += this.pulseSpeed;
      this.alpha = this.baseAlpha * (0.65 + 0.35 * Math.sin(this.pulseVal));

      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mouse.radius && dist > 0) {
        const force = (1 - dist / mouse.radius) * 1.6;
        this.x -= (dx / dist) * force;
        this.y -= (dy / dist) * force;
        this.alpha = Math.min(1.0, this.alpha + force * 0.45);
      }

      if (this.y < -30) this.reset();
      if (this.x < -40) this.x = width + 40;
      if (this.x > width + 40) this.x = -40;
    }

    draw() {
      ctx.save();
      if (this.isToken) {
        // Crisp, Sharp Monospace Typography
        ctx.font = `500 ${this.tokenSize}px 'JetBrains Mono', 'Fira Code', 'Consolas', monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `hsla(${this.hue}, 92%, 80%, ${this.alpha * 0.85})`;
        ctx.fillText(this.token, this.x, this.y);
      } else {
        // Glowing Sharp Micro Dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 90%, 75%, ${this.alpha})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  window.addEventListener('pointermove', e => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;

    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
  }, { passive: true });

  function drawConnections() {
    const maxDist = 110;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        if (p1.isToken || p2.isToken) continue;

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.16;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  let animId;
  function render() {
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    ctx.clearRect(0, 0, width, height);
    drawConnections();

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }

    animId = requestAnimationFrame(render);
  }

  render();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      render();
    }
  });

})();


