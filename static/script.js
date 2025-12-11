// Scroll reveal via IntersectionObserver
(()=>{
  const els = document.querySelectorAll('[data-reveal]');
  if(!('IntersectionObserver' in window) || els.length===0){
    // Fallback: make all visible
    els.forEach(el=>el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const el = entry.target;
      if(entry.isIntersecting){
        el.classList.add('in');
        io.unobserve(el);
      }
    })
  },{root:null,threshold:0.15});
  els.forEach((el, i)=>{
    // add base reveal class based on optional variant
    const variant = el.getAttribute('data-reveal');
    if(variant && variant!=='true') el.classList.add('reveal', variant);
    else el.classList.add('reveal');
    // stagger animation start slightly for sequential appearance
    el.style.transitionDelay = `${Math.min(i*0.12, 0.6)}s`;
    io.observe(el);
  })
})();
// Smooth anchor scrolling
document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener('click',e=>{
    const target=document.querySelector(link.getAttribute('href'));
    if(!target)return;
    e.preventDefault();
    target.scrollIntoView({behavior:'smooth',block:'start'});
  });
});

// Our Services carousel (existing logic)
(function(){
  const carousel = document.querySelector('.carousel');
  const track = document.querySelector('.carousel-track');
  if(!carousel || !track) return;
  const cards = Array.from(track.children);
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  let currentIndex = 0;

  function isMobileMode() {
    return window.matchMedia('(max-width: 900px)').matches;
  }
  function getCardGap() {
    const style = window.getComputedStyle(track);
    const gap = parseInt(style.gap || '0', 10);
    return isNaN(gap) ? 24 : gap;
  }
  function getCardWidth() {
    const cardW = cards[0]?.offsetWidth || 0;
    const extra = isMobileMode() ? getCardGap() : 24;
    return cardW + extra;
  }
  function getVisibleCards() {
    const viewport = carousel.offsetWidth;
    const cw = getCardWidth();
    return Math.max(1, Math.floor(viewport / cw));
  }
  function getMaxIndex() {
    return Math.max(0, cards.length - getVisibleCards());
  }
  function updateButtons() {
    if(!prevBtn || !nextBtn) return;
    const maxIdx = getMaxIndex();
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIdx;
    // Hide arrows entirely if all cards fit in view
    const showArrows = maxIdx > 0;
    prevBtn.style.display = showArrows ? 'block' : 'none';
    nextBtn.style.display = showArrows ? 'block' : 'none';
  }
  function updateCarousel(animate = true) {
    if (!cards.length) return;
    if (isMobileMode()) {
      const targetScroll = currentIndex * getCardWidth();
      track.scrollTo({ left: targetScroll, behavior: animate ? 'smooth' : 'auto' });
    } else {
      track.style.transition = animate ? 'transform 0.5s cubic-bezier(.77,0,.18,1)' : 'none';
      track.style.transform = `translateX(-${currentIndex * getCardWidth()}px)`;
    }
    updateButtons();
  }
  function showNext() { if (currentIndex < getMaxIndex()) { currentIndex++; updateCarousel(true); } }
  function showPrev() { if (currentIndex > 0) { currentIndex--; updateCarousel(true); } }
  nextBtn?.addEventListener('click', showNext);
  prevBtn?.addEventListener('click', showPrev);
  window.addEventListener('resize', () => {
    // Clamp index so it stays within the new bounds after zoom/resizing
    const maxIdx = getMaxIndex();
    if (currentIndex > maxIdx) currentIndex = maxIdx;
    if (currentIndex < 0) currentIndex = 0;
    updateCarousel(false);
  });
  updateCarousel(false);
})();

