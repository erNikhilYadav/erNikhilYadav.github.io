const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const root = document.documentElement;

// The email is put together here so bots scanning the HTML don't find it
const mail = $('.contact .mail');
mail.href = `mailto:${mail.dataset.user}@${mail.dataset.host}`;
mail.textContent = `${mail.dataset.user}@${mail.dataset.host}`;

// Lights: paper by day, blueprint by night
const lights = $('#lights');
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
const paintLights = () => {
  lights.textContent = isDark() ? 'turn the lights on' : 'turn the lights off';
  lights.setAttribute('aria-pressed', String(isDark()));
};
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch {}
paintLights();
lights.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  paintLights();
});

// Scrolling past the intro pulls the phone apart
const phone = $('#phone');
const parts = $('.parts');
const hero = $('.hero');
const onScroll = () => {
  const p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.7)));
  root.style.setProperty('--explode', p.toFixed(3));
  parts.classList.toggle('live', p > 0.6);
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// The chapter in the middle of the screen lights up its layer
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const layer = e.target.dataset.layer;
    document.body.dataset.active = layer;
    // layers above the one you're reading peel off, so it's never hidden
    const order = ['armor', 'radio', 'memory', 'brain', 'pixels', 'glass'];
    const at = order.indexOf(layer);
    phone.querySelectorAll('.layer').forEach((el) => {
      el.classList.toggle('peeled', at >= 0 && order.indexOf(el.dataset.layer) > at);
    });
    // legend: current layer is red, earlier ones are ticked off
    let past = true;
    document.querySelectorAll('.parts li').forEach((li) => {
      const on = li.dataset.layer === layer;
      if (on) past = false;
      li.classList.toggle('on', on);
      li.classList.toggle('done', past && layer !== 'none');
    });
  });
}, { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('.chapter').forEach((c) => io.observe(c));

// Sections draw their pencil marks once they scroll into view
const seenIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('seen'); seenIO.unobserve(e.target); } });
}, { threshold: 0.2 });
document.querySelectorAll('.chapter, .page, .close').forEach((el) => seenIO.observe(el));

// 1. Touch
const pad = $('#touchpad');
const out = $('#touchout');
const touch = (x, y) => {
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.left = x + 'px';
  dot.style.top = y + 'px';
  pad.append(dot);
  dot.addEventListener('animationend', () => dot.remove());
  out.textContent = `you touched x ${Math.round(x)}, y ${Math.round(y)}`;
};
pad.addEventListener('pointerdown', (e) => {
  const r = pad.getBoundingClientRect();
  touch(e.clientX - r.left, e.clientY - r.top);
});
pad.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  touch(pad.clientWidth / 2, pad.clientHeight / 2);
});

// 2. Compose state
let seats = 0;
$('#countBtn').addEventListener('click', () => {
  $('#countVal').textContent = ++seats;
  $('#recompose').hidden = false;
});

// 3. Coroutines: one by one vs all at once
const bars = [...document.querySelectorAll('.race-row i')];
const fill = (bar) => new Promise((done) => {
  const ms = +bar.dataset.ms;
  bar.style.transition = `background-size ${ms}ms linear`;
  requestAnimationFrame(() => { bar.style.backgroundSize = '100% 100%'; });
  setTimeout(done, ms);
});
let racing = false;
document.querySelectorAll('[data-race]').forEach((btn) => btn.addEventListener('click', async () => {
  if (racing) return;
  racing = true;
  bars.forEach((b) => { b.style.transition = 'none'; b.style.backgroundSize = '0% 100%'; });
  await wait(50);
  const t0 = performance.now();
  if (btn.dataset.race === 'serial') { for (const b of bars) await fill(b); }
  else await Promise.all(bars.map(fill));
  const s = ((performance.now() - t0) / 1000).toFixed(1);
  $('#raceOut').textContent = btn.dataset.race === 'serial'
    ? `one by one took ${s}s`
    : `all at once took ${s}s. That's coroutines.`;
  racing = false;
}));

// 4. Offline-first queue
let online = true;
let n = 0;
const wifiBtn = $('#wifiBtn');
const queue = $('#queue');
const syncAll = async () => {
  for (const li of queue.querySelectorAll('.waiting')) {
    await wait(350);
    li.className = 'synced';
  }
};
wifiBtn.addEventListener('click', () => {
  online = !online;
  wifiBtn.textContent = online ? '📶 Internet: on' : '🚫 Internet: off';
  wifiBtn.setAttribute('aria-pressed', String(online));
  if (online) syncAll();
});
$('#ticketBtn').addEventListener('click', () => {
  const li = document.createElement('li');
  li.textContent = `ticket #${String(++n).padStart(3, '0')}`;
  li.className = online ? 'synced' : 'waiting';
  queue.prepend(li);
  while (queue.children.length > 5) queue.lastChild.remove();
});

// 5. Wi-Fi Direct
const packet = $('#packet');
$('#sendBtn').addEventListener('click', () => {
  packet.classList.remove('go');
  void packet.offsetWidth; // restart the animation
  packet.classList.add('go');
  $('#sendOut').textContent = 'sending phone to phone…';
  packet.addEventListener('animationend', () => { $('#sendOut').textContent = 'arrived. No internet used.'; }, { once: true });
});

// 6. Try to break it
const tiny = $('#tinyPhone');
let survived = 0;
document.querySelectorAll('[data-break]').forEach((btn) => btn.addEventListener('click', () => {
  tiny.className = 'tiny-phone';
  void tiny.offsetWidth;
  tiny.classList.add(btn.dataset.break);
  $('#survived').textContent = `survived ${++survived} ${survived === 1 ? 'time' : 'times'}. Still running.`;
}));

