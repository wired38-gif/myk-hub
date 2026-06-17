/* ─────────────────────────────────────────
   PATE MUSIC — main.js
   Nav scroll state · Mobile menu · Strip drag scroll
   ───────────────────────────────────────── */

(function () {
  'use strict';

  // ── Entry gate — immersive landing (lostkidsforever-style) ──
  const gate = document.getElementById('entry-gate');
  const enterBtn = document.getElementById('entry-enter');
  const GATE_KEY = 'pate-entered';

  function dismissGate() {
    if (!gate) return;
    const gateVideo = gate.querySelector('.entry-gate__video');
    if (gateVideo) {
      gateVideo.pause();
      gateVideo.removeAttribute('src');
      gateVideo.load();
    }
    gate.classList.add('is-dismissed');
    gate.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('entry-locked');
    try { sessionStorage.setItem(GATE_KEY, '1'); } catch (_) {}
    setTimeout(() => gate.remove(), 950);
  }

  if (gate && !sessionStorage.getItem(GATE_KEY)) {
    document.body.classList.add('entry-locked');
    enterBtn && enterBtn.addEventListener('click', dismissGate);

    const gateVideo = gate.querySelector('.entry-gate__video');
    const gateBg = gate.querySelector('.entry-gate__bg');
    if (gateVideo && gateBg) {
      gateVideo.addEventListener('error', () => gateBg.classList.add('is-video-fallback'));
      const playAttempt = gateVideo.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(() => gateBg.classList.add('is-video-fallback'));
      }
    }
  } else if (gate) {
    gate.remove();
  }

  // ── Global landing motion (cloudy drift video + neon fallback) ──
  function initLandingMotion() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      document.body.classList.add('motion-reduced');
      return;
    }
    const globalVideo = document.querySelector('.global-cloudy-video');
    if (globalVideo) {
      globalVideo.addEventListener('error', () => {
        document.body.classList.add('motion-video-fallback');
      });
      const globalPlay = globalVideo.play();
      if (globalPlay && typeof globalPlay.catch === 'function') {
        globalPlay.catch(() => document.body.classList.add('motion-video-fallback'));
      }
    }
    document.querySelectorAll('.hero-motion-video, .inspire-video').forEach((vid) => {
      const attempt = vid.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {});
      }
    });
  }
  initLandingMotion();

  // ── Scrolled nav state ──────────────────
  const nav = document.getElementById('site-nav');
  function updateNav() {
    if (!nav) return;
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // ── Mobile menu ─────────────────────────
  const ham = document.querySelector('.hamburger');
  const mob = document.getElementById('mobile-menu');
  if (ham && mob) {
    ham.addEventListener('click', () => {
      const open = ham.classList.toggle('open');
      ham.setAttribute('aria-expanded', open);
      mob.classList.toggle('open', open);
      mob.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mob.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        ham.classList.remove('open');
        ham.setAttribute('aria-expanded', false);
        mob.classList.remove('open');
        mob.setAttribute('aria-hidden', true);
        document.body.style.overflow = '';
      });
    });
  }

  // ── Photo strip — drag to scroll ────────
  const strip = document.querySelector('.strip-track');
  if (strip) {
    let isDown = false, startX = 0, scrollLeft = 0;
    strip.addEventListener('mousedown', e => {
      isDown = true;
      strip.style.cursor = 'grabbing';
      startX = e.pageX - strip.offsetLeft;
      scrollLeft = strip.scrollLeft;
    });
    strip.addEventListener('mouseleave', () => { isDown = false; strip.style.cursor = 'grab'; });
    strip.addEventListener('mouseup', () => { isDown = false; strip.style.cursor = 'grab'; });
    strip.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - strip.offsetLeft;
      const walk = (x - startX) * 1.4;
      strip.scrollLeft = scrollLeft - walk;
    });
    // Touch support
    let touchStart = 0, touchScrollLeft = 0;
    strip.addEventListener('touchstart', e => {
      touchStart = e.touches[0].pageX;
      touchScrollLeft = strip.scrollLeft;
    }, { passive: true });
    strip.addEventListener('touchmove', e => {
      const x = e.touches[0].pageX;
      const walk = (x - touchStart) * 1.2;
      strip.scrollLeft = touchScrollLeft - walk;
    }, { passive: true });
  }

  // ── Smooth anchor scroll ─────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });

})();