// Portfolio carousel: full-bleed, multi-item per view, autoplay + lightbox
(function(){
  const carousel = document.querySelector('.portfolio-carousel');
  const track = document.querySelector('.portfolio-track');
  const prevBtn = document.querySelector('.portfolio-btn.prev');
  const nextBtn = document.querySelector('.portfolio-btn.next');
  if(!carousel || !track) return;

  let baseItems = []; // non-clone items
  let items = [];     // current items including clones
  let index = 0;      // current starting item index
  let itemsPerView = 1;
  let itemWidth = 0;  // px
  let autoplayTimer = null;
  const AUTOPLAY_MS = 2000; // faster auto-advance
  const MIN_ITEM_WIDTH = 360; // target min width per tile to allow multiple per view
  const PEEK_PX = 40; // tiny edge peek, maximize tile width
  let gap = 12; // minimal gap to keep images separated
  let stepWidth = 0; // item width + gap

  function collectBaseItems(){
    baseItems = Array.from(track.children).filter(el=>!el.classList.contains('clone'));
  }
  function clearClones(){
    Array.from(track.children).forEach(el=>{ if(el.classList.contains('clone')) el.remove(); });
  }
  function computeLayout(){
    const width = carousel.clientWidth;
    // Reduce size by ~half on wide screens: show 2 tiles per view, 1 on narrow
    const isWide = width >= 900;
    itemsPerView = isWide ? 2 : 1;
    const totalGaps = (itemsPerView - 1) * gap;
    itemWidth = Math.max(280, Math.floor((width - 2*PEEK_PX - totalGaps) / itemsPerView));
    stepWidth = itemWidth + gap;
    // Set spacing vars
    track.style.setProperty('--portfolio-gap', `${gap}px`);
    track.style.setProperty('--portfolio-peek', `${PEEK_PX}px`);
    // Set uniform height relative to width for consistent tile size
    const height = Math.round(itemWidth * 0.60);
    carousel.style.setProperty('--portfolio-item-height', `${height}px`);
  }
  function addClones(){
    // clone last N to head
    const headClones = baseItems.slice(-itemsPerView).map(el=>{
      const c = el.cloneNode(true); c.classList.add('clone'); return c;
    });
    headClones.forEach(c=> track.insertBefore(c, track.firstChild));
    // clone first N to tail
    const tailClones = baseItems.slice(0, itemsPerView).map(el=>{
      const c = el.cloneNode(true); c.classList.add('clone'); return c;
    });
    tailClones.forEach(c=> track.appendChild(c));
    items = Array.from(track.children);
  }
  function setIndexToFirstRealGroup(){
    index = itemsPerView; // start just after head clones
  }
  function update(animate=true){
    track.style.transition = animate ? 'transform 0.5s cubic-bezier(.77,0,.18,1)' : 'none';
    track.style.transform = `translateX(-${index * stepWidth}px)`;
  }
  function next(){ index += itemsPerView; update(true); }
  function prev(){ index -= itemsPerView; update(true); }

  // Wrap-around handling
  track.addEventListener('transitionend', ()=>{
    const total = items.length;
    const lastRealStart = total - itemsPerView - itemsPerView; // before tail clones
    if(index >= total - itemsPerView){ // hit tail clones
      track.style.transition = 'none';
      index = itemsPerView; // jump to first real group
      update(false);
    } else if(index < itemsPerView){ // hit head clones
      track.style.transition = 'none';
      index = lastRealStart; // jump to last real group start
      update(false);
    }
  });

  // Controls
  nextBtn?.addEventListener('click', next);
  prevBtn?.addEventListener('click', prev);

  // Touch swipe gestures (mobile): swipe left/right to navigate
  let touchStartX = 0;
  let touchStartY = 0;
  let touchDeltaX = 0;
  let isSwiping = false;
  const SWIPE_THRESHOLD = 40; // px horizontal movement to trigger
  const VERTICAL_GUARD = 20;  // ignore if vertical movement dominates

  function onTouchStart(e){
    const t = e.touches?.[0];
    if(!t) return;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchDeltaX = 0;
    isSwiping = true;
    stopAutoplay();
  }
  function onTouchMove(e){
    if(!isSwiping) return;
    const t = e.touches?.[0];
    if(!t) return;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    // If vertical scroll is larger, cancel swipe to allow page scroll
    if(Math.abs(dy) > Math.abs(dx) + VERTICAL_GUARD){ isSwiping = false; return; }
    touchDeltaX = dx;
    // Provide a small visual drag via transform (optional)
    track.style.transition = 'none';
    track.style.transform = `translateX(${(-index * stepWidth) + dx}px)`;
  }
  function onTouchEnd(){
    if(!isSwiping){ update(true); startAutoplay(); return; }
    if(touchDeltaX <= -SWIPE_THRESHOLD){
      next();
    } else if(touchDeltaX >= SWIPE_THRESHOLD){
      prev();
    } else {
      update(true);
    }
    isSwiping = false;
    startAutoplay();
  }
  // Attach listeners on the visible carousel area
  carousel.addEventListener('touchstart', onTouchStart, { passive: true });
  carousel.addEventListener('touchmove', onTouchMove, { passive: true });
  carousel.addEventListener('touchend', onTouchEnd, { passive: true });

  // Autoplay with pause-on-hover and when lightbox is open/visibility hidden
  function startAutoplay(){ stopAutoplay(); autoplayTimer = setInterval(next, AUTOPLAY_MS); }
  function stopAutoplay(){ if(autoplayTimer){ clearInterval(autoplayTimer); autoplayTimer = null; } }
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) stopAutoplay(); else startAutoplay(); });

  // Lightbox
  const lightbox = document.querySelector('.lightbox');
  const lbImg = document.querySelector('.lightbox-image');
  const lbClose = document.querySelector('.lightbox-close');
  const lbBackdrop = document.querySelector('.lightbox-backdrop');
  function openLightbox(src, alt){
    stopAutoplay();
    lbImg.src = src; lbImg.alt = alt || '';
    lightbox.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lightbox.classList.remove('show');
    lbImg.src = '';
    document.body.style.overflow = '';
    startAutoplay();
  }

  function wireImageClicks(){
    items.forEach(item=>{
      const img = item.querySelector('img');
      img?.addEventListener('click', ()=> openLightbox(img.src, img.alt));
    });
  }
  lbClose?.addEventListener('click', closeLightbox);
  lbBackdrop?.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLightbox(); });

  // Init and re-init on resize
  function init(){
    stopAutoplay();
    clearClones();
    collectBaseItems();
    computeLayout();
    addClones();
    // apply width to all items including clones
    Array.from(track.children).forEach(el=>{
      el.style.setProperty('--portfolio-item-width', itemWidth+'px');
    });
    setIndexToFirstRealGroup();
    update(false);
    wireImageClicks();
    startAutoplay();
  }
  window.addEventListener('resize', init);
  init();
})();

