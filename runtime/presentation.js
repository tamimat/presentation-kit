/*! Presentation Kit — MIT License. Copyright (c) 2026 Presentation Kit contributors. See LICENSE. */
(() => {
  const slides = [...document.querySelectorAll('main section')];
  const toolbar = document.createElement('div');
  toolbar.className = 'presentation-toolbar';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', 'Presentation controls');
  const button = document.createElement('button');
  button.id = 'present';
  button.textContent = 'Present';
  button.type = 'button';
  const exit = document.createElement('button');
  exit.id = 'exit-presentation';
  exit.textContent = 'Exit';
  exit.type = 'button';
  exit.setAttribute('aria-keyshortcuts', 'Escape');
  toolbar.append(button, exit);
  document.body.append(toolbar);
  // Keep controls visible using pointer position, even if hover state flickers
  // while the menu opens or the browser changes its fullscreen viewport.
  let controlsFade;
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const rect = toolbar.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom;
    clearTimeout(controlsFade);
    if (inside) toolbar.classList.add('controls-active');
    else controlsFade = setTimeout(() => toolbar.classList.remove('controls-active'), 500);
  }, { passive: true });
  const feedback = document.createElement('div');
  feedback.className = 'tap-feedback';
  feedback.setAttribute('aria-hidden', 'true');
  document.body.append(feedback);
  const progress = document.createElement('div');
  progress.className = 'presentation-progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-label', 'Slide progress');
  progress.setAttribute('aria-valuemin', '1');
  progress.setAttribute('aria-valuemax', String(slides.length));
  const counter = document.createElement('div');
  counter.className = 'slide-counter';
  counter.setAttribute('aria-label', 'Current slide');
  counter.setAttribute('dir', 'ltr');
  const total = document.createElement('div');
  total.className = 'slide-total';
  total.setAttribute('aria-label', 'Total slides');
  total.textContent = String(slides.length);
  const position = document.createElement('div');
  position.className = 'presentation-position';
  position.setAttribute('dir', 'ltr');
  const blob = document.createElement('span');
  blob.className = 'progress-blob';
  blob.setAttribute('aria-hidden', 'true');
  position.append(counter, progress, total, blob);
  document.body.append(position);

  let index = 0;
  let feedbackTimer;
  let historyTimer;
  let viewportFrame;
  let hadFullscreen = false;
  let touchStart;
  const presenting = () => document.body.classList.contains('presenting');
  const interactive = target => target.closest('a,button,input,textarea,select,label,summary,details,.presentation-toolbar,.live-control,.schema-card,.schema-popover,.live-ended');
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;

  let lastProgressIndex = null;
  let progressAnimation;
  function animateProgress(forward) {
    progressAnimation?.cancel();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !blob.animate) return;
    const bounds = position.getBoundingClientRect();
    const center = element => {
      const rect = element.getBoundingClientRect();
      return rect.left - bounds.left + rect.width / 2;
    };
    const start = center(forward ? counter : total);
    const end = center(forward ? total : counter);
    const frame = (fraction, scale, opacity) => ({
      transform: `translate(${start + (end - start) * fraction}px, -50%) translateX(-50%) scale(${scale})`,
      opacity,
    });
    progressAnimation = blob.animate([
      { ...frame(0, '.5, .7', 0), offset: 0 },
      { ...frame(.1, '1.5, .8', 1), offset: .15 },
      { ...frame(.5, '2, .65', 1), offset: .5 },
      { ...frame(.9, '1.5, .8', 1), offset: .85 },
      { ...frame(1, '.5, .7', 0), offset: 1 },
    ], { duration: 650, easing: 'cubic-bezier(.4, 0, .2, 1)' });
  }
  function updateProgress(position) {
    progress.style.setProperty('--progress', (position + 1) / slides.length);
    progress.setAttribute('aria-valuenow', String(position + 1));
    progress.setAttribute('aria-valuetext', `${position + 1} / ${slides.length}`);
    counter.textContent = String(position + 1);
    if (lastProgressIndex !== null && position !== lastProgressIndex && presenting()) {
      animateProgress(position > lastProgressIndex);
    }
    lastProgressIndex = position;
  }
  updateProgress(0);
  document.addEventListener('reading-slidechange', event => {
    if (!presenting()) {
      updateProgress(event.detail);
      document.dispatchEvent(new CustomEvent('presentation-slidechange', { detail: event.detail }));
    }
  });

  function show(next) {
    index = Math.max(0, Math.min(slides.length - 1, next));
    updateProgress(index);
    slides.forEach((slide, i) => slide.classList.toggle('present-active', i === index));
    // Keep fast tapping/held arrow keys below Safari's History API rate limit.
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => {
      const hash = '#' + slides[index].id;
      if (location.hash !== hash) history.replaceState(null, '', hash);
    }, 150);
    document.getElementById('prev').href = '#' + slides[Math.max(0, index - 1)].id;
    document.getElementById('next').href = '#' + slides[Math.min(slides.length - 1, index + 1)].id;
    document.dispatchEvent(new CustomEvent('presentation-slidechange', { detail: index }));
  }
  function visibleSlide() {
    let best = Math.max(0, slides.findIndex(slide => '#' + slide.id === location.hash));
    let area = 0;
    slides.forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const visible = Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top));
      if (visible > area) { area = visible; best = i; }
    });
    return best;
  }
  function fitViewport() {
    if (!presenting()) return;
    const viewport = window.visualViewport;
    const style = document.documentElement.style;
    style.setProperty('--presentation-width', `${viewport?.width || innerWidth}px`);
    style.setProperty('--presentation-height', `${viewport?.height || innerHeight}px`);
    style.setProperty('--presentation-left', `${viewport?.offsetLeft || 0}px`);
    style.setProperty('--presentation-top', `${viewport?.offsetTop || 0}px`);
  }
  function scheduleFit() {
    cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(fitViewport);
  }
  async function leaveFullscreen() {
    if (!fullscreenElement()) return;
    try {
      const leave = document.exitFullscreen || document.webkitExitFullscreen;
      await leave?.call(document);
    } catch { /* The normal reading view still works if the browser declines. */ }
  }
  async function stop() {
    if (!presenting()) return;
    document.body.classList.remove('presenting');
    document.documentElement.classList.remove('presentation-open');
    feedback.className = 'tap-feedback';
    progressAnimation?.cancel();
    clearTimeout(feedbackTimer);
    touchStart = null;
    hadFullscreen = false;
    const slide = slides[index];
    await leaveFullscreen();
    // Safari restores its previous scroll on fullscreen exit; position the reading view afterward.
    requestAnimationFrame(() => {
      if (presenting()) return;
      // Synchronize the reading controller even when IntersectionObserver stays intersecting.
      document.dispatchEvent(new CustomEvent('reading-slidenavigate', { detail: { index: slides.indexOf(slide), remote: true } }));
      button.focus({ preventScroll: true });
    });
  }
  function enter(next = visibleSlide()) {
    document.body.classList.add('presenting');
    document.documentElement.classList.add('presentation-open');
    show(next);
    fitViewport();
  }
  window.presentationDeck = {
    current: () => presenting() ? index : visibleSlide(),
    present: enter,
    exit: stop,
    goTo: next => {
      if (!Number.isInteger(next) || next < 0 || next >= slides.length) return;
      if (presenting()) show(next);
      else document.dispatchEvent(new CustomEvent('reading-slidenavigate', { detail: { index: next, remote: true } }));
    },
  };
  button.addEventListener('click', async event => {
    enter();
    if (event.detail === 0) exit.focus({ preventScroll: true });
    else button.blur();
    // iPhone Safari can decline element fullscreen; the viewport layout remains usable.
    try {
      const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      await request?.call(document.documentElement);
      if (fullscreenElement()) hadFullscreen = true;
      if (!presenting()) await leaveFullscreen();
    } catch { /* Keep the viewport-filling presentation open. */ }
  });
  exit.addEventListener('click', stop);
  function fullscreenChanged() {
    if (fullscreenElement()) hadFullscreen = true;
    else if (hadFullscreen && presenting()) stop();
    scheduleFit();
  }
  document.addEventListener('fullscreenchange', fullscreenChanged);
  document.addEventListener('webkitfullscreenchange', fullscreenChanged);
  window.addEventListener('resize', scheduleFit);
  window.visualViewport?.addEventListener('resize', scheduleFit);
  window.visualViewport?.addEventListener('scroll', scheduleFit);

  const navigable = target => presenting() || target.closest('main section');
  function move(direction, target) {
    document.dispatchEvent(new Event('presentation-manualnavigate'));
    if (presenting()) { show(index + direction); return; }
    const current = slides.indexOf(target.closest('main section'));
    if (current < 0) return;
    const next = Math.max(0, Math.min(slides.length - 1, current + direction));
    document.dispatchEvent(new CustomEvent('reading-slidenavigate', { detail: next }));
  }
  function navigateHalf(clientX, target) {
    const rect = document.body.getBoundingClientRect();
    const direction = clientX < rect.left + rect.width / 2 ? -1 : 1;
    clearTimeout(feedbackTimer);
    feedback.className = 'tap-feedback';
    void feedback.offsetWidth; // Restart feedback for consecutive taps on the same half.
    feedback.className = `tap-feedback ${direction < 0 ? 'tap-left' : 'tap-right'}`;
    feedbackTimer = setTimeout(() => { feedback.className = 'tap-feedback'; }, 240);
    move(direction, target);
  }
  // A stationary, single-finger tap navigates once; swipes and pinches do not.
  document.addEventListener('touchstart', event => {
    touchStart = navigable(event.target) && !interactive(event.target) && event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY, time: performance.now() }
      : null;
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (touchStart && (event.touches.length !== 1 ||
        Math.hypot(event.touches[0].clientX - touchStart.x, event.touches[0].clientY - touchStart.y) > 12)) touchStart = null;
  }, { passive: true });
  document.addEventListener('touchend', event => {
    if (!navigable(event.target) || interactive(event.target)) return;
    const start = touchStart;
    touchStart = null;
    const touch = event.changedTouches[0];
    if (!start || event.touches.length || performance.now() - start.time > 600 ||
        Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 12) return;
    event.preventDefault();
    navigateHalf(touch.clientX, event.target);
  }, { passive: false });
  document.addEventListener('touchcancel', () => { touchStart = null; });
  document.addEventListener('keydown', event => {
    if (!presenting() || event.target.closest('input,textarea,select,[contenteditable="true"],.live-control,.live-ended,.caption-language,.schema-card,.schema-popover')) return;
    if (['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', ' ', 'Escape', 'Home', 'End'].includes(event.key)) {
      if (event.key === ' ' && event.target.closest('button')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === 'Escape') stop();
      else {
        document.dispatchEvent(new Event('presentation-manualnavigate'));
        if (event.key === 'Home') show(0);
        else if (event.key === 'End') show(slides.length - 1);
        else show(index + (['ArrowLeft', 'PageUp'].includes(event.key) ? -1 : 1));
      }
    }
  }, true);
})();