// ---- Hero toys ----
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;

// Mouse moves the doodles and tilts the phone toward the pencil
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || reduced) return;
  const mx = e.clientX / innerWidth * 2 - 1;
  const my = e.clientY / innerHeight * 2 - 1;
  root.style.setProperty('--mx', mx.toFixed(3));
  root.style.setProperty('--my', my.toFixed(3));
  const calm = 1 - Math.min(1, scrollY / (hero.offsetHeight * 0.7)); // no tilt once it's open
  const r = phone.getBoundingClientRect();
  const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
  const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
  phone.style.setProperty('--tilt-x', (dx * 40 * calm).toFixed(2) + 'deg');
  phone.style.setProperty('--tilt-y', (-dy * 30 * calm).toFixed(2) + 'deg');
});

// Pencil leaves a fading graphite line
const canvas = $('#trail');
const ctx = canvas.getContext('2d');
const sizeCanvas = () => {
  const d = devicePixelRatio || 1;
  canvas.width = innerWidth * d;
  canvas.height = innerHeight * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
};
sizeCanvas();
addEventListener('resize', sizeCanvas);
let last = null;
let inkUntil = 0;
let fading = false;
const fade = () => {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,.07)';
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.globalCompositeOperation = 'source-over';
  if (performance.now() < inkUntil) requestAnimationFrame(fade);
  else { ctx.clearRect(0, 0, innerWidth, innerHeight); fading = false; }
};
if (fine && !reduced) {
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = { x: e.clientX, y: e.clientY };
    if (last) {
      ctx.strokeStyle = getComputedStyle(root).getPropertyValue('--graphite');
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x + (Math.random() - 0.5), p.y + (Math.random() - 0.5));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    last = p;
    inkUntil = performance.now() + 1500;
    if (!fading) { fading = true; requestAnimationFrame(fade); }
  });
  document.addEventListener('pointerleave', () => { last = null; });
}

// Bugs: they crawl out of the phone, run from the pencil, squash on click
const BUGS = 5;
const bugBox = $('#bugs');
const bugCount = $('#bugCount');
const bugSvg = '<svg viewBox="0 0 30 30"><path class="legs" d="M9 11 3 7M8 15H2M9 19l-6 4M21 11l6-4M22 15h6M21 19l6 4M13 6 11 2M17 6l2-4"/><ellipse class="shell" cx="15" cy="16" rx="7" ry="9"/><circle class="head" cx="15" cy="7" r="3.5"/><path d="M15 9v16" stroke="currentColor" stroke-width="1.2" opacity=".5"/></svg>';
let squashed = 0;
let pencil = { x: -999, y: -999 };
addEventListener('pointermove', (e) => { pencil = { x: e.clientX, y: e.clientY + scrollY }; });

const r0 = phone.getBoundingClientRect();
const bugs = Array.from({ length: BUGS }, (_, i) => {
  const el = document.createElement('span');
  el.className = 'bug';
  el.innerHTML = bugSvg;
  bugBox.append(el);
  const b = {
    el,
    x: r0.left + r0.width / 2,
    y: r0.top + r0.height / 2 + scrollY,
    a: (i / BUGS) * Math.PI * 2,
    alive: true,
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!b.alive) return;
    b.alive = false;
    el.classList.add('squashed');
    squashed++;
    bugCount.innerHTML = squashed < BUGS
      ? `<b>${squashed}</b> squashed, ${BUGS - squashed} still loose.`
      : 'All bugs fixed. That\'s my day job: my last app ran crash-free for <b>99.95%</b> of people.';
  });
  return b;
});

const place = (b) => { b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.a + Math.PI / 2}rad)`; };
let started = 0;
let prev = 0;
const crawl = (t) => {
  if (!started) started = t;
  const dt = Math.min(0.05, (t - (prev || t)) / 1000); // seconds, same speed on 60Hz and 120Hz
  prev = t;
  const w = bugBox.clientWidth;
  const h = bugBox.clientHeight;
  const awake = t - started > 2600; // wait for the hero to finish drawing
  if (awake && scrollY < h) {
    for (const b of bugs) {
      if (!b.alive) continue;
      const dx = b.x - pencil.x;
      const dy = b.y - pencil.y;
      const dist = Math.hypot(dx, dy);
      const near = dist < 90;
      if (near) b.a += Math.atan2(Math.sin(Math.atan2(dy, dx) - b.a), Math.cos(Math.atan2(dy, dx) - b.a)) * 0.08;
      else b.a += (Math.random() - 0.5) * 0.25;
      // px per second; it freezes in fear when the pencil is right on it
      const v = dist < 36 ? 0 : near ? 55 : 32;
      b.x += Math.cos(b.a) * v * dt;
      b.y += Math.sin(b.a) * v * dt;
      if (b.x < 20 || b.x > w - 20) { b.a = Math.PI - b.a; b.x = Math.min(Math.max(b.x, 20), w - 20); }
      if (b.y < 20 || b.y > h - 20) { b.a = -b.a; b.y = Math.min(Math.max(b.y, 20), h - 20); }
      place(b);
    }
  }
  if (squashed < BUGS) requestAnimationFrame(crawl);
};
if (reduced) {
  // no crawling: scatter them in place so they can still be caught
  bugs.forEach((b, i) => { b.x = 80 + i * 0.18 * innerWidth; b.y = innerHeight * (0.2 + (i % 3) * 0.25); place(b); });
} else {
  bugs.forEach((b) => { b.el.style.opacity = 0; place(b); });
  setTimeout(() => bugs.forEach((b) => { b.el.style.transition = 'opacity .4s'; b.el.style.opacity = 1; }), 2600);
  requestAnimationFrame(crawl);
}
