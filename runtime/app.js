/*! Presentation Kit — MIT License. Copyright (c) 2026 Presentation Kit contributors. See LICENSE. */
(() => {
  const slides = [...document.querySelectorAll('main section')];
  let current = 0;
  let readingHashTimer;
  const interactive = t => t.closest('input,textarea,select,label,summary,details,.live-control,.caption-language,.schema-card,.schema-popover,.live-ended');
  const set = i => {
    current = Math.max(0, Math.min(slides.length - 1, i));
    document.getElementById('prev').href = '#' + slides[Math.max(0, current - 1)].id;
    document.getElementById('next').href = '#' + slides[Math.min(slides.length - 1, current + 1)].id;
    document.dispatchEvent(new CustomEvent('reading-slidechange', { detail: current }));
  };
  const navigate = (i, remote = false) => {
    if (!remote) document.dispatchEvent(new Event('presentation-manualnavigate'));
    set(i);
    const slide = slides[current];
    slide.scrollIntoView({ behavior: remote || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    clearTimeout(readingHashTimer);
    readingHashTimer = setTimeout(() => history.replaceState(null, '', '#' + slide.id), 150);
  };
  document.addEventListener('reading-slidenavigate', event => {
    const value = event.detail;
    navigate(typeof value === 'number' ? value : value.index, typeof value === 'object' && value.remote);
  });
  const observer = new IntersectionObserver(entries => {
    if (document.body.classList.contains('presenting')) return;
    for (const entry of entries) if (entry.isIntersecting) set(slides.indexOf(entry.target));
  }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
  slides.forEach(slide => observer.observe(slide));
  document.addEventListener('keydown', event => {
    if (document.body.classList.contains('presenting') || interactive(event.target)) return;
    if (['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      navigate(current + (['ArrowLeft', 'PageUp'].includes(event.key) ? -1 : 1));
    }
  });
})();

// Deck languages and labels come from its own presentation configuration.
(() => {
  const {config,languages,labels,applyLanguages}=window.PresentationKit;
  const modes=[...(languages.length>1?['both']:[]),...languages.map(l=>l.code),'none'];
  const label=document.createElement('div');label.className='caption-language';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='caption-language-toggle';toggle.setAttribute('aria-haspopup','menu');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','caption-language-menu');
  const menu=document.createElement('div');menu.id='caption-language-menu';menu.className='caption-language-menu';menu.setAttribute('role','menu');menu.hidden=true;
  const options=modes.map(mode=>{const option=document.createElement('button');option.type='button';option.setAttribute('role','menuitemradio');option.dataset.mode=mode;option.tabIndex=-1;menu.append(option);return option;});
  label.append(toggle,menu);const toolbar=document.querySelector('.presentation-toolbar');toolbar.prepend(label);
  let current=config.defaultMode||modes[0],hoverOpen=false,closeTimer,pointerType;
  const close=(focus=false)=>{clearTimeout(closeTimer);hoverOpen=false;menu.hidden=true;toolbar.classList.remove('language-open');toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus({preventScroll:true});};
  const open=(focus=false)=>{clearTimeout(closeTimer);menu.hidden=false;toolbar.classList.add('language-open');toggle.setAttribute('aria-expanded','true');if(focus)options[modes.indexOf(current)].focus({preventScroll:true});};
  const set=mode=>{
    if(!modes.includes(mode))mode=config.defaultMode||modes[0];current=mode;
    const language=languages.find(l=>l.code===mode)||languages[0],ui=labels(language.code);
    document.body.dataset.captionMode=mode;document.body.dataset.captionSingle=mode===languages[1]?.code?'secondary':'primary';document.documentElement.lang=language.htmlLang||language.code;
    options.forEach(option=>{const value=option.dataset.mode;option.textContent=value==='both'?(config.bilingualLabel||languages.map(l=>l.short||l.label).join(' + ')):value==='none'?ui.images:languages.find(l=>l.code===value).label;option.setAttribute('aria-checked',String(value===mode));});
    toggle.textContent=options[modes.indexOf(mode)].textContent;toggle.setAttribute('aria-label',ui.language+': '+toggle.textContent);menu.setAttribute('aria-label',ui.language);
    document.getElementById('present').textContent=ui.present;document.getElementById('exit-presentation').textContent=ui.exit;
    document.querySelector('.presentation-progress').setAttribute('aria-label',ui.progress);document.querySelector('.slide-counter').setAttribute('aria-label',ui.current);
    document.querySelectorAll('img[data-alt-en]').forEach(img=>{img.alt=img.getAttribute('data-alt-'+mode)||img.dataset.altEn;});
    applyLanguages();try{localStorage.setItem((config.captionStorageKey || (config.id||'presentation')+'-caption-mode'),mode)}catch{}
    document.dispatchEvent(new CustomEvent('presentation-languagechange',{detail:mode}));
  };
  let saved;try{saved=localStorage.getItem((config.captionStorageKey || (config.id||'presentation')+'-caption-mode'))}catch{}set(saved||current);
  label.addEventListener('pointerenter',event=>{if(event.pointerType!=='mouse')return;clearTimeout(closeTimer);if(menu.hidden){hoverOpen=true;open();}});
  label.addEventListener('pointerleave',event=>{if(event.pointerType!=='mouse'||!hoverOpen)return;closeTimer=setTimeout(()=>{if(!label.matches(':hover')&&!menu.contains(document.activeElement))close()},400);});
  toggle.addEventListener('pointerdown',event=>{pointerType=event.pointerType});
  toggle.addEventListener('click',event=>{if(event.detail>0&&pointerType==='mouse'&&hoverOpen)open();else menu.hidden?open(event.detail===0):close();});
  options.forEach(option=>option.addEventListener('click',event=>{set(option.dataset.mode);close(event.detail===0);if(event.detail!==0)option.blur();}));
  label.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();close(true);}
    else if(event.key==='Tab'&&!menu.hidden)close(true);
    else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const wasClosed=menu.hidden;open();let next=options.indexOf(document.activeElement);if(event.key==='Home')next=0;else if(event.key==='End')next=options.length-1;else if(wasClosed||next<0)next=modes.indexOf(current);else next=(next+(event.key==='ArrowUp'?-1:1)+options.length)%options.length;options[next].focus({preventScroll:true});}
  });
  document.addEventListener('click',event=>{if(!label.contains(event.target))close()});label.addEventListener('focusout',event=>{if(!label.contains(event.relatedTarget))close()});
  document.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='l'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest('input,textarea,select,[contenteditable="true"]')){event.preventDefault();set(modes[(modes.indexOf(current)+1)%modes.length]);}});
})();