// ── Scroll reveal ────────────────────────
document.querySelectorAll(
  '.panel-title, .panel-eyebrow, .panel-sub, .panel-actions, .about-title, .about-copy, .about-tags, .connect-title, .gp-label, .gp-caption, .neon-panel-title, .neon-panel-sub'
).forEach((el, i) => {
  el.classList.add('reveal');
  if (i % 3 === 1) el.classList.add('reveal-delay-1');
  if (i % 3 === 2) el.classList.add('reveal-delay-2');
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Music Player ─────────────────────────
// PATE track list — YouTube IDs paired with Spotify links + titles
// NOTE: Browsers block audio autoplay until first user interaction.
// We trigger play on the first click/touch/keydown anywhere on the page.
const PATE_TRACKS = [
  {
    ytId:    'PmNR6i_MANs',
    title:   'They Doubled I Doubled',
    spotify: 'https://open.spotify.com/playlist/0Xb4WTtvcyiLJ3UJYkY8EU'
  }
];
let _trackIdx = 0;

(function () {
  const player    = document.getElementById('music-player');
  const toggle    = document.getElementById('mp-toggle');
  const closer    = document.getElementById('mp-close');
  const volSldr   = document.getElementById('mp-volume');
  const titleEl   = document.getElementById('mp-title-text');
  const spotifyEl = document.getElementById('mp-spotify-link');
  const playIco   = toggle && toggle.querySelector('.mp-play');
  const pauseIco  = toggle && toggle.querySelector('.mp-pause');

  if (!player || !toggle) return;

  let playing    = false;
  let ytPlayer   = null;
  let autoPlayed = false;

  function setTrack(idx) {
    const t = PATE_TRACKS[idx];
    if (titleEl)   titleEl.textContent = t.title;
    if (spotifyEl) spotifyEl.href      = t.spotify;
  }
  setTrack(0);

  function showPause() {
    if (playIco)  playIco.style.display  = 'none';
    if (pauseIco) pauseIco.style.display = '';
    toggle.setAttribute('aria-label', 'Pause music');
    playing = true;
  }
  function showPlay() {
    if (playIco)  playIco.style.display  = '';
    if (pauseIco) pauseIco.style.display = 'none';
    toggle.setAttribute('aria-label', 'Play music');
    playing = false;
  }

  // Create a named div for YT.Player to target (more reliable than iframe src approach)
  const ytDiv = document.createElement('div');
  ytDiv.id    = 'yt-audio-frame';
  ytDiv.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(ytDiv);

  // YouTube IFrame API callback — use YT.Player({videoId}) instead of iframe src
  // This avoids origin mismatch issues on hosted domains
  window.onYouTubeIframeAPIReady = function () {
    ytPlayer = new window.YT.Player('yt-audio-frame', {
      width: '1',
      height: '1',
      videoId: PATE_TRACKS[0].ytId,
      playerVars: {
        autoplay:       0,
        controls:       0,
        disablekb:      1,
        enablejsapi:    1,
        loop:           1,
        playlist:       PATE_TRACKS[0].ytId,
        rel:            0,
        modestbranding: 1
      },
      events: {
        onReady: function (e) {
          e.target.setVolume(40);
          if (autoPlayed) {
            e.target.playVideo();
            showPause();
          }
        },
        onStateChange: function (e) {
          if (e.data === window.YT.PlayerState.ENDED) {
            _trackIdx = (_trackIdx + 1) % PATE_TRACKS.length;
            setTrack(_trackIdx);
            ytPlayer.loadVideoById(PATE_TRACKS[_trackIdx].ytId);
          }
        },
        onError: function(e) {
          // If video errors, try reloading after short delay
          setTimeout(function() {
            if (ytPlayer) ytPlayer.loadVideoById(PATE_TRACKS[_trackIdx].ytId);
          }, 2000);
        }
      }
    });
  };

  // Load YouTube IFrame API script once
  if (!document.getElementById('yt-api-script')) {
    const tag = document.createElement('script');
    tag.id    = 'yt-api-script';
    tag.src   = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  // ── Auto-play on first user gesture ──────
  // Browser policy: audio needs a user gesture before it can play.
  // We listen for the first click/touch/keydown anywhere, then auto-start.
  function onFirstGesture() {
    if (autoPlayed) return;
    autoPlayed = true;
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
      showPause();
    }
    // If API not ready yet, the onReady handler will catch it via autoPlayed flag
  }
  document.addEventListener('click',      onFirstGesture, { once: true });
  document.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
  document.addEventListener('keydown',    onFirstGesture, { once: true });

  // ── Manual play/pause toggle ─────────────
  toggle.addEventListener('click', function (e) {
    e.stopPropagation(); // prevent double-firing onFirstGesture
    if (!ytPlayer) return;
    if (!playing) {
      ytPlayer.playVideo();
      showPause();
    } else {
      ytPlayer.pauseVideo();
      showPlay();
    }
  });

  // ── Volume slider ────────────────────────
  volSldr && volSldr.addEventListener('input', function () {
    if (ytPlayer) ytPlayer.setVolume(parseInt(volSldr.value));
  });

  // ── Close / dismiss player ───────────────
  closer && closer.addEventListener('click', function () {
    if (ytPlayer && playing) ytPlayer.pauseVideo();
    player.classList.add('hidden');
  });
}());

// ── Email signup handler ──────────────────
function handleEmailSignup(e) {
  e.preventDefault();
  const form    = document.getElementById('email-signup-form');
  const confirm = document.getElementById('email-confirm');
  if (form)    form.style.display    = 'none';
  if (confirm) confirm.style.display = 'block';
}

/* ────────────────────────────────────────
   VENUE CAROUSEL
   ──────────────────────────────────────── */
(function () {
  const carousel = document.getElementById('venueCarousel');
  if (!carousel) return;

  const slides  = Array.from(carousel.querySelectorAll('.vc-slide'));
  const dotsWrap = document.getElementById('vcDots');
  const locEl   = document.getElementById('vcLocation');
  const nameEl  = document.getElementById('vcName');
  const descEl  = document.getElementById('vcDesc');
  const labelEl = document.getElementById('vcLabel');
  const prevBtn = document.getElementById('vcPrev');
  const nextBtn = document.getElementById('vcNext');

  let current = 0;
  let timer;
  const INTERVAL = 5000;

  // Build dots
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'vc-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Slide ' + (i + 1));
    d.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(d);
  });
  const dots = Array.from(dotsWrap.querySelectorAll('.vc-dot'));

  function updateText(slide) {
    locEl.textContent   = slide.dataset.location || '';
    nameEl.textContent  = slide.dataset.name     || '';
    descEl.textContent  = slide.dataset.desc     || '';
    labelEl.textContent = slide.dataset.label    || '';
  }

  function goTo(idx) {
    slides[current].classList.remove('vc-active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('vc-active');
    dots[current].classList.add('active');
    updateText(slides[current]);
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), INTERVAL);
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Touch swipe support
  let startX = 0;
  carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend',   e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1));
  });

  updateText(slides[0]);
  resetTimer();
}());
