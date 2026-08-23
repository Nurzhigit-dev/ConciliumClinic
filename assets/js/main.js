/* ============================================================
   Consilium International Clinic — main.js
   1. Mosaic globe  — the logo's dissolving square sphere, alive
   2. Live status   — clinic-local time (UTC+5), 08:00–20:00 daily
   3. Header / nav  — sticky state, mobile panel
   4. Scroll reveal
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. MOSAIC GLOBE
     A lat/lon grid of squares. Squares drifting past the right
     limb detach and scatter — the dissolve from the clinic mark.
  --------------------------------------------------------- */
  (function mosaic() {
    var cv = document.getElementById('mosaic');
    if (!cv || !cv.getContext) return;

    var ctx = cv.getContext('2d');
    var pts = [];
    var W = 0, H = 0, cx = 0, cy = 0, R = 0, dpr = 1;
    var t = 0, raf = null, visible = true;

    var LAT = 30;
    for (var i = 0; i < LAT; i++) {
      var lat = -Math.PI / 2 + Math.PI * (i + 0.5) / LAT;
      var ring = Math.cos(lat);
      var n = Math.max(3, Math.round(56 * ring));
      for (var j = 0; j < n; j++) {
        pts.push({
          lat: lat,
          lon: 2 * Math.PI * j / n,
          seed: Math.random(),
          seed2: Math.random()
        });
      }
    }

    function size() {
      var host = cv.parentElement;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth;
      H = host.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (W < 760) {
        cx = W * 0.72; cy = H * 0.30; R = Math.min(W, H) * 0.46;
      } else {
        cx = W * 0.76; cy = H * 0.46; R = Math.min(W * 0.62, H * 0.92) * 0.46;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var unit = Math.max(2.4, R * 0.031);

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var lon = p.lon + t;
        var cl = Math.cos(p.lat);
        var x = cl * Math.sin(lon);
        var y = Math.sin(p.lat);
        var z = cl * Math.cos(lon);

        if (z < -0.25) continue;

        /* how far past the right limb — drives the dissolve */
        var edge = (x - 0.12) / 0.88;
        var diss = edge > 0 ? Math.min(1, edge) : 0;

        /* thinning: the further into the dissolve, the more squares drop out */
        if (diss > 0 && p.seed < diss * diss * 1.15) continue;

        var sx = cx + x * R;
        var sy = cy - y * R;

        if (diss > 0) {
          var spread = diss * diss * R * 0.55;
          sx += (p.seed2 - 0.25) * spread * 1.5;
          sy += (p.seed - 0.5) * spread * 1.7;
        }

        var depth = (z + 0.25) / 1.25;
        var s = unit * (0.5 + 0.55 * depth) * (1 - diss * 0.25);
        var a = (0.16 + 0.72 * depth) * (1 - diss * 0.42);
        if (a <= 0.015) continue;

        /* navy body, teal at the dissolving edge — as in the mark */
        if (diss > 0.28 || (p.seed2 > 0.86 && diss > 0.05)) {
          ctx.fillStyle = 'rgba(47,196,178,' + a.toFixed(3) + ')';
        } else if (p.seed2 > 0.55) {
          ctx.fillStyle = 'rgba(102,164,214,' + (a * 0.85).toFixed(3) + ')';
        } else {
          ctx.fillStyle = 'rgba(158,201,232,' + (a * 0.62).toFixed(3) + ')';
        }

        ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      }
    }

    function tick() {
      t += 0.0013;
      draw();
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (reduce || raf !== null || !visible) return;
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }

    size();
    draw();
    start();

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { size(); draw(); }, 150);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stop(); } else { start(); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) { start(); } else { stop(); }
      }, { threshold: 0 }).observe(cv);
    }
  })();

  /* ---------------------------------------------------------
     2. LIVE STATUS — clinic-local time, Kazakhstan is UTC+5
  --------------------------------------------------------- */
  (function hours() {
    var box = document.getElementById('status');
    var msg = document.getElementById('clockMsg');
    var now = document.getElementById('clockNow');
    if (!box && !msg) return;

    var OPEN = 8, SHUT = 20, TZ = 5;

    function plural(n, one, few, many) {
      var a = n % 10, b = n % 100;
      if (a === 1 && b !== 11) return one;
      if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return few;
      return many;
    }

    function span(mins) {
      var h = Math.floor(mins / 60), m = mins % 60;
      var out = [];
      if (h > 0) out.push(h + ' ' + plural(h, 'час', 'часа', 'часов'));
      if (m > 0) out.push(m + ' ' + plural(m, 'минуту', 'минуты', 'минут'));
      return out.length ? out.join(' ') : 'меньше минуты';
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function update() {
      var d = new Date();
      var clinic = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + TZ * 3600000);
      var h = clinic.getHours(), m = clinic.getMinutes();
      var mins = h * 60 + m;
      var isOpen = mins >= OPEN * 60 && mins < SHUT * 60;
      var stamp = pad(h) + ':' + pad(m);

      if (box) {
        box.classList.toggle('is-open', isOpen);
        box.classList.toggle('is-shut', !isOpen);
        box.querySelector('.status__txt').textContent = isOpen ? 'Открыто' : 'Закрыто';
        var more = box.querySelector('.status__more');
        if (more) { more.textContent = isOpen ? ' до 20:00' : ' · с 08:00'; }
      }

      if (now) { now.style.left = (mins / 1440 * 100).toFixed(2) + '%'; }

      if (msg) {
        if (isOpen) {
          msg.textContent = 'Сейчас в клинике ' + stamp +
            '. Приём идёт — до закрытия ' + span(SHUT * 60 - mins) + '.';
        } else {
          var wait = mins < OPEN * 60 ? OPEN * 60 - mins : (24 * 60 - mins) + OPEN * 60;
          msg.textContent = 'Сейчас в клинике ' + stamp +
            '. Закрыто — откроется через ' + span(wait) + '.';
        }
      }
    }

    update();
    setInterval(update, 30000);
  })();

  /* ---------------------------------------------------------
     3. HEADER + MOBILE NAV
  --------------------------------------------------------- */
  (function chrome() {
    var hdr = document.getElementById('hdr');
    var nav = document.getElementById('nav');
    var burger = document.getElementById('burger');

    if (hdr) {
      var onScroll = function () {
        hdr.classList.toggle('is-stuck', window.scrollY > 8);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (!nav || !burger) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) { hdr.classList.add('is-stuck'); }
    }

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { setOpen(false); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 980 && nav.classList.contains('is-open')) { setOpen(false); }
    }, { passive: true });
  })();

  /* ---------------------------------------------------------
     4. SCROLL REVEAL
  --------------------------------------------------------- */
  (function reveal() {
    var sel = ['.sechead', '.etym', '.shot', '.split__body', '.card',
               '.band', '.proc', '.doc', '.visit__col', '.chan', '.note'];

    sel.forEach(function (s) {
      var nodes = document.querySelectorAll(s);
      var lastParent = null, idx = 0;
      Array.prototype.forEach.call(nodes, function (el) {
        if (el.parentElement !== lastParent) { lastParent = el.parentElement; idx = 0; }
        el.classList.add('reveal');
        if (idx > 0) { el.style.setProperty('--d', (idx * 90) + 'ms'); }
        idx++;
      });
    });

    var all = document.querySelectorAll('.reveal');
    function show(el) { el.classList.add('is-in'); }
    function showAll() { Array.prototype.forEach.call(all, show); }

    if (reduce || !('IntersectionObserver' in window)) { showAll(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    Array.prototype.forEach.call(all, function (el) { io.observe(el); });

    /* Anything already on screen reveals right away, without waiting for a frame. */
    Array.prototype.forEach.call(all, function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) { show(el); io.unobserve(el); }
    });

    /* Failsafe: never leave content stuck at opacity 0 if the observer is starved. */
    setTimeout(showAll, 4000);
  })();

  /* ---------------------------------------------------------
     5. Footer year
  --------------------------------------------------------- */
  var y = document.getElementById('year');
  if (y) { y.textContent = new Date().getFullYear(); }

})();
