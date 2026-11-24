/* ODAROO & CO. — THE PLAYER'S PAPER (odaroo.co)
   1. builds every 3D cartridge from its data attributes (one box, six faces);
   2. turns the cartridges with the scroll: a spread's cartridge makes a full turn while its story is read;
   3. runs the stills only while they are on screen;
   4. the jukebox: one <audio>, two buttons. */
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
      el.style.transform = 'rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg)';
    }
  }
  function ask() { if (!queued) { queued = true; requestAnimationFrame(turn); } }
  if (calm) carts.forEach(function (el) { el.style.transform = 'rotateX(-8deg) rotateY(' + el._base + 'deg)'; });
  else { addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); turn(); }

  /* ── 3. stills move only while they are looked at ── */
  var panels = [].slice.call(document.querySelectorAll('.panel'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('live', e.isIntersecting); });
    }, { rootMargin: '80px' });
    panels.forEach(function (p) { io.observe(p); });
  } else panels.forEach(function (p) { p.classList.add('live'); });

  /* ── 4. the jukebox ── */
  var deck = document.getElementById('deck'), tracks = [].slice.call(document.querySelectorAll('.track')), on = null;
  function show() { tracks.forEach(function (t) { t.setAttribute('aria-pressed', t === on && !deck.paused ? 'true' : 'false'); }); }
  tracks.forEach(function (t) {
    t.addEventListener('click', function () {
      if (on === t && !deck.paused) { deck.pause(); show(); return; }
      if (on !== t) { deck.src = t.dataset.src; on = t; }
      deck.volume = 0.7;
      var p = deck.play(); if (p && p.catch) p.catch(function () {});
    });
  });
  if (deck) ['play', 'pause', 'ended'].forEach(function (ev) { deck.addEventListener(ev, show); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && deck && !deck.paused) deck.pause(); });
})();