// Show installation guidance only in a regular iPhone/iPad browser tab.
(() => {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const tip = document.querySelector('.iphone-tip');
  if (tip) tip.hidden = !ios || standalone;
})();

// Hover, keyboard focus or tap reveals a short data example.
(() => {
  const cards = [...document.querySelectorAll('.schema-card')];
  if (!cards.length) return;
  const panel = document.createElement('aside');
  panel.id = 'schema-popover';
  panel.className = 'schema-popover';
  panel.hidden = true;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', window.PresentationKit.config.exampleLabel || 'Data example');
  panel.innerHTML = '<button type="button" class="schema-popover-close" aria-label="Close example / إغلاق المثال">×</button><div class="schema-popover-content"></div>';
  document.body.append(panel);
  let active = null, timer, suppressFocus = false, dismissedPoint;
  function close(focus = false) {
    clearTimeout(timer);
    const previous = active;
    active?.querySelector('button').setAttribute('aria-expanded', 'false');
    active = null; panel.hidden = true;
    if (focus) {
      suppressFocus = true;
      previous?.querySelector('button').focus({ preventScroll: true });
      suppressFocus = false;
    }
  }
  function show(card) {
    clearTimeout(timer);
    if (active !== card) {
      active?.querySelector('button').setAttribute('aria-expanded', 'false');
      panel.querySelector('.schema-popover-content').replaceChildren(card.querySelector('template').content.cloneNode(true));
      active = card;
      window.PresentationKit.applyLanguages();
    }
    card.querySelector('button').setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    panel.style.left = '12px'; panel.style.top = '12px';
    const anchor = card.querySelector('button').getBoundingClientRect();
    panel.style.maxHeight = `${Math.max(100, Math.max(innerHeight - anchor.bottom - 20, anchor.top - 20))}px`;
    const rect = panel.getBoundingClientRect();
    const x = Math.max(12, Math.min(innerWidth - rect.width - 12, anchor.left));
    const below = innerHeight - anchor.bottom - 8;
    const y = below >= rect.height ? anchor.bottom + 8 : Math.max(12, Math.min(anchor.top - rect.height - 8, innerHeight - rect.height - 12));
    panel.style.left = `${x}px`; panel.style.top = `${y}px`;
  }
  function scheduleClose() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!panel.matches(':hover') && !active?.querySelector('button').matches(':hover') && !panel.contains(document.activeElement) && !active?.contains(document.activeElement)) close();
    }, 180);
  }
  cards.forEach(card => {
    const trigger = card.querySelector('button');
    let pointer, wasOpen;
    const hover = event => {
      if (event.pointerType !== 'mouse') return;
      if (dismissedPoint && Math.hypot(event.clientX - dismissedPoint.x, event.clientY - dismissedPoint.y) < 8) return;
      dismissedPoint = null;
      if (active !== card) show(card); else clearTimeout(timer);
    };
    trigger.addEventListener('pointerenter', hover);
    trigger.addEventListener('pointermove', event => { if (dismissedPoint) hover(event); });
    trigger.addEventListener('pointerleave', scheduleClose);
    trigger.addEventListener('pointerdown', event => { pointer = event.pointerType; wasOpen = active === card; });
    trigger.addEventListener('click', event => {
      if (wasOpen && pointer !== 'mouse' && event.detail > 0) close();
      else show(card);
    });
    trigger.addEventListener('focus', () => { if (!suppressFocus) show(card); });
    card.addEventListener('focusout', scheduleClose);
  });
  panel.addEventListener('pointerenter', () => clearTimeout(timer));
  panel.addEventListener('pointerleave', scheduleClose);
  panel.addEventListener('focusout', scheduleClose);
  panel.querySelector('button').addEventListener('click', event => {
    if (event.detail > 0) dismissedPoint = { x: event.clientX, y: event.clientY };
    close(event.detail === 0);
  });
  document.addEventListener('click', event => { if (active && !active.contains(event.target) && !panel.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    if (active && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
  });
  document.addEventListener('presentation-slidechange', event => { if (event.detail !== 13) close(); });
  window.addEventListener('resize', () => close());
  window.addEventListener('scroll', event => { if (!panel.contains(event.target)) close(); }, true);
})();