// Before & After comparison control
(function(){
  const compare = document.querySelector('.compare');
  if(!compare) return;
  const afterImg = compare.querySelector('.compare-img.after');
  const range = compare.querySelector('.compare-range');
  const handle = compare.querySelector('.compare-handle');
  function update(){
    const v = parseInt(range.value || '50', 10);
    const pct = Math.max(0, Math.min(100, v));
    // Reveal after image to percentage
    afterImg.style.clipPath = `inset(0 0 0 ${100-pct}%)`;
    handle.style.left = `${pct}%`;
  }
  range.addEventListener('input', update);
  range.addEventListener('change', update);
  window.addEventListener('resize', update);
  // Dragging support on handle and entire compare area
  let dragging = false;
  function setFromClientX(clientX){
    const rect = compare.getBoundingClientRect();
    const x = Math.max(rect.left, Math.min(rect.right, clientX));
    const pct = Math.round(((x - rect.left) / rect.width) * 100);
    range.value = String(pct);
    update();
  }
  function onPointerDown(e){ dragging = true; setFromClientX(e.clientX ?? (e.touches?.[0]?.clientX || 0)); e.preventDefault(); }
  function onPointerMove(e){ if(!dragging) return; setFromClientX(e.clientX ?? (e.touches?.[0]?.clientX || 0)); }
  function onPointerUp(){ dragging = false; }
  // Mouse events
  compare.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  // Touch events
  compare.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp);
  update();
})();
