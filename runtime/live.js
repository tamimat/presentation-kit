/*! Presentation Kit — MIT License. Copyright (c) 2026 Presentation Kit contributors. See LICENSE. */
(() => {
  if (!/^https?:$/.test(location.protocol) || !window.presentationDeck) return;
  const {config,languages,labels,applyLanguages}=window.PresentationKit;
  if(!config.live?.endpoint)return;
  const API=config.live.endpoint;
  const DECK=config.id;
  const slideCount=document.querySelectorAll('main section').length;
  const KEY=config.live.storageKey||DECK+'-live-presenter';
  const deck = window.presentationDeck;
  const control = document.createElement('div');
  control.className = 'live-control';
  control.innerHTML = '<button type="button" class="live-toggle" aria-expanded="false" aria-controls="live-panel"></button><div id="live-panel" class="live-panel" hidden role="region" aria-labelledby="live-title"><h2 id="live-title"></h2><p class="live-description"></p><input class="live-link" readonly dir="ltr" hidden><div class="live-actions"><button type="button" class="live-primary"></button><button type="button" class="live-secondary" hidden></button></div><p class="live-status" role="status" aria-live="polite"></p></div>';
  document.body.append(control);
  const notice = document.createElement('dialog');
  notice.className = 'live-ended';
  notice.setAttribute('aria-labelledby', 'live-ended-title');
  notice.setAttribute('aria-describedby', 'live-ended-description');
  notice.innerHTML = '<h2 id="live-ended-title"><span class="lang-en" lang="en">The live session has ended</span><span class="lang-ar" lang="ar" dir="rtl">انتهت الجلسة المباشرة</span></h2><p id="live-ended-description"><span class="lang-en" lang="en">You can still explore every slide, move back and forth, and choose your own language.</span><span class="lang-ar" lang="ar" dir="rtl">يمكنك تصفّح جميع الشرائح والتنقّل بينها واختيار اللغة التي تناسبك.</span></p><button type="button"><span class="lang-en" lang="en">Browse presentation</span><span class="lang-ar" lang="ar" dir="rtl">تصفّح العرض</span></button>';
  const noticeParts={title:notice.querySelector('h2'),description:notice.querySelector('p'),button:notice.querySelector('button')};
  for(const [part,element]of Object.entries(noticeParts)){
    element.replaceChildren(...languages.map(language=>{const span=document.createElement('span');span.className=language.code===languages[0].code?'lang-en':'lang-ar';span.lang=language.htmlLang||language.code;span.dataset.language=language.code;span.dir=language.dir||'ltr';span.textContent=labels(language.code)[part==='title'?'ended':part==='description'?'endedDescription':'browse'];return span;}));
  }
  document.body.append(notice);
  applyLanguages();
  const find = selector => control.querySelector(selector);
  const toggle = find('.live-toggle'), panel = find('.live-panel'), primary = find('.live-primary'), secondary = find('.live-secondary'), link = find('.live-link');
  const words = {
    en: { live: 'Live', hosting: '● Live', following: '● Following', paused: 'Resume live', ended: 'Session ended', title: 'Present together', hostTitle: 'Your live session', viewerTitle: 'Following the presenter', idle: 'Share a live link so everyone follows your slides. Each viewer chooses their own language.', host: 'Share this audience link. Keep this tab open; your slide changes are shared automatically. Language choices stay independent.', viewer: 'Your slides follow the presenter. Choose any language above. You can pause to explore and resume whenever you like.', start: 'Start live session', copy: 'Copy viewer link', end: 'End session', pause: 'Pause following', resume: 'Resume following', leave: 'Leave session', ready: 'Connected · session lasts up to 8 hours', connecting: 'Connecting…', reconnecting: 'Connection interrupted · retrying…', waiting: 'Waiting for the presenter to reconnect…', pausedStatus: 'Paused · browse freely, then resume to catch up.', endedStatus: 'The session has ended. You can keep exploring the slides.', expired: 'This session has expired or does not exist. You can still read the slides.', error: 'Could not connect. Please try again.', copied: 'Viewer link copied.', select: 'Select and copy the link above.', starting: 'Starting…', ending: 'Ending…', rate: 'Please wait a minute before starting another session.', link: 'Audience link' },
    ar: { live: 'مباشر', hosting: '● مباشر', following: '● متابعة مباشرة', paused: 'استئناف المتابعة', ended: 'انتهت الجلسة', title: 'لنعرض معاً', hostTitle: 'جلستك المباشرة', viewerTitle: 'متابعة المقدّم', idle: 'شارك رابطاً مباشراً ليتابع الجميع شرائحك. يختار كل مشاهد لغته بشكل مستقل.', host: 'شارك رابط الجمهور هذا. أبقِ هذه الصفحة مفتوحة لتُشارك تغييرات الشرائح تلقائياً. يختار كل شخص لغته.', viewer: 'تتبع شرائحك المقدّم. اختر أي لغة من الأعلى. يمكنك إيقاف المتابعة مؤقتاً والاستكشاف ثم الاستئناف.', start: 'بدء جلسة مباشرة', copy: 'نسخ رابط الجمهور', end: 'إنهاء الجلسة', pause: 'إيقاف المتابعة مؤقتاً', resume: 'استئناف المتابعة', leave: 'مغادرة الجلسة', ready: 'متصل · تستمر الجلسة حتى ٨ ساعات', connecting: 'جارٍ الاتصال…', reconnecting: 'انقطع الاتصال · نحاول مجدداً…', waiting: 'بانتظار عودة اتصال المقدّم…', pausedStatus: 'المتابعة متوقفة مؤقتاً · استكشف ثم استأنف للحاق بالمقدّم.', endedStatus: 'انتهت الجلسة. يمكنك متابعة تصفح الشرائح.', expired: 'انتهت صلاحية هذه الجلسة أو أنها غير موجودة. يمكنك تصفح الشرائح.', error: 'تعذّر الاتصال. حاول مجدداً.', copied: 'تم نسخ رابط الجمهور.', select: 'حدّد الرابط أعلاه وانسخه.', starting: 'جارٍ البدء…', ending: 'جارٍ الإنهاء…', rate: 'انتظر دقيقة قبل بدء جلسة جديدة.', link: 'رابط الجمهور' },
  };
  let role = 'idle', session = null, following = true, ended = false, busy = false;
  let status = '', timer, sending = false, polling = false, pending = false, lastSlide = null, remoteSlide = null, initialViewer = true;
  const text = () => words[document.body.dataset.captionMode === 'ar' ? 'ar' : 'en'];
  const store = () => { try { session ? sessionStorage.setItem(KEY, JSON.stringify(session)) : sessionStorage.removeItem(KEY); } catch {} };
  function audienceLink() {
    const url = new URL(config.shareUrl || location.pathname, location.origin);
    url.searchParams.set('live', session.id);
    url.hash = `slide-${String(deck.current() + 1).padStart(2, '0')}`;
    return url.href;
  }
  function render() {
    const t = text();
    toggle.textContent = role === 'host' ? t.hosting : role === 'viewer' ? (ended ? t.ended : following ? t.following : t.paused) : t.live;
    find('h2').textContent = role === 'host' ? t.hostTitle : role === 'viewer' ? t.viewerTitle : t.title;
    find('.live-description').textContent = role === 'host' ? t.host : role === 'viewer' ? t.viewer : t.idle;
    link.hidden = role !== 'host';
    link.setAttribute('aria-label', t.link);
    if (role === 'host' && link !== document.activeElement) link.value = audienceLink();
    primary.hidden = role === 'viewer' && ended;
    primary.textContent = role === 'host' ? t.copy : role === 'viewer' ? (following ? t.pause : t.resume) : t.start;
    secondary.hidden = role === 'idle';
    secondary.textContent = role === 'host' ? t.end : t.leave;
    primary.disabled = secondary.disabled = busy;
    const message = t[status] || '';
    if (find('.live-status').textContent !== message) find('.live-status').textContent = message;
  }
  async function browse() {
    notice.close();
    await deck.exit();
    requestAnimationFrame(() => {
      const slide = document.querySelectorAll('main section')[deck.current()];
      slide.tabIndex = -1;
      slide.focus({ preventScroll: true });
    });
  }
  notice.querySelector('button').addEventListener('click', browse);
  notice.addEventListener('cancel', event => { event.preventDefault(); browse(); });
  function finishViewer(reason = 'endedStatus') {
    ended = true;
    following = false;
    clearTimeout(timer);
    open(false);
    setStatus(reason);
    if (reason === 'expired') {
      notice.querySelectorAll('h2 [data-language]').forEach(span=>{span.textContent=labels(span.dataset.language).unavailable});
    }
    if (!notice.open) notice.showModal();
  }
  function setStatus(value) { status = value; render(); }
  function open(value) { panel.hidden = !value; toggle.setAttribute('aria-expanded', String(value)); }
  toggle.addEventListener('click', () => { open(panel.hidden); render(); });
  control.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); open(false); toggle.focus(); }
  });
  document.addEventListener('click', event => { if (!control.contains(event.target)) open(false); });
  new MutationObserver(()=>{render();applyLanguages()}).observe(document.body, { attributes: true, attributeFilter: ['data-caption-mode'] });
  async function request(method, id, data, token) {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const headers = {};
      if (data) headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = `Bearer ${token}`;
      const result = await fetch(API + (id ? `?id=${encodeURIComponent(id)}` : ''), { method, headers, body: data ? JSON.stringify(data) : undefined, signal: abort.signal, credentials: 'omit', cache: 'no-store' });
      if (!result.ok) { const error = new Error('Live request failed'); error.status = result.status; throw error; }
      return await result.json();
    } finally { clearTimeout(timeout); }
  }
  function reset() {
    clearTimeout(timer); role = 'idle'; session = null; ended = false; following = true; store();
    const url = new URL(location.href); url.searchParams.delete('live'); history.replaceState(null, '', url);
    setStatus('');
  }
  async function publish() {
    if (role !== 'host' || busy) return;
    pending = true;
    if (sending) return;
    sending = true;
    while (pending && role === 'host') {
      pending = false;
      session.sequence += 1; store();
      const slide = deck.current();
      const id = session.id;
      try {
        await request('PUT', id, { slide, sequence: session.sequence, ended: false }, session.token);
        if (role !== 'host' || session.id !== id || busy) break;
        lastSlide = slide; setStatus('ready');
      } catch (error) {
        if (role !== 'host' || session.id !== id || busy) break;
        if ([401, 404, 410].includes(error.status)) { reset(); setStatus('expired'); break; }
        setStatus('reconnecting'); break;
      }
    }
    sending = false;
    if (role === 'host') { clearTimeout(timer); timer = setTimeout(publish, status === 'reconnecting' ? 3000 : 15000); }
  }
  async function poll() {
    if (polling) return;
    polling = true;
    try { await pollOnce(); } finally { polling = false; }
  }
  async function pollOnce() {
    if (role !== 'viewer' || ended) return;
    const id = session.id;
    try {
      const state = await request('GET', id);
      if (role !== 'viewer' || session.id !== id) return;
      if (state.deck !== DECK || (state.slideCount && state.slideCount !== slideCount) || !Number.isInteger(state.slide) || state.slide < 0 || state.slide >= slideCount) throw new Error('Invalid state');
      if (state.ended) { if (following) deck.goTo(state.slide); finishViewer(); return; }
      remoteSlide = state.slide;
      if (initialViewer) { initialViewer = false; if (following) deck.present(remoteSlide); }
      else if (following && deck.current() !== remoteSlide) deck.goTo(remoteSlide);
      setStatus(!following ? 'pausedStatus' : state.active ? 'ready' : 'waiting');
    } catch (error) {
      if (role !== 'viewer') return;
      if (error.status === 404) { finishViewer('expired'); return; }
      setStatus('reconnecting');
    }
    if (role === 'viewer' && !ended) timer = setTimeout(poll, document.hidden ? 5000 : 1500);
  }
  function pause() {
    if (role === 'viewer' && following && !ended) { following = false; setStatus('pausedStatus'); }
  }
  document.addEventListener('presentation-manualnavigate', pause);
  document.addEventListener('wheel', event => { if (!document.body.classList.contains('presenting') && !control.contains(event.target)) pause(); }, { passive: true });
  document.addEventListener('touchmove', event => { if (!document.body.classList.contains('presenting') && !control.contains(event.target)) pause(); }, { passive: true });
  document.querySelector('.controls')?.addEventListener('click', pause);
  document.addEventListener('presentation-slidechange', event => { if (role === 'host' && event.detail !== lastSlide) publish(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { clearTimeout(timer); if (role === 'host') publish(); else if (role === 'viewer') poll(); }
  });
  primary.addEventListener('click', async () => {
    if (role === 'host') {
      link.value = audienceLink();
      try { await navigator.clipboard.writeText(link.value); setStatus('copied'); }
      catch { link.focus(); link.select(); setStatus('select'); }
      return;
    }
    if (role === 'viewer') {
      if (following) pause();
      else { following = true; if (remoteSlide !== null) deck.goTo(remoteSlide); setStatus('connecting'); clearTimeout(timer); poll(); }
      return;
    }
    busy = true; setStatus('starting');
    try {
      session = await request('POST', null, { deck: DECK, slideCount, slide: deck.current() });
      role = 'host'; store(); setStatus('ready');
    } catch (error) { setStatus(error.status === 429 ? 'rate' : 'error'); }
    finally { busy = false; render(); }
    if (role === 'host') publish();
  });
  secondary.addEventListener('click', async () => {
    if (role === 'viewer') { reset(); return; }
    busy = true; clearTimeout(timer); setStatus('ending');
    // Use a higher sequence than every in-flight update; ended sessions cannot reopen.
    session.sequence += 1; store();
    try {
      await request('PUT', session.id, { slide: deck.current(), sequence: session.sequence, ended: true }, session.token);
      reset(); setStatus('endedStatus');
    } catch (error) {
      if ([401, 404, 410].includes(error.status)) { reset(); setStatus('endedStatus'); }
      else { setStatus('error'); timer = setTimeout(publish, 15000); }
    } finally { busy = false; render(); }
  });
  async function initialize() {
    const room = new URL(location.href).searchParams.get('live');
    if (room !== null) {
      role = 'viewer'; session = { id: room };
      if (!/^[a-f0-9]{32}$/.test(room)) { finishViewer('expired'); return; }
      setStatus('connecting'); poll(); return;
    }
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(KEY)); } catch {}
    if (!saved || !/^[a-f0-9]{32}$/.test(saved.id) || !/^[a-f0-9]{64}$/.test(saved.token) || saved.expiresAt <= Date.now()) { render(); return; }
    busy = true; setStatus('connecting');
    try {
      const state = await request('GET', saved.id);
      if (!state.ended) {
        session = { ...saved, sequence: Math.max(saved.sequence || 0, state.sequence) };
        role = 'host'; deck.goTo(state.slide); store();
      } else { session = null; store(); }
    } catch { setStatus('error'); }
    busy = false; render(); if (role === 'host') publish();
  }
  initialize();
})();
