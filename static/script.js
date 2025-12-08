// Infinite carousel logic for Our Services
document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener('click',e=>{
    const target=document.querySelector(link.getAttribute('href'));
    if(!target)return;
    e.preventDefault();
    target.scrollIntoView({behavior:'smooth',block:'start'});
  });
});

const carousel = document.querySelector('.carousel');
const track = document.querySelector('.carousel-track');
const cards = Array.from(track.children);
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');
let currentIndex = 0;

function isMobileMode() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function getCardGap() {
  // Gap is 24px in mobile CSS; fallback to computed gap
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
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex >= getMaxIndex();
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

function showNext() {
  if (currentIndex < getMaxIndex()) {
    currentIndex++;
    updateCarousel(true);
  }
}

function showPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    updateCarousel(true);
  }
}

// Sync index when user swipes on mobile
track.addEventListener('scroll', () => {
  if (!isMobileMode()) return;
  const cw = getCardWidth();
  const idx = Math.round(track.scrollLeft / cw);
  currentIndex = Math.max(0, Math.min(idx, getMaxIndex()));
  updateButtons();
});

nextBtn.addEventListener('click', showNext);
prevBtn.addEventListener('click', showPrev);

window.addEventListener('resize', () => {
  // Clamp index and update position
  currentIndex = Math.min(currentIndex, getMaxIndex());
  updateCarousel(false);
});

// Initialize
updateCarousel(false);

// Split gallery logic + lightbox
(function(){
  const featured = document.querySelector('.featured-img');
  const thumbsTrack = document.querySelector('.thumbs-track');
  if(!featured || !thumbsTrack) return;

  const thumbs = Array.from(thumbsTrack.querySelectorAll('.thumb'));
  const btnUp = document.querySelector('.thumbs-btn.up');
  const btnDown = document.querySelector('.thumbs-btn.down');
  const fPrev = document.querySelector('.featured-btn.prev');
  const fNext = document.querySelector('.featured-btn.next');
  let current = thumbs.findIndex(t=> t.classList.contains('active'));
  if(current < 0) current = 0;

  function setFeatured(src, alt){
    featured.src = src; featured.alt = alt || '';
  }
  function setActiveThumb(el){
    thumbs.forEach(t=> t.classList.remove('active'));
    el.classList.add('active');
  }

  thumbs.forEach(t=>{
    t.addEventListener('click', ()=>{ setFeatured(t.src, t.alt); setActiveThumb(t); current = thumbs.indexOf(t); });
  });

  // Scroll controls for vertical list (or horizontal on mobile)
  function scrollThumbs(delta){
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    thumbsTrack.scrollBy({ top: isMobile ? 0 : delta, left: isMobile ? (delta * 2) : 0, behavior: 'smooth' });
  }
  btnUp?.addEventListener('click', ()=> scrollThumbs(-140));
  btnDown?.addEventListener('click', ()=> scrollThumbs(140));

  // Mobile-only horizontal slider controls via overlay buttons
  function changeFeatured(dir){
    current = (current + dir + thumbs.length) % thumbs.length;
    const t = thumbs[current];
    setFeatured(t.src, t.alt);
    setActiveThumb(t);
  }
  fPrev?.addEventListener('click', ()=> changeFeatured(-1));
  fNext?.addEventListener('click', ()=> changeFeatured(1));

  // Removed mobile featured slider overlay controls; thumbnails remain the navigation

  // Lightbox
  const lightbox = document.querySelector('.lightbox');
  const lbImg = document.querySelector('.lightbox-image');
  const lbClose = document.querySelector('.lightbox-close');
  const lbBackdrop = document.querySelector('.lightbox-backdrop');

  function openLightbox(src, alt){
    lbImg.src = src; lbImg.alt = alt || '';
    lightbox.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lightbox.classList.remove('show');
    lbImg.src = '';
    document.body.style.overflow = '';
  }

  // Click featured to zoom
  featured.addEventListener('click', ()=> openLightbox(featured.src, featured.alt));
  // Also allow clicking any thumb to zoom if long-press would be awkward
  thumbs.forEach(t=> t.addEventListener('dblclick', ()=> openLightbox(t.src, t.alt)));

  lbClose?.addEventListener('click', closeLightbox);
  lbBackdrop?.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLightbox(); });
})();

nextBtn.addEventListener('click', showNext);
prevBtn.addEventListener('click', showPrev);

window.addEventListener('resize', () => {
  updateCarousel(false);
});

// Initialize position
updateCarousel(false);
