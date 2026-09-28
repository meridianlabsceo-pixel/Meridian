/* Meridian Labs, site script */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = root.classList.contains('reduce');
  const isTouch = matchMedia('(hover: none)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeBack = t => { const c = 1.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  let vw = innerWidth, vh = innerHeight;
  const scrollFns = [];
  const resizeFns = [];
  let ticking = false;
  const runScroll = () => { ticking = false; scrollFns.forEach(f => f()); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } }, { passive: true });
  let rzTimer;
  addEventListener('resize', () => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(() => { const pw = vw; vw = innerWidth; vh = innerHeight; resizeFns.forEach(f => f(pw !== vw)); runScroll(); }, 120);
  });

  /* ---------------- Smooth scrolling helpers ---------------- */

  function navBottom() { const n = $('#nav'); return n ? n.getBoundingClientRect().bottom : 76; }

  function targetY(el) {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    let y = r.top + scrollY;
    if (el.id === 'how') return y + (el.offsetHeight - vh) * .36;
    if (el.classList.contains('section')) {
      const pad = parseFloat(getComputedStyle(el).paddingTop) || 0;
      return Math.max(0, y + pad - navBottom() - 36);
    }
    return Math.max(0, y - navBottom() - 20);
  }

  function scrollToEl(el) { scrollTo({ top: targetY(el), behavior: reduce ? 'auto' : 'smooth' }); }

  function focusAfterScroll(el) {
    let done = false;
    const f = () => { if (done) return; done = true; el.focus({ preventScroll: true }); };
    if ('onscrollend' in window) addEventListener('scrollend', f, { once: true });
    setTimeout(f, reduce ? 30 : 1200);
  }

  function goContact() {
    const phone = $('#qPhone');
    scrollToEl($('#contact'));
    focusAfterScroll(phone);
  }

  /* ---------------- Navigation ---------------- */

  function nav() {
    const btn = $('#menuBtn'), sheet = $('#menuSheet');
    const setMenu = open => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      sheet.classList.toggle('open', open);
    };
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      setMenu(open);
      if (open) setTimeout(() => sheet.querySelector('a').focus({ preventScroll: true }), 60);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && sheet.classList.contains('open')) { setMenu(false); btn.focus(); }
    });
    document.addEventListener('click', e => {
      if (sheet.classList.contains('open') && !sheet.contains(e.target) && !btn.contains(e.target)) setMenu(false);
    });

    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      if (a.hasAttribute('data-book')) { e.preventDefault(); setMenu(false); goContact(); return; }
      const t = id === 'top' ? null : document.getElementById(id);
      if (id !== 'top' && !t) return;
      e.preventDefault();
      setMenu(false);
      scrollToEl(t);
    });

    let openedAt = 0;
    btn.addEventListener('click', () => { openedAt = scrollY; });
    scrollFns.push(() => { if (sheet.classList.contains('open') && Math.abs(scrollY - openedAt) > 60) setMenu(false); });

    const ids = ['services', 'how', 'tuesday', 'pricing', 'faq'];
    const secs = ids.map(id => document.getElementById(id));
    const links = $$('.nav-links a, .menu-sheet nav a');
    let current = null;
    scrollFns.push(() => {
      const line = vh * .42;
      let act = null;
      secs.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top <= line && r.bottom > line) act = ids[i]; });
      if (act === current) return;
      current = act;
      links.forEach(a => {
        const on = a.getAttribute('href') === '#' + act;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    });
  }

  /* ---------------- Reveal, counters ---------------- */

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    const fmt = v => v.toLocaleString('en-IE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduce) { el.textContent = fmt(to); return; }
    const host = el.closest('.reveal');
    const delay = host ? parseFloat(host.style.getPropertyValue('--d')) || 0 : 0;
    const t0 = performance.now() + delay + 180, dur = 1500;
    el.textContent = fmt(0);
    const step = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      el.textContent = fmt(to * easeOut(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function fire(el) {
    $$('[data-count]', el).forEach(c => { if (c.closest('.reveal') === el) countUp(c); });
    el.dispatchEvent(new CustomEvent('reveal'));
  }

  function reveals() {
    $$('[data-stagger]').forEach(g => {
      $$(':scope > .reveal', g).forEach((el, i) => el.style.setProperty('--d', i * 80 + 'ms'));
    });
    const items = $$('.reveal');
    if (reduce || !('IntersectionObserver' in window)) { items.forEach(el => { el.classList.add('in'); fire(el); }); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        io.unobserve(el);
        el.classList.add('in');
        fire(el);
        setTimeout(() => el.style.removeProperty('--d'), 1400);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(el => io.observe(el));
  }

  /* ---------------- Glass: sheen and refraction ---------------- */

  function glassFX() {
    if (!isTouch) {
      let last = null;
      document.addEventListener('pointermove', e => {
        const g = e.target.closest ? e.target.closest('.glass') : null;
        if (last && last !== g) last.classList.remove('is-lit');
        if (g) {
          const r = g.getBoundingClientRect();
          g.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          g.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
          g.classList.add('is-lit');
        }
        last = g;
      }, { passive: true });
    }
    // Edge refraction relies on SVG filters inside backdrop-filter, which only Chromium renders.
    if (window.chrome && !reduce) {
      $$('.glass.refract').forEach(g => {
        g.classList.add('has-layers');
        g.insertAdjacentHTML('afterbegin', '<span class="g-bg" aria-hidden="true"></span><span class="g-edge" aria-hidden="true"></span>');
      });
    }
  }

  /* ---------------- Loader ---------------- */

  function loader(done) {
    const el = $('#loader');
    let started = false;
    const start = () => { if (!started) { started = true; done(); } };
    if (reduce || !el || !root.classList.contains('loading')) {
      if (el) el.remove();
      root.classList.remove('loading');
      start();
      return;
    }
    const plate = $('#loaderPlate'), tile = $('#loaderTile'), line = $('#loaderLine'), copy = $('#loaderCopy'), navTile = $('#navTile');
    const words = line.textContent.trim().split(/\s+/);
    line.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
    const spans = $$('.w', line);
    const timers = [];
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));
    let finished = false;

    spans.forEach((s, i) => T(() => s.classList.add('on'), 160 + i * 92));
    const tShrink = 160 + spans.length * 92 + 240;

    T(() => {
      copy.animate([{ opacity: 1 }, { opacity: 0, filter: 'blur(6px)' }], { duration: 200, fill: 'forwards' });
      const r = tile.getBoundingClientRect();
      plate.animate([
        { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
        { clipPath: `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round ${r.width * .28}px)` }
      ], { duration: 480, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
      tile.classList.add('to-lime');
      start();
    }, tShrink);

    T(() => {
      plate.style.visibility = 'hidden';
      const a = tile.getBoundingClientRect(), b = navTile.getBoundingClientRect();
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
      const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      const an = tile.animate([
        { transform: 'none' },
        { transform: `translate(${dx}px, ${dy}px) scale(${b.width / a.width})` }
      ], { duration: 460, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
      an.onfinish = finish;
    }, tShrink + 500);

    T(finish, 3000); // safety net

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      removeEventListener('keydown', skip);
      root.classList.remove('loading');
      start();
      const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      fade.onfinish = () => el.remove();
      runScroll();
    }
    function skip() { if (!finished) finish(); }
    addEventListener('keydown', skip);
    el.addEventListener('pointerdown', skip);
  }

  /* ---------------- Hero: tilt, flow diagram, modal ---------------- */

  function heroTilt() {
    const hero = $('.hero'), tilt = $('#tilt');
    if (isTouch || reduce || !hero) return;
    hero.addEventListener('pointermove', e => {
      if (innerWidth < 1000) return;
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      tilt.style.setProperty('--ry', (-9 + nx * 10).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', (5 - ny * 8).toFixed(2) + 'deg');
    });
    hero.addEventListener('pointerleave', () => { tilt.style.removeProperty('--ry'); tilt.style.removeProperty('--rx'); });
  }

  const flowCtl = { start() {} };

  function flow() {
    const box = $('#flow'), svg = $('#flowLines'), tip = $('#flowTip');
    if (!box) return;
    const node = id => box.querySelector(`[data-node="${id}"]`);
    const defs = { e12: ['n1', 'n2', 'v'], e23: ['n2', 'n3', 'h'], e34: ['n3', 'n4', 'v'], e45: ['n4', 'n5', 'v'], e26: ['n2', 'n6', 'v'] };
    const E = {};
    let pulse;

    const box4 = el => ({ l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });

    function build() {
      svg.innerHTML = '';
      const W = box.offsetWidth, H = box.offsetHeight;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      for (const k in defs) {
        const [a, b, kind] = defs[k];
        const A = box4(node(a)), B = box4(node(b));
        let d;
        if (kind === 'v') {
          const x1 = A.l + A.w / 2, y1 = A.t + A.h, x2 = B.l + B.w / 2, y2 = B.t, m = (y2 - y1) / 2;
          d = `M${x1},${y1} C${x1},${y1 + m} ${x2},${y2 - m} ${x2},${y2}`;
        } else {
          const x1 = A.l + A.w, y1 = A.t + A.h / 2, x2 = B.l, y2 = B.t + B.h / 2, m = (x2 - x1) / 2;
          d = `M${x1},${y1} C${x1 + m},${y1} ${x2 - m},${y2} ${x2},${y2}`;
        }
        const base = svgEl('path', { d, class: 'e-base' });
        const lit = svgEl('path', { d, class: 'e-lit' });
        svg.append(base, lit);
        const len = lit.getTotalLength();
        const prev = E[k];
        const frac = prev ? prev.frac : 0;
        lit.style.strokeDasharray = `${len} ${len}`;
        lit.style.strokeDashoffset = len * (1 - frac);
        E[k] = { lit, len, frac };
      }
      const g = svgEl('g', { opacity: 0 });
      g.append(svgEl('circle', { r: 9, class: 'p-halo' }), svgEl('circle', { r: 3.5, class: 'p-core' }));
      svg.append(g);
      pulse = g;
      const mid = k => E[k].lit.getPointAtLength(E[k].len * .5);
      const py = mid('e23'), pn = mid('e26');
      Object.assign($('#branchYes').style, { left: py.x + 'px', top: py.y + 'px' });
      Object.assign($('#branchNo').style, { left: (pn.x + 22) + 'px', top: pn.y + 'px' });
    }

    const setLit = (k, f) => { const e = E[k]; e.frac = f; e.lit.style.strokeDashoffset = e.len * (1 - f); };

    build();
    if ('ResizeObserver' in window) new ResizeObserver(() => build()).observe(box);
    if (document.fonts) document.fonts.ready.then(build);

    // tooltips
    let openNode = null;
    const hideTip = () => { tip.classList.remove('show'); openNode && openNode.setAttribute('aria-expanded', 'false'); openNode = null; };
    $$('.node', box).forEach(n => {
      n.setAttribute('aria-expanded', 'false');
      n.addEventListener('click', e => {
        e.stopPropagation();
        if (openNode === n) { hideTip(); return; }
        hideTip();
        openNode = n;
        n.setAttribute('aria-expanded', 'true');
        tip.textContent = n.dataset.tip;
        const W = box.offsetWidth, H = box.offsetHeight;
        tip.style.left = '0px'; tip.style.top = '0px';
        const tw = Math.min(250, W - 8);
        tip.style.maxWidth = tw + 'px';
        const th = tip.offsetHeight;
        const left = clamp(n.offsetLeft, 0, W - tip.offsetWidth);
        let top = n.offsetTop + n.offsetHeight + 8;
        if (top + th > H + 40) top = n.offsetTop - th - 8;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
        requestAnimationFrame(() => tip.classList.add('show'));
      });
    });
    document.addEventListener('click', e => { if (openNode && !tip.contains(e.target)) hideTip(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && openNode) { const n = openNode; hideTip(); n.focus(); } });

    const nodes = $$('.node', box);
    const state = (id, cls) => { const n = node(id); n.classList.remove('is-active', 'is-done'); if (cls) n.classList.add(cls); };

    if (reduce) {
      ['n1', 'n2', 'n3', 'n4', 'n5'].forEach(id => state(id, 'is-done'));
      ['e12', 'e23', 'e34', 'e45'].forEach(k => setLit(k, 1));
      return;
    }

    let visible = false, wake = null;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && wake) { wake(); wake = null; } }).observe(box);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && wake) { wake(); wake = null; } });
    const ready = () => (visible && !document.hidden) ? Promise.resolve() : new Promise(r => { wake = r; });

    function travel(k, dur = 820) {
      return ready().then(() => new Promise(res => {
        const t0 = performance.now();
        pulse.setAttribute('opacity', 1);
        const f = now => {
          const p = clamp((now - t0) / dur, 0, 1), e = easeInOut(p);
          const edge = E[k];
          setLit(k, e);
          const pt = edge.lit.getPointAtLength(edge.len * e);
          pulse.setAttribute('transform', `translate(${pt.x},${pt.y})`);
          if (p < 1) requestAnimationFrame(f); else { pulse.setAttribute('opacity', 0); res(); }
        };
        requestAnimationFrame(f);
      }));
    }
    async function step(id, hold) { await ready(); state(id, 'is-active'); await wait(hold); state(id, 'is-done'); }

    async function loop() {
      let cycle = 0;
      for (;;) {
        await ready();
        nodes.forEach(n => n.classList.remove('is-active', 'is-done'));
        Object.keys(E).forEach(k => setLit(k, 0));
        await wait(420);
        await step('n1', 520);
        await travel('e12');
        await step('n2', 640);
        if (cycle % 3 === 2) {
          await travel('e26');
          await step('n6', 900);
        } else {
          await travel('e23');
          await step('n3', 520);
          await travel('e34');
          await step('n4', 520);
          await travel('e45');
          state('n5', 'is-active');
          await wait(1100);
          state('n5', 'is-done');
        }
        await wait(1700);
        cycle++;
      }
    }
    let begun = false;
    flowCtl.start = () => { if (!begun) { begun = true; loop(); } };
  }

  function modal() {
    const dlg = $('#videoModal'), open = $('#openVideo');
    if (!dlg || !open) return;
    const close = () => { if (dlg.open) dlg.close(); };
    open.addEventListener('click', () => {
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    $$('[data-close]', dlg).forEach(b => b.addEventListener('click', close));
    dlg.addEventListener('close', () => open.focus());
  }

  /* ---------------- Charts ---------------- */

  function smoothPath(pts) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d;
  }

  function dashboard() {
    // week grid
    const w = $('#week');
    if (w) {
      const vals = w.dataset.values.split(',').map(Number), today = +w.dataset.today;
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      w.innerHTML = vals.map((v, i) => {
        const cells = Array.from({ length: 10 }, (_, k) => `<i class="cell${k < v ? ' on' : ''}" style="transition-delay:${300 + i * 70 + k * 40}ms"></i>`).join('');
        return `<div class="col${i === today ? ' today' : ''}${i > today ? ' future' : ''}"><div class="cells">${cells}</div><span class="day">${days[i]}</span></div>`;
      }).join('');
    }
    // ring
    const ring = $('#ring');
    if (ring) {
      const host = ring.closest('.reveal');
      const fill = () => { $('.ring-fg', ring).style.strokeDasharray = `${ring.dataset.value} 100`; };
      host.addEventListener('reveal', fill);
    }
    // cost per lead line
    const svg = $('#cplChart');
    if (svg) {
      const data = [20.5, 20.9, 20.1, 19.8, 20.4, 19.6, 19.2, 19.5, 18.9, 18.6, 19.0, 18.4, 18.1, 18.5, 18.0, 17.8, 18.2, 17.6, 17.9, 17.4];
      const W = 300, H = 110, lo = 16.8, hi = 21.4;
      const pts = data.map((v, i) => [i / (data.length - 1) * W, H - (v - lo) / (hi - lo) * H]);
      const d = smoothPath(pts);
      svg.innerHTML = `<defs><linearGradient id="cplFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4F824" stop-opacity=".28"/><stop offset="1" stop-color="#E4F824" stop-opacity="0"/></linearGradient></defs>
        <line class="grid" x1="0" y1="${H * .2}" x2="${W}" y2="${H * .2}"/><line class="grid" x1="0" y1="${H * .55}" x2="${W}" y2="${H * .55}"/><line class="grid" x1="0" y1="${H}" x2="${W}" y2="${H}"/>
        <path class="area" d="${d} L${W},${H} L0,${H} Z"/>
        <path class="ln" pathLength="1" d="${d}"/>`;
    }
    // sparklines
    $$('.spark').forEach(s => {
      const v = s.dataset.values.split(',').map(Number), m = Math.max(...v);
      s.innerHTML = v.map((x, i) => `<i style="height:${(x / m * 100).toFixed(1)}%;transition-delay:${300 + i * 45}ms"></i>`).join('');
    });
  }

  function iso() {
    const svg = $('#iso');
    if (!svg) return;
    const vals = [14, 17, 15, 21, 19, 24, 22, 27, 26, 31, 29, 36];
    const max = 36, u = 24, g = 1.3, w = .92, Hmax = 4.4;
    const P = (x, y, z) => [(x - y) * .866 * u, (x + y) * .5 * u - z * u];
    // bounds for the fully risen chart
    const xs = [], ys = [];
    vals.forEach((v, i) => {
      const y0 = -i * g, h = v / max * Hmax;
      [[0, y0, 0], [w, y0, 0], [w, y0 + w, 0], [0, y0 + w, 0], [0, y0, h], [w, y0, h], [w, y0 + w, h], [0, y0 + w, h]].forEach(c => { const p = P(...c); xs.push(p[0]); ys.push(p[1]); });
    });
    const pad = 26;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad + 14;
    svg.setAttribute('viewBox', `${minX.toFixed(1)} ${minY.toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}`);

    const blocks = vals.map((v, i) => {
      const grp = svgEl('g');
      const left = svgEl('polygon'), right = svgEl('polygon'), top = svgEl('polygon');
      const last = i === vals.length - 1;
      left.setAttribute('fill', last ? '#8E9A17' : 'rgba(255,255,255,.075)');
      right.setAttribute('fill', last ? '#5F680F' : 'rgba(255,255,255,.035)');
      top.setAttribute('fill', last ? '#E4F824' : 'rgba(255,255,255,.16)');
      [left, right, top].forEach(p => { p.setAttribute('stroke', last ? 'rgba(228,248,36,.9)' : 'rgba(255,255,255,.2)'); p.setAttribute('stroke-width', '.8'); p.setAttribute('stroke-linejoin', 'round'); });
      grp.append(left, right, top);
      if (i % 2 === 1 || last) {
        const lp = P(w, -i * g + w, 0);
        const t = svgEl('text', { x: lp[0].toFixed(1), y: (lp[1] + 16).toFixed(1), 'text-anchor': 'middle' });
        t.textContent = 'w' + (i + 1);
        grp.append(t);
      }
      return { grp, left, right, top, i, h: v / max * Hmax, last };
    });
    const label = svgEl('text', { 'text-anchor': 'middle', fill: '#E4F824', style: 'fill:#E4F824;font-size:13px' });
    label.textContent = String(vals[vals.length - 1]);
    // back to front
    blocks.slice().reverse().forEach(b => svg.append(b.grp));
    svg.append(label);

    const pts = a => a.map(c => P(...c).map(n => n.toFixed(1)).join(',')).join(' ');
    function draw(prog) {
      blocks.forEach(b => {
        const y0 = -b.i * g;
        const h = Math.max(.02, b.h * prog(b.i));
        b.top.setAttribute('points', pts([[0, y0, h], [w, y0, h], [w, y0 + w, h], [0, y0 + w, h]]));
        b.left.setAttribute('points', pts([[0, y0 + w, 0], [w, y0 + w, 0], [w, y0 + w, h], [0, y0 + w, h]]));
        b.right.setAttribute('points', pts([[w, y0, 0], [w, y0 + w, 0], [w, y0 + w, h], [w, y0, h]]));
        if (b.last) {
          const lp = P(w / 2, y0 + w / 2, h);
          label.setAttribute('x', lp[0].toFixed(1));
          label.setAttribute('y', (lp[1] - 14).toFixed(1));
          label.setAttribute('opacity', prog(b.i) > .6 ? 1 : 0);
        }
      });
    }
    if (reduce) { draw(() => 1); return; }
    draw(() => 0);
    svg.closest('.reveal').addEventListener('reveal', () => {
      const t0 = performance.now() + 250;
      const f = now => {
        const el = now - t0;
        draw(i => easeBack(clamp((el - i * 70) / 750, 0, 1)));
        if (el < 750 + vals.length * 70) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
  }

  function whatsapp() {
    const wa = $('#wa');
    if (!wa) return;
    const note = $('#waNote'), confirm = $('#waConfirm'), call = $('#waCall');
    if (reduce) wa.classList.add('is-sent');
    else wa.addEventListener('reveal', () => {
      setTimeout(() => wa.classList.add('is-typing'), 500);
      setTimeout(() => { wa.classList.remove('is-typing'); wa.classList.add('is-sent'); }, 2100);
    });
    confirm.addEventListener('click', () => {
      confirm.classList.add('is-done');
      confirm.textContent = 'Confirmed';
      note.textContent = 'aoife gets a confirmation text straight away. example only.';
    });
    call.addEventListener('click', () => { note.textContent = 'this would ring aoife from whatsapp. example only.'; });
  }

  /* ---------------- Services ---------------- */

  function services() {
    const cards = $$('.svc');
    cards.forEach(card => {
      const b = $('.more-btn', card);
      b.addEventListener('click', () => {
        const open = !card.classList.contains('is-open');
        cards.forEach(c => {
          c.classList.remove('is-open');
          const cb = $('.more-btn', c);
          cb.setAttribute('aria-expanded', 'false');
          $('span', cb).textContent = 'Read more';
        });
        if (open) {
          card.classList.add('is-open');
          b.setAttribute('aria-expanded', 'true');
          $('span', b).textContent = 'Show less';
        }
      });
    });
  }

  /* ---------------- How it works: lime plate ---------------- */

  const plateState = { covered: false };

  function how() {
    const sec = $('#how');
    if (!sec) return;
    const nav = $('#nav');
    const plate = $('#howPlate'), tile = $('#howTile'), content = $('#howContent'), steps = $$('.step', sec), mark = $('.mark', tile);
    if (reduce) { sec.classList.add('is-static'); steps.forEach(s => s.classList.add('on')); return; }
    function update() {
      const r = sec.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) { plateState.covered = false; nav.classList.remove('on-plate'); return; }
      const total = Math.max(1, r.height - vh);
      const p = clamp(-r.top / total, 0, 1);
      const W = sec.clientWidth, H = vh;
      const ts = clamp(Math.min(W, H) * .16, 76, 120);
      const appear = easeOut(seg(p, 0, .1));
      const open = easeInOut(seg(p, .1, .24)) * (1 - easeInOut(seg(p, .8, .92)));
      const fade = seg(p, .92, 1);
      const m = W < 700 ? 10 : 18;
      const ti = lerp((H - ts) / 2, m, open), li = lerp((W - ts) / 2, m, open);
      const R = lerp(ts * .28, 28, open);
      plate.style.clipPath = `inset(${ti.toFixed(1)}px ${li.toFixed(1)}px ${ti.toFixed(1)}px ${li.toFixed(1)}px round ${R.toFixed(1)}px)`;
      plate.style.visibility = open > .001 ? 'visible' : 'hidden';
      const tileVis = appear * (1 - fade) * (1 - seg(open, .25, .55));
      tile.style.width = ts + 'px';
      tile.style.opacity = tileVis.toFixed(3);
      tile.style.transform = `translate(-50%, -50%) scale(${(lerp(.6, 1, appear) * lerp(1, .8, fade)).toFixed(3)})`;
      mark.style.opacity = (1 - seg(open, 0, .3)).toFixed(3);
      const c = seg(open, .55, 1);
      content.style.opacity = c.toFixed(3);
      content.style.transform = `scale(${lerp(.96, 1, c).toFixed(3)})`;
      const sp = seg(p, .27, .74) * 4;
      steps.forEach((s, i) => s.classList.toggle('on', sp > i + .12));
      plateState.covered = open > .995;
      nav.classList.toggle('on-plate', open > .3);
    }
    scrollFns.push(update);
    resizeFns.push(update);
    update();
  }

  /* ---------------- Pricing ---------------- */

  const eur = v => '€' + Math.round(v).toLocaleString('en-IE');

  function pricing() {
    const range = $('#spend');
    if (!range) return;
    const out = $('#spendOut'), note = $('#calcNote');
    const els = { pkg: $('#outPkg'), fee: $('#outFee'), ads: $('#outAds'), total: $('#outTotal'), first: $('#outFirst') };
    const cur = { fee: 900, ads: 760, total: 1660, first: 1910 };
    const raf = {};
    const bump = el => { el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll'); };
    function tween(k, to) {
      const el = els[k], from = cur[k];
      cur[k] = to;
      cancelAnimationFrame(raf[k]);
      if (reduce || from === to) { el.textContent = eur(to); return; }
      const t0 = performance.now(), dur = 480;
      const f = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = eur(lerp(from, to, easeOut(p)));
        if (p < 1) raf[k] = requestAnimationFrame(f);
      };
      raf[k] = requestAnimationFrame(f);
    }
    function update() {
      const d = +range.value;
      const frac = (d - +range.min) / (+range.max - +range.min);
      range.style.setProperty('--p', `calc(${frac.toFixed(4)} * (100% - 30px) + 15px)`);
      range.setAttribute('aria-valuetext', `€${d} a day`);
      out.textContent = '€' + d;
      const full = d >= 15;
      note.hidden = full;
      const fee = full ? 900 : 400, setup = full ? 250 : 0, ads = Math.round(d * 30.4);
      const name = full ? 'Full Lead System' : 'Lead Starter';
      if (els.pkg.textContent !== name) { els.pkg.textContent = name; if (!reduce) bump(els.pkg); }
      tween('fee', fee); tween('ads', ads); tween('total', fee + ads); tween('first', fee + ads + setup);
    }
    range.addEventListener('input', update);
    update();

    // plan type toggle
    const tabs = [$('#tabWeb'), $('#tabLead')], panels = [$('#plansWeb'), $('#plansLead')], thumb = $('.seg-thumb');
    const moveThumb = () => {
      const t = tabs.find(x => x.getAttribute('aria-selected') === 'true');
      thumb.style.width = t.offsetWidth + 'px';
      thumb.style.transform = `translateX(${t.offsetLeft - 5}px)`;
    };
    const select = (i, focus) => {
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach((p, k) => { p.classList.toggle('is-on', k === i); p.inert = k !== i; });
      moveThumb();
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(i ? 0 : 1, true); }
      });
    });
    select(0);
    resizeFns.push(moveThumb);
    if (document.fonts) document.fonts.ready.then(moveThumb);

    // plan choice
    const plans = $$('.plan');
    const labelFor = p => 'Choose ' + p.dataset.plan;
    const interest = $('#fInterest');
    const choose = card => {
      plans.forEach(p => {
        const on = p === card;
        p.classList.toggle('is-chosen', on);
        const b = $('.plan-btn', p);
        b.setAttribute('aria-pressed', String(on));
        b.textContent = on ? 'Chosen, book a call' : labelFor(p);
      });
      interest.value = card.dataset.plan;
    };
    const goForm = card => {
      interest.value = card.dataset.plan;
      interest.classList.remove('just-filled'); void interest.offsetWidth; interest.classList.add('just-filled');
      scrollToEl($('#contactForm'));
      focusAfterScroll($('#fName'));
    };
    plans.forEach(card => {
      const b = $('.plan-btn', card);
      card.addEventListener('click', e => { if (!e.target.closest('.plan-btn')) choose(card); });
      b.addEventListener('click', () => { if (card.classList.contains('is-chosen')) goForm(card); else choose(card); });
    });
  }

  /* ---------------- FAQ ---------------- */

  function faq() {
    const items = $$('.qa');
    items.forEach(qa => {
      const b = $('button', qa);
      b.addEventListener('click', () => {
        const open = b.getAttribute('aria-expanded') !== 'true';
        items.forEach(o => { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); });
        if (open) { qa.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  /* ---------------- Forms ---------------- */

  const phoneOk = v => /^[+\d\s()]+$/.test(v.trim()) && v.replace(/\D/g, '').length >= 7;
  const SEND_FAIL = 'Sorry, that did not send. Your details are still here, so check your internet connection and press Send again, or message us on WhatsApp.';

  async function post(form) {
    const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('failed');
  }

  function forms() {
    const f = $('#contactForm');
    if (f) {
      const btn = $('#submitBtn'), msg = $('#formMsg');
      const rules = [
        ['fName', v => v.trim().length > 1, 'Please add your name.'],
        ['fPhone', phoneOk, 'Please add a phone number we can text, like 087 123 4567.'],
        ['fTrade', v => v.trim().length > 1, 'Please tell us your business or trade.'],
        ['fTown', v => v.trim().length > 1, 'Please add your town.'],
        ['fConsent', (v, el) => el.checked, 'Please tick the box so we are allowed to contact you.']
      ];
      const check = ([id, fn, m]) => {
        const el = $('#' + id), err = $('#' + id + 'Err');
        const ok = fn(el.value, el);
        el.setAttribute('aria-invalid', String(!ok));
        err.textContent = ok ? '' : m;
        if (ok) el.removeAttribute('aria-describedby'); else el.setAttribute('aria-describedby', id + 'Err');
        return ok ? null : el;
      };
      rules.forEach(r => {
        const el = $('#' + r[0]);
        el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => { if (el.getAttribute('aria-invalid') === 'true') check(r); });
      });
      f.addEventListener('submit', async e => {
        e.preventDefault();
        if (btn.classList.contains('is-sent') || btn.disabled) return;
        let first = null;
        rules.forEach(r => { const bad = check(r); if (bad && !first) first = bad; });
        if (first) {
          msg.className = 'form-msg bad';
          msg.textContent = 'A few details are missing. Please check the fields marked in red.';
          first.focus();
          return;
        }
        btn.disabled = true;
        btn.classList.add('is-busy');
        msg.className = 'form-msg';
        msg.textContent = 'Sending...';
        try {
          await post(f);
          btn.classList.remove('is-busy');
          btn.classList.add('is-sent');
          btn.setAttribute('aria-label', 'Sent');
          msg.className = 'form-msg ok';
          msg.textContent = 'Sent. We will be in touch within one working day.';
        } catch (_) {
          btn.classList.remove('is-busy');
          btn.disabled = false;
          msg.className = 'form-msg bad';
          msg.textContent = SEND_FAIL;
        }
      });
    }

    const q = $('#quickForm');
    if (q) {
      const input = $('#qPhone'), btn = $('#quickSend'), msg = $('#quickMsg');
      q.addEventListener('submit', async e => {
        e.preventDefault();
        if (btn.disabled) return;
        if (!phoneOk(input.value)) {
          input.setAttribute('aria-invalid', 'true');
          msg.textContent = 'Please add a phone number we can text, like 087 123 4567.';
          input.focus();
          return;
        }
        input.removeAttribute('aria-invalid');
        btn.disabled = true;
        btn.textContent = 'Sending';
        msg.textContent = '';
        try {
          await post(q);
          btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" style="stroke-width:2.4"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Sent';
          msg.textContent = 'Sent. We will be in touch within one working day.';
        } catch (_) {
          btn.disabled = false;
          btn.textContent = 'Send';
          msg.textContent = SEND_FAIL;
        }
      });
    }
  }

  /* ---------------- The stream of light ---------------- */

  function stream() {
    const main = $('#main'), svg = $('#stream');
    if (!main || !svg) return;
    const track = $('#streamTrack'), lit = [$('#streamGlow2'), $('#streamGlow'), $('#streamCore')];
    const head = $('#streamHead'), halo = $('#streamHalo');
    let samples = [], len = 0, cur = 0, tgt = 0, raf = 0, mainTop = 0;

    function build() {
      const mr = main.getBoundingClientRect();
      mainTop = mr.top + scrollY;
      const W = main.clientWidth, H = main.offsetHeight;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const narrow = W < 720;
      let pts = $$('[data-stream]').map(el => {
        const r = el.getBoundingClientRect();
        const fixed = el.hasAttribute('data-stream-fixed');
        const fy = parseFloat(el.dataset.streamY || '.5');
        return { x: r.left + r.width / 2 - mr.left, y: r.top + r.height * fy + (fixed ? 0 : scrollY) - mainTop, end: el.hasAttribute('data-stream-end') };
      }).filter(p => p.y > -200 && isFinite(p.y)).sort((a, b) => a.y - b.y);
      if (pts.length < 2) return;
      if (narrow) pts = pts.map((p, i) => (i === 0 || p.end) ? p : { x: i % 2 ? W - 10 : 10, y: p.y });
      const d = smoothPath(pts.map(p => [p.x, p.y]));
      track.setAttribute('d', d);
      lit.forEach(p => p.setAttribute('d', d));
      len = lit[2].getTotalLength();
      lit.forEach(p => { p.style.strokeDasharray = `${len} ${len + 20}`; });
      samples = [];
      const N = Math.min(900, Math.max(200, Math.round(len / 12)));
      let maxY = -1e9;
      for (let k = 0; k <= N; k++) {
        const l = len * k / N, pt = lit[2].getPointAtLength(l);
        maxY = Math.max(maxY, pt.y);
        samples.push([l, maxY]);
      }
      svg.style.opacity = narrow ? .5 : 1;
      cur = Math.min(cur, len);
      update();
      paint();
    }

    function lengthAtY(y) {
      if (!samples.length) return 0;
      let lo = 0, hi = samples.length - 1;
      if (y <= samples[0][1]) return 0;
      if (y >= samples[hi][1]) return len;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (samples[m][1] < y) lo = m; else hi = m; }
      const a = samples[lo], b = samples[hi];
      return lerp(a[0], b[0], (y - a[1]) / Math.max(.001, b[1] - a[1]));
    }

    function paint() {
      lit.forEach(p => { p.style.strokeDashoffset = (len - cur).toFixed(1); });
      if (cur < 2) { head.style.opacity = halo.style.opacity = 0; return; }
      const pt = lit[2].getPointAtLength(cur);
      head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y);
      halo.setAttribute('cx', pt.x); halo.setAttribute('cy', pt.y);
      head.style.opacity = halo.style.opacity = cur >= len - 1 ? .6 : 1;
    }

    function loop() {
      const diff = tgt - cur;
      if (Math.abs(diff) < .5 || reduce) { cur = tgt; paint(); raf = 0; return; }
      cur += diff * .12;
      paint();
      raf = requestAnimationFrame(loop);
    }

    function update() {
      tgt = lengthAtY(scrollY + vh * .62 - mainTop);
      if (!raf) raf = requestAnimationFrame(loop);
    }

    scrollFns.push(update);
    let t;
    const rebuild = () => { clearTimeout(t); t = setTimeout(build, 160); };
    resizeFns.push(rebuild);
    if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(main);
    if (document.fonts) document.fonts.ready.then(rebuild);
    addEventListener('load', rebuild);
    build();
  }

  /* ---------------- Living background (Three.js) ---------------- */

  function background() {
    const canvas = $('#bg');
    const weak = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
    if (reduce || weak || !window.THREE || !canvas) { root.classList.add('no-webgl'); return; }
    const THREE = window.THREE;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { root.classList.add('no-webgl'); return; }
    const mobile = innerWidth < 760;
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    const uniforms = {
      uTime: { value: 0 },
      uAspect: { value: innerWidth / innerHeight },
      uScroll: { value: 0 },
      uPx: { value: dpr },
      uA: { value: new THREE.Vector4() },
      uB: { value: new THREE.Vector4() },
      uC: { value: new THREE.Vector4() }
    };

    const common = `
      uniform float uTime; uniform float uAspect; uniform float uScroll;
      uniform vec4 uA; uniform vec4 uB; uniform vec4 uC;
      const vec3 LIME = vec3(0.894, 0.973, 0.141);
      const vec3 TEAL = vec3(0.2, 0.878, 0.69);
      const vec3 BLUE = vec3(0.082, 0.086, 0.941);
      vec2 strandPos(float t, vec3 s) {
        float o = s.x;
        float xn = (t * 2.0 - 1.0) * 1.25;
        float xs = xn * clamp(uAspect, 0.6, 2.0);
        float ph = uTime * 0.11 + uScroll;
        float env = 0.45 + 0.55 * (0.5 + 0.5 * sin(xs * 0.9 + ph * 0.8 + s.y * 0.2));
        float y = uA.x + uA.z * xn
          + uA.y * sin(xs * uB.w * 0.6 + ph + s.y * 0.12)
          + 0.05 * sin(xs * 1.9 - ph * 1.4 + o * 2.2)
          + o * uA.w * env
          + uC.z * o * 0.25 * sin(xs * 1.3 + ph * 1.2);
        float d = xn - uB.y;
        float yf = uB.z + o * (abs(d) * 0.95 + 0.02) + 0.04 * sin(ph * 1.7 + o * 6.0 + xs * 2.0) * abs(d);
        y = mix(y, yf, uB.x);
        return vec2(xn, y);
      }
      vec3 strandColor(float k) {
        vec3 c = mix(LIME, TEAL, smoothstep(0.0, 0.55, k));
        return mix(c, BLUE, smoothstep(0.5, 1.0, k));
      }`;

    // strands
    const S = mobile ? 150 : 300, N = mobile ? 90 : 140;
    const aT = new Float32Array(S * N), aS = new Float32Array(S * N * 3), pos = new Float32Array(S * N * 3);
    const idx = [];
    const seeds = [];
    for (let s = 0; s < S; s++) {
      let o = Math.random() * 2 - 1;
      o = Math.sign(o) * Math.pow(Math.abs(o), 1.25);
      const seed = [o, Math.random() * 6.283, Math.random() < .045 ? 2.2 : .35 + Math.random() * .65];
      seeds.push(seed);
      for (let n = 0; n < N; n++) {
        const i = s * N + n;
        aT[i] = n / (N - 1);
        aS[i * 3] = seed[0]; aS[i * 3 + 1] = seed[1]; aS[i * 3 + 2] = seed[2];
        if (n < N - 1) idx.push(i, i + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
    geo.setAttribute('aS', new THREE.BufferAttribute(aS, 3));
    geo.setIndex(idx);
    const lineMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: common + `
        attribute float aT; attribute vec3 aS;
        varying vec3 vC; varying float vA;
        void main() {
          vec2 p = strandPos(aT, aS);
          float k = clamp(0.5 + 0.55 * aS.x + 0.22 * sin(p.x * 1.4 + uTime * 0.09 + aS.y), 0.0, 1.0);
          vC = strandColor(k);
          float edge = smoothstep(0.0, 0.12, aT) * smoothstep(1.0, 0.88, aT);
          float core = 1.0 - smoothstep(0.1, 1.0, abs(aS.x));
          vA = (0.03 + 0.1 * core) * aS.z * edge * uC.x * mix(1.0, 0.7, smoothstep(0.5, 1.0, k));
          gl_Position = vec4(p, 0.0, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main() { gl_FragColor = vec4(vC, vA); }`
    });
    const lines = new THREE.LineSegments(geo, lineMat);
    lines.frustumCulled = false;
    scene.add(lines);

    // particles drifting along strands
    const PC = mobile ? 260 : 620;
    const pS = new Float32Array(PC * 3), pP = new Float32Array(PC * 3), pPos = new Float32Array(PC * 3);
    for (let i = 0; i < PC; i++) {
      const sd = seeds[(Math.random() * seeds.length) | 0];
      pS[i * 3] = sd[0]; pS[i * 3 + 1] = sd[1]; pS[i * 3 + 2] = Math.random();
      pP[i * 3] = Math.random(); pP[i * 3 + 1] = .008 + Math.random() * .025; pP[i * 3 + 2] = 1.2 + Math.random() * 2.4;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aS', new THREE.BufferAttribute(pS, 3));
    pGeo.setAttribute('aP', new THREE.BufferAttribute(pP, 3));
    const pMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: common + `
        uniform float uPx;
        attribute vec3 aS; attribute vec3 aP;
        varying vec3 vC; varying float vA;
        void main() {
          float t = fract(aP.x + uTime * aP.y);
          vec2 p = strandPos(t, aS);
          float edge = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.9, t);
          vA = (0.35 + 0.65 * aS.z) * edge * uC.x * (0.55 + 0.45 * sin(uTime * 2.0 + aP.x * 40.0));
          vC = mix(vec3(1.0), LIME, 0.5 + 0.5 * sin(aP.x * 20.0));
          gl_PointSize = aP.z * uPx;
          gl_Position = vec4(p, 0.0, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vC, vA * smoothstep(0.5, 0.0, d));
        }`
    });
    const points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    scene.add(points);

    // Poses per section: A = centre y, amplitude, tilt, spread. B = fan, fan x, fan y, frequency. C = intensity, unused, twist, unused.
    const poses = {
      hero:     [.05, .16, -.12, .55,   1, .42, .06, 1.2,   1, 0, .2, 0],
      reliable: [-.4, .22, .35, .32,    0, 0, 0, 1.4,       .75, 0, .5, 0],
      tuesday:  [0, .12, -.22, .75,     0, 0, 0, 1.0,       .62, 0, .1, 0],
      followup: [.3, .25, -.45, .3,     0, 0, 0, 1.8,       .75, 0, .6, 0],
      services: [-.55, .2, .12, .28,    0, 0, 0, 1.3,       .62, 0, .3, 0],
      how:      [0, .1, 0, .9,          .6, 0, 0, 1.0,      .9, 0, .2, 0],
      numbers:  [.42, .2, .3, .32,      0, 0, 0, 1.5,       .7, 0, .4, 0],
      pricing:  [-.12, .15, -.12, .48,  0, 0, 0, 1.1,       .72, 0, .2, 0],
      faq:      [-.6, .2, .22, .22,     0, 0, 0, 1.4,       .55, 0, .3, 0],
      contact:  [0, .2, .25, .6,        .8, .25, -.1, 1.2,  1, 0, .3, 0]
    };
    const poseFor = name => {
      const p = (poses[name] || poses.hero).slice();
      if (innerWidth < 1000 && name === 'hero') { p[5] = 0; p[6] = -.3; }
      if (innerWidth < 1000 && name === 'contact') { p[5] = 0; p[6] = .1; }
      if (innerWidth < 760) p[3] *= .8;
      return p;
    };
    const cur = poseFor('hero'), tgt = cur.slice();
    const sections = $$('[data-pose]');
    let poseName = 'hero';
    scrollFns.push(() => {
      const mid = vh * .5;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) { poseName = s.dataset.pose; break; }
      }
      const p = poseFor(poseName);
      for (let i = 0; i < 12; i++) tgt[i] = p[i];
    });

    let lastW = 0, lastH = 0;
    function size(force) {
      const w = innerWidth, h = innerHeight;
      if (!force && w === lastW && Math.abs(h - lastH) < 140) return;
      lastW = w; lastH = h;
      renderer.setSize(w, h, false);
      uniforms.uAspect.value = w / h;
    }
    size(true);
    resizeFns.push(() => size(false));

    let raf = 0, last = performance.now(), time = Math.random() * 40, scrollS = scrollY;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      time += dt;
      const k = 1 - Math.exp(-dt * 1.6);
      for (let i = 0; i < 12; i++) cur[i] += (tgt[i] - cur[i]) * k;
      scrollS += (scrollY - scrollS) * (1 - Math.exp(-dt * 3));
      if (plateState.covered) return;
      uniforms.uTime.value = time;
      uniforms.uScroll.value = scrollS / Math.max(600, vh) * .45;
      uniforms.uA.value.set(cur[0], cur[1], cur[2], cur[3]);
      uniforms.uB.value.set(cur[4], cur[5], cur[6], cur[7]);
      uniforms.uC.value.set(cur[8], cur[9], cur[10], cur[11]);
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; root.classList.add('no-webgl'); });
  }

  /* ---------------- Boot ---------------- */

  background();
  nav();
  glassFX();
  heroTilt();
  flow();
  modal();
  dashboard();
  iso();
  whatsapp();
  services();
  how();
  pricing();
  faq();
  forms();
  stream();
  runScroll();

  loader(() => {
    reveals();
    flowCtl.start();
  });
})();
