/* ODAROO & CO. — THE PLAYER'S PAPER (odaroo.co)
   1. builds every 3D cartridge from its data attributes (one box, six faces);
   2. turns the cartridges with the scroll: a spread's cartridge makes a full turn while its story is read;
   3. runs the stills only while they are on screen;
   4. the music: the arcade's song starts by itself; a speaker and the jukebox control it. */
(function () {
  'use strict';
  var calm = false;
  try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var GAME = { inkville: 1, lunatide: 1, chromeanimals: 1, vrlabs: 1, lusolaos: 1, edgework: 1 };

  /* ── 1. the cartridges ── */
  var carts = [].slice.call(document.querySelectorAll('.cart3d'));
  carts.forEach(function (el, i) {
    var slug = el.dataset.slug, title = el.dataset.title || '';
    el.innerHTML =
      '<span class="cf f"><span class="ridges"></span><span class="label"><span class="win"><img alt="" src="art/cart-' + slug + '.png"' +
      (GAME[slug] ? '' : ' style="image-rendering:auto"') + '></span><span class="lt">' + title + '</span></span></span>' +
      '<span class="cf b"><span class="bk">ODAROO<br>&amp; CO.</span></span>' +
      '<span class="cf l"></span><span class="cf r"></span><span class="cf t"></span><span class="cf u"></span>';
    el._base = parseFloat(el.dataset.ry || '-24');
    el._i = i;
    el._spread = el.hasAttribute('data-scroll') ? el.closest('.spread') : null;
    el.style.animationDelay = (-(i * 0.7) % 4.6) + 's';
  });

  /* ── 2. the scroll turns them ── */
  var queued = false;
  function turn() {
    queued = false;
    var vh = innerHeight, y = scrollY;
    for (var k = 0; k < carts.length; k++) {
      var el = carts[k], ry, rx = -8;
      if (el._spread) {
        var r = el._spread.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        /* the label faces the reader as the story reaches reading height, then the cartridge makes one
           full turn (label, spine, back, label) while the story is read; on the way in it spins up */
        var lead = (r.top - vh * 0.3) / vh;
        var q = Math.max(0, Math.min(1, (vh * 0.3 - r.top) / Math.max(1, r.height - vh * 0.7)));
        ry = -26 + q * 360 - Math.max(0, lead) * 200;
        rx = -9 + Math.sin(q * Math.PI * 2) * 7;
      } else {
        ry = el._base + Math.sin(y / 190 + el._i * 0.9) * 16;
      }
      ry += mx * 16; rx -= my * 9;              /* the mouse leans every cartridge a little */
      el.style.transform = 'rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg)';
    }
    extras(vh, y);
  }
  var mx = 0, my = 0;
  addEventListener('mousemove', function (e) { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; if (!calm) ask(); }, { passive: true });
  function ask() { if (!queued) { queued = true; requestAnimationFrame(turn); } }
  if (calm) carts.forEach(function (el) { el.style.transform = 'rotateX(-8deg) rotateY(' + el._base + 'deg)'; });
  else { addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); }   /* the first turn() runs after section 2b has set up */

  /* ── 2b. THE FUN PASS: everything else that moves with the scroll ──
     the reading bar and the lit section on top, strips of type that run sideways, stills and titles that
     drift (parallax), and the flying bits, each on its own depth. Only transform / translate is written. */
  document.documentElement.classList.add('js');
  var bar = document.querySelector('.tb-bar'), links = [].slice.call(document.querySelectorAll('.tb-links a'));
  var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var zips = [].slice.call(document.querySelectorAll('.zip span')), stills = [].slice.call(document.querySelectorAll('.still'));
  var titles = [].slice.call(document.querySelectorAll('.spread .title')), bits = [], lit = -2;
  function extras(vh, y) {
    var max = document.documentElement.scrollHeight - vh;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    var now = -1;
    for (var i = 0; i < secs.length; i++) if (secs[i] && secs[i].getBoundingClientRect().top < vh * 0.45) now = i;
    if (now !== lit) {
      lit = now; links.forEach(function (a, k) { a.classList.toggle('on', k === now); });
      if (now >= 0) { var row = links[now].parentNode; if (row.scrollWidth > row.clientWidth) row.scrollLeft = links[now].offsetLeft - row.offsetLeft - 30; }
    }
    zips.forEach(function (z) {
      var r = z.parentNode.getBoundingClientRect(); if (r.bottom < -20 || r.top > vh + 20) return;
      var dir = +z.parentNode.dataset.dir || 1, half = z.offsetWidth / 2 || 1, x = (y * 0.45) % half;
      z.style.transform = 'translateX(' + (dir > 0 ? -x : x - half).toFixed(1) + 'px)';
    });
    stills.forEach(function (s) {
      var r = s.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
      var k = (r.top + r.height / 2 - vh / 2) / vh, imgs = s.children;
      for (var j = 0; j < imgs.length; j++) imgs[j].style.translate = '0 ' + (-k * 7).toFixed(2) + '%';
    });
    titles.forEach(function (t) {
      var r = t.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
      t.style.translate = ((r.top - vh * 0.4) / vh * (t.closest('.flip-side') ? -46 : 46)).toFixed(1) + 'px 0';
    });
    for (var b = 0; b < bits.length; b++) {
      var o = bits[b], span = vh + 80, yy = ((o.y * span - y * o.depth) % span + span) % span - 40;
      o.el.style.translate = '0 ' + yy.toFixed(1) + 'px';
    }
  }
  /* the bits: little pixel things, drawn here (7x7 maps), each flying across on its own lane and depth */
  var MAPS = {
    star:  ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '#.....#'],
    heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...', '.......'],
    coin:  ['..###..', '.#####.', '##.#.##', '##.#.##', '##.#.##', '.#####.', '..###..'],
    moon:  ['..###..', '.###...', '###....', '###....', '###....', '.###...', '..###..'],
    bolt:  ['...##..', '..##...', '.####..', '...##..', '..##...', '.##....', '.......'],
    cart:  ['#####..', '#....#.', '#.##.##', '#.##..#', '#.##..#', '#.....#', '#######'],
    play:  ['##.....', '####...', '######.', '#######', '######.', '####...', '##.....']
  };
  var INK = ['#d8281e', '#2447b5', '#e0a400', '#17120f', '#7b3fe4', '#ff2a6d', '#1c9c6b'];
  if (!calm) {
    var layer = document.createElement('div'); layer.className = 'bits'; layer.setAttribute('aria-hidden', 'true');
    var names = Object.keys(MAPS), COUNT = innerWidth < 700 ? 9 : 16;
    for (var n = 0; n < COUNT; n++) {
      var map = MAPS[names[n % names.length]], col = INK[(n * 3) % INK.length], rects = '';
      for (var py = 0; py < 7; py++) for (var px = 0; px < 7; px++) if (map[py].charAt(px) === '#') rects += '<rect x="' + px + '" y="' + py + '" width="1" height="1"/>';
      var d = document.createElement('div'), far = n % 3;                 /* 0 near (big, fast) … 2 far (small, slow) */
      d.className = 'bit' + (n % 2 ? ' rev' : '');
      d.style.cssText = '--s:' + (26 - far * 7) + 'px;--t:' + (13 + far * 9 + (n % 4) * 2) + 's;--dl:-' + (n * 2.7).toFixed(1) + 's;opacity:' + (0.95 - far * 0.2);
      d.innerHTML = '<svg viewBox="0 0 7 7" shape-rendering="crispEdges" fill="' + col + '" style="animation-delay:-' + (n * 0.13).toFixed(2) + 's">' + rects + '</svg>';
      layer.appendChild(d);
      bits.push({ el: d, y: ((n * 0.618) % 1), depth: 0.5 - far * 0.18 });
    }
    document.body.appendChild(layer);
  }
  /* things arrive as they are scrolled to (once), a beat apart inside the same group */
  var arrive = [].slice.call(document.querySelectorAll('.front .shout, .front .deck, .front .cols, .contents, .chan, .jukebox, .banner h2, .wing span, .spread .folio, .spread .title, .spread .deck, .spread .cols, .specs, .panel'));
  if (!calm && 'IntersectionObserver' in window) {
    arrive.forEach(function (el) {
      var sibs = el.parentNode ? [].slice.call(el.parentNode.children) : [];
      el.style.setProperty('--rd', Math.min(4, Math.max(0, sibs.indexOf(el))) * 80 + 'ms');
      el.classList.add('rv');
    });
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    arrive.forEach(function (el) { seen.observe(el); });
  }
  if (!calm) turn();

  /* ── 3. stills move only while they are looked at ── */
  var panels = [].slice.call(document.querySelectorAll('.panel'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('live', e.isIntersecting); });
    }, { rootMargin: '80px' });
    panels.forEach(function (p) { io.observe(p); });
  } else panels.forEach(function (p) { p.classList.add('live'); });

  /* ── 4. the music: the arcade's own song starts by itself, exactly as it does at play.odaroo.co
     (Odaroo, 2026-11-24: "the same song… start automatically in odaroo.co as well"). A browser will not
     play sound before the visitor's first touch, so it is asked for as the page opens (allowed where the
     site has been visited before) and again on the first tap or key. It loops, fades in, rests while the
     tab is hidden, and OFF is remembered (the speaker in the corner, or pausing it on the jukebox). ── */
  var deck = document.getElementById('deck'), tracks = [].slice.call(document.querySelectorAll('.track'));
  var snd = document.getElementById('snd'), MUTE = 'odaroo.paper.mute', VOL = 0.5, muted = false, on = tracks[0] || null, fade = 0;
  try { muted = localStorage.getItem(MUTE) === '1'; } catch (e) {}
  function remember() { try { localStorage.setItem(MUTE, muted ? '1' : '0'); } catch (e) {} }
  function show() {
    tracks.forEach(function (t) { t.setAttribute('aria-pressed', t === on && !deck.paused ? 'true' : 'false'); });
    if (snd) { snd.classList.toggle('off', muted || deck.paused); snd.setAttribute('aria-label', muted || deck.paused ? 'Music on' : 'Music off'); }
  }
  function fadeTo(v, then) {
    clearInterval(fade);
    fade = setInterval(function () {
      var d = v - deck.volume, st = 0.04;
      if (Math.abs(d) <= st) { deck.volume = v; clearInterval(fade); if (then) then(); }
      else deck.volume = Math.max(0, Math.min(1, deck.volume + (d > 0 ? st : -st)));
    }, 60);
  }
  function musicOn() {
    if (!deck || !on || muted || document.hidden || !deck.paused) return;
    if (deck.getAttribute('src') !== on.dataset.src) deck.src = on.dataset.src;
    deck.volume = 0;
    var p = deck.play();
    if (p && p.then) p.then(function () { fadeTo(VOL); }).catch(function () {});
  }
  function musicOff() { fadeTo(0, function () { deck.pause(); }); }
  if (deck) {
    deck.loop = true;
    ['play', 'pause', 'ended'].forEach(function (ev) { deck.addEventListener(ev, show); });
    tracks.forEach(function (t) {
      t.addEventListener('click', function () {
        if (on === t && !deck.paused) { muted = true; remember(); musicOff(); return; }
        if (on !== t) { deck.pause(); on = t; }
        muted = false; remember(); musicOn();
      });
    });
    if (snd) snd.addEventListener('click', function () { muted = !(muted || deck.paused); remember(); if (muted) musicOff(); else musicOn(); show(); });
    show(); musicOn();                                             /* with the page, from the top */
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) {
      addEventListener(ev, function (e) { if (e.target && e.target.closest && e.target.closest('#snd, .track')) return; musicOn(); }, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { if (!deck.paused) deck.pause(); } else musicOn(); });
    addEventListener('pagehide', function () { deck.pause(); });
  }
})();
