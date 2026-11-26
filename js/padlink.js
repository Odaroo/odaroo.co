/* ============================================================================
   PADLINK — every controller, in every Odaroo & Co. game (Odaroo, 2026-10-29).

   "make sure that every game… works with the Steam controllers… regardless of any type of controller
   that is connected… the B button should correspond to the B button on the screen… whenever you press
   these, you get to see your button being pressed on the screen with a gamepad HUD."

   ⚠ ONE FILE, COPIED UNCHANGED into each game (like app-shell.js): play/js/ (the arcade ring),
   js/ (Inkville), lunatide/js/, play/chromeanimals/js/, play/vrlabs/js/, play/ringfall/js/.
   Edit play/js/padlink.js, then copy it to the rest. Configure it BEFORE it loads with
   window.PADLINK_CFG = { hud, keys, dpadToStick } — every field optional.

   THREE THINGS IT DOES:
   1. ANY CONTROLLER READS AS A STANDARD ONE. navigator.getGamepads() is wrapped: every pad comes back
      shaped like the W3C "standard" layout (A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 SELECT=8 START=9
      L3=10 R3=11, d-pad 12-15, sticks on axes 0-3), whatever the browser made of it. A pad the browser
      could not map ('' mapping — a Steam Input virtual pad on Linux, an odd Bluetooth pad) is translated:
      its d-pad may be a HAT — axes 6/7 (Linux) or a single POV axis 9 (Windows DirectInput) — and its
      Back/Start sit at 6/7. So the games' own controller code works unchanged. VR controllers
      ('xr-standard') are passed through untouched and sorted last, so "the first pad" is a hand-held one.
   2. A PRESS IS AN EVENT. PADLINK.on('press'|'release', fn(k)) with k one of
      up down left right A B X Y L R START SELECT — for pages that had no controller code at all.
      cfg.keys turns presses into keyboard events too (d-pad → arrows, A → Enter, B → Escape…), for a
      page that already speaks keyboard. cfg.keys may be a function, asked on every press.
   3. A PAD HUD. cfg.hud draws a small controller at the foot of the screen that lights each button as
      it is pressed — from a controller, or from the keys Steam Input sends in its DESKTOP layout
      (A = Enter, B = Escape, Y = Space, d-pad = arrows), because a browser on a Steam Frame / Deck often
      sees the controller as a keyboard and never as a gamepad. It fades after a few quiet seconds.
   ⚠ The Steam button itself belongs to Steam: no web page ever receives it.
   ============================================================================ */
