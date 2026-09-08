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

  const PARTICLE_COUNT = window.innerWidth < 768 ? 24 : 50;
  const particles = [];

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 20;
      this.size = Math.random() * 1.6 + 0.8;
      this.vx = (Math.random() - 0.5) * 0.28;
      this.vy = -(Math.random() * 0.38 + 0.12);
      this.baseAlpha = Math.random() * 0.40 + 0.20;
      this.alpha = this.baseAlpha;
      const hues = [195, 210, 225, 245, 260];
      this.hue = hues[Math.floor(Math.random() * hues.length)];
      this.isToken = width >= 768 && Math.random() < 0.24;
      this.token = this.isToken ? CODE_TOKENS[Math.floor(Math.random() * CODE_TOKENS.length)] : null;
      this.tokenSize = 10;
      this.pulseSpeed = Math.random() * 0.015 + 0.008;
      this.pulseVal = Math.random() * Math.PI;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulseVal += this.pulseSpeed;
      this.alpha = this.baseAlpha * (0.65 + 0.35 * Math.sin(this.pulseVal));

      if (mouse.active) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        if (Math.abs(dx) < mouse.radius && Math.abs(dy) < mouse.radius) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius && dist > 0) {
            const force = (1 - dist / mouse.radius) * 1.4;
            this.x -= (dx / dist) * force;
            this.y -= (dy / dist) * force;
          }
        }
      }

      if (this.y < -30) this.reset();
      if (this.x < -40) this.x = width + 40;
      if (this.x > width + 40) this.x = -40;
    }

    draw() {
      if (this.isToken) {
        ctx.font = `500 ${this.tokenSize}px 'JetBrains Mono', monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `hsla(${this.hue}, 90%, 80%, ${this.alpha * 0.8})`;
        ctx.fillText(this.token, this.x, this.y);
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 88%, 75%, ${this.alpha})`;
        ctx.fill();
      }
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  let mouseMoved = false;
  window.addEventListener('pointermove', e => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;
    mouseMoved = true;
  }, { passive: true });

  function drawConnections() {
    const maxDist = 90;
    const maxDistSq = maxDist * maxDist;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.12)';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      if (p1.isToken) continue;
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        if (p2.isToken) continue;

        const dx = p1.x - p2.x;
        if (dx > maxDist || dx < -maxDist) continue;
        const dy = p1.y - p2.y;
        if (dy > maxDist || dy < -maxDist) continue;

        const distSq = dx * dx + dy * dy;
        if (distSq < maxDistSq) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
    }
    ctx.stroke();
  }

  let animId;
  function render() {
    mouse.x += (mouse.targetX - mouse.x) * 0.1;
    mouse.y += (mouse.targetY - mouse.y) * 0.1;

    if (mouseMoved) {
      document.documentElement.style.setProperty('--mouse-x', `${Math.round(mouse.x)}px`);
      document.documentElement.style.setProperty('--mouse-y', `${Math.round(mouse.y)}px`);
      mouseMoved = false;
    }

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