(function () {
  'use strict';
  if (window.PADLINK) return;
  const CFG = window.PADLINK_CFG || {};
  const nav = navigator;
  const nGP = nav.getGamepads ? nav.getGamepads.bind(nav) : () => [];
  const KEYS = ['up', 'down', 'left', 'right', 'A', 'B', 'X', 'Y', 'L', 'R', 'START', 'SELECT'];

  /* ── 1. the translation ── */
  const btn = (b) => (b == null ? { pressed: false, touched: false, value: 0 } : typeof b === 'object' ? { pressed: !!b.pressed, touched: !!(b.touched || b.pressed), value: +b.value || (b.pressed ? 1 : 0) } : { pressed: b > 0.5, touched: b > 0.5, value: +b });
  const on = (b) => b.pressed || b.value > 0.5;
  function hat(p) {
    const a = p.axes || [];
    // a POV hat on one axis (DirectInput): -1 = up, then clockwise in sevenths; at rest it reads > 1
    if (a.length >= 10 && Math.abs(a[9]) <= 1.01) {
      const i = Math.round((a[9] + 1) * 3.5) % 8;
      return { up: i === 7 || i === 0 || i === 1, right: i >= 1 && i <= 3, down: i >= 3 && i <= 5, left: i >= 5 && i <= 7 };
    }
    // a hat as two axes (Linux evdev, ABS_HAT0X/Y): exactly -1, 0 or 1
    if (a.length >= 8) {
      const x = a[6], y = a[7], ex = (v) => v === -1 || v === 0 || v === 1;
      if (ex(x) && ex(y)) return { up: y < 0, down: y > 0, left: x < 0, right: x > 0 };
    }
    return null;
  }
  function norm(p) {
    if (!p || !p.connected) return null;
    if (p.mapping === 'xr-standard') return p;           // a VR hand: the VR code reads it as it is
    const B = p.buttons || [], A = p.axes || [];
    const out = Array.from({ length: 17 }, (_, i) => btn(null));
    let axes;
    if (p.mapping === 'standard') {
      for (let i = 0; i < Math.min(17, B.length); i++) out[i] = btn(B[i]);
      axes = [A[0] || 0, A[1] || 0, A[2] || 0, A[3] || 0];
    } else {
      // the common raw layout (Linux xpad / Steam virtual pad / most Bluetooth pads): A B X Y LB RB, then
      // Back Start (Guide) L3 R3 when there are few buttons; a pad with 16+ buttons keeps the standard order
      const few = B.length < 16;
      const map = few ? { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 8, 7: 9, 9: 10, 10: 11 } : null;
      for (let i = 0; i < B.length && i < 17; i++) { const to = map ? map[i] : i; if (to != null) out[to] = btn(B[i]); }
      // the triggers on such a pad are axes 2 and 5, resting at -1
      if (few && A.length >= 6) { out[6] = btn(Math.max(0, (A[2] + 1) / 2)); out[7] = btn(Math.max(0, (A[5] + 1) / 2)); }
      axes = few && A.length >= 5 ? [A[0] || 0, A[1] || 0, A[3] || 0, A[4] || 0] : [A[0] || 0, A[1] || 0, A[2] || 0, A[3] || 0];
      const h = hat(p);
      if (h) { if (h.up) out[12] = btn(1); if (h.down) out[13] = btn(1); if (h.left) out[14] = btn(1); if (h.right) out[15] = btn(1); }
    }
    // a game that only steers with the stick moves with the d-pad too
    if (CFG.dpadToStick && Math.abs(axes[0]) < 0.3 && Math.abs(axes[1]) < 0.3) {
      if (on(out[14])) axes[0] = -1; else if (on(out[15])) axes[0] = 1;
      if (on(out[12])) axes[1] = -1; else if (on(out[13])) axes[1] = 1;
    }
    return { id: p.id, index: p.index, connected: true, mapping: 'standard', timestamp: p.timestamp, axes, buttons: out,
      vibrationActuator: p.vibrationActuator || null, hapticActuators: p.hapticActuators || [], raw: p };
  }
  function split() {
    let list = [];
    try { list = Array.from(nGP() || []); } catch (e) { return []; }
    const out = [];
    for (const p of list) { const n = norm(p); if (n) out.push(n); }
    out.sort((a, b) => (a.mapping === 'xr-standard') - (b.mapping === 'xr-standard'));
    return out;
  }
  function pads() {
    const out = split();
    // TWO HALVES ARE ONE CONTROLLER (2026-10-29). A Steam Frame's left and right controllers (and a pair of
    // Joy-Cons) can reach the browser as TWO pads, each with half the buttons — and most games read only the
    // first pad, so one hand did nothing. Every hand-held pad is folded into ONE standard pad: a button is
    // down if it is down on any of them, and each stick axis takes whichever pad pushes it further.
    const hand = out.filter((p) => p.mapping !== 'xr-standard');
    if (hand.length < 2) return out;
    const one = { id: hand.map((p) => p.id).join(' + '), index: 0, connected: true, mapping: 'standard',
      timestamp: Math.max(...hand.map((p) => p.timestamp || 0)), axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, (_, i) => { let v = 0, t = false; for (const p of hand) { const b = p.buttons[i]; if (b) { v = Math.max(v, b.value); t = t || b.touched; } } return { pressed: v > 0.5, touched: t, value: v }; }),
      vibrationActuator: (hand.find((p) => p.vibrationActuator) || {}).vibrationActuator || null, hapticActuators: [], parts: hand };
    for (let i = 0; i < 4; i++) for (const p of hand) if (Math.abs(p.axes[i] || 0) > Math.abs(one.axes[i])) one.axes[i] = p.axes[i];
    return [one].concat(out.filter((p) => p.mapping === 'xr-standard'));
  }
  try { nav.getGamepads = function () { return pads(); }; } catch (e) { /* read-only here: the games read pads as before */ }

  /* ── 2. presses as events ── */
  const subs = { press: [], release: [] };
  const P = (window.PADLINK = {
    pads, split, norm, hat,
    held: {},
    on(t, fn) { (subs[t] || (subs[t] = [])).push(fn); },
    emit(t, k) { for (const f of subs[t] || []) { try { f(k); } catch (e) { console.error(e); } } },
  });
  function stateOf(p) {
    const b = p.buttons, a = p.axes, s = {};
    const lx = a[0] || 0, ly = a[1] || 0, dead = 0.55;
    s.up = on(b[12]) || ly < -dead; s.down = on(b[13]) || ly > dead; s.left = on(b[14]) || lx < -dead; s.right = on(b[15]) || lx > dead;
    s.A = on(b[0]); s.B = on(b[1]); s.X = on(b[2]); s.Y = on(b[3]); s.L = on(b[4]); s.R = on(b[5]); s.SELECT = on(b[8]); s.START = on(b[9]);
    return s;
  }
  const KEYOF = { up: ['ArrowUp', 'ArrowUp'], down: ['ArrowDown', 'ArrowDown'], left: ['ArrowLeft', 'ArrowLeft'], right: ['ArrowRight', 'ArrowRight'],
    A: ['Enter', 'Enter'], B: ['Escape', 'Escape'], START: ['Enter', 'Enter'], SELECT: ['Tab', 'Tab'], Y: [' ', 'Space'] };
  function keyOut(type, k) {
    const want = typeof CFG.keys === 'function' ? CFG.keys(k) : CFG.keys;
    if (!want || !KEYOF[k]) return;
    const [key, code] = KEYOF[k];
    try { (document.activeElement || document.body || document).dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true })); } catch (e) {}
  }
  let raf = 0, last = 0;
  function tick() {
    raf = 0;
    const list = pads().filter((p) => p.mapping !== 'xr-standard');
    const now = {};
    for (const p of list) { const s = stateOf(p); for (const k of KEYS) if (s[k]) now[k] = true; }
    for (const k of KEYS) {
      if (now[k] && !P.held[k]) { P.held[k] = true; hudLight(k, true); P.emit('press', k); keyOut('keydown', k); }
      else if (!now[k] && P.held[k]) { P.held[k] = false; hudLight(k, false); P.emit('release', k); keyOut('keyup', k); }
    }
    if (list.length) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }
  addEventListener('gamepadconnected', wake);
  // a pad paired before the page loaded fires no event until a button is pressed — look every second, always
  setInterval(() => { try { if (!raf && Array.from(nGP() || []).some((p) => p && p.connected && p.mapping !== 'xr-standard')) wake(); } catch (e) {} }, 1000);
  addEventListener('blur', () => { for (const k of KEYS) if (P.held[k]) { P.held[k] = false; hudLight(k, false); P.emit('release', k); } });

  /* ── 3. the pad HUD ── */
  let hud = null, fadeT = 0;
  const KEYHUD = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'A', Escape: 'B', Backspace: 'B', ' ': 'Y', Tab: 'SELECT' };
  function hudBuild() {
    if (hud || !CFG.hud || !document.body) return hud;
    const st = document.createElement('style');
    st.textContent = '#padlinkHud{position:fixed;left:50%;bottom:max(10px,env(safe-area-inset-bottom));z-index:2147483000;pointer-events:none;' +
      'translate:-50% 0;opacity:0;transition:opacity .35s;width:min(220px,46vw)}#padlinkHud.on{opacity:.92}#padlinkHud svg{display:block;width:100%;height:auto}' +
      '#padlinkHud .k{fill:#1b1510;stroke:#f7eacc;stroke-width:3}#padlinkHud .t{fill:#f7eacc;font:700 15px ui-monospace,monospace;text-anchor:middle;dominant-baseline:central}' +
      '#padlinkHud .lit .k{fill:#f0b429}#padlinkHud .lit .t{fill:#1b1510}#padlinkHud .ar{fill:#f7eacc}#padlinkHud .lit .ar{fill:#1b1510}' +
      '@media (prefers-reduced-motion:reduce){#padlinkHud{transition:none}}';
    document.head.appendChild(st);
    hud = document.createElement('div'); hud.id = 'padlinkHud'; hud.setAttribute('aria-hidden', 'true');
    const g = (k, inner) => '<g data-k="' + k + '">' + inner + '</g>';
    const circ = (k, x, y, r, t) => g(k, '<circle class="k" cx="' + x + '" cy="' + y + '" r="' + r + '"/><text class="t" x="' + x + '" y="' + (y + 1) + '">' + t + '</text>');
    const pill = (k, x, y, t) => g(k, '<rect class="k" x="' + (x - 22) + '" y="' + (y - 9) + '" width="44" height="18" rx="9"/><text class="t" style="font-size:9px" x="' + x + '" y="' + (y + 1) + '">' + t + '</text>');
    const arm = (k, d, tri) => g(k, '<path class="k" d="' + d + '"/><path class="ar" d="' + tri + '"/>');
    hud.innerHTML = '<svg viewBox="0 0 240 104">' +
      '<rect x="2" y="2" width="236" height="100" rx="40" fill="#1b1510cc"/>' +
      // one cross, drawn as four arms so each can light on its own
      arm('up', 'M38 14h24v26h-24z', 'M50 20l6 8h-12z') + arm('down', 'M38 64h24v26h-24z', 'M50 84l6 -8h-12z') +
      arm('left', 'M12 40h26v24h-26z', 'M18 52l8 -6v12z') + arm('right', 'M62 40h26v24h-26z', 'M82 52l-8 -6v12z') +
      '<rect x="38" y="40" width="24" height="24" fill="#1b1510"/>' +
      pill('SELECT', 104, 82, 'SELECT') + pill('START', 136, 82, 'START') +
      circ('Y', 194, 22, 12, 'Y') + circ('X', 172, 46, 12, 'X') + circ('B', 216, 46, 12, 'B') + circ('A', 194, 70, 12, 'A') +
      '</svg>';
    document.body.appendChild(hud);
    return hud;
  }
  function hudLight(k, lit) {
    if (!CFG.hud) return;
    const h = hudBuild(); if (!h) return;
    const g = h.querySelector('[data-k="' + k + '"]'); if (g) g.classList.toggle('lit', lit);
    h.classList.add('on'); clearTimeout(fadeT);
    fadeT = setTimeout(() => { if (!h.querySelector('.lit')) h.classList.remove('on'); else hudLight(k, lit); }, 3500);
  }
  P.light = hudLight;
  // the keys a Steam controller sends in its desktop layout light the same buttons (trusted keys only:
  // a page's own synthetic keys, cfg.keys included, are already lit by the pad that made them)
  addEventListener('keydown', (e) => { if (e.isTrusted && KEYHUD[e.key] && !e.repeat) hudLight(KEYHUD[e.key], true); }, true);
  addEventListener('keyup', (e) => { if (e.isTrusted && KEYHUD[e.key]) hudLight(KEYHUD[e.key], false); }, true);
})();
