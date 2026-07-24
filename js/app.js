// ============================================================
//  app.js – Shared Frontend Logic
//  معهد بنين المنصورة النموذجي ع/ث
// ============================================================

// ─── Header scroll effect ───
const siteHeader = document.getElementById('siteHeader');
if (siteHeader) {
  window.addEventListener('scroll', () => {
    siteHeader.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ─── Mobile menu ───
const menuToggle = document.getElementById('menuToggle');
const mobileNav  = document.getElementById('mobileNav');
if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menuToggle.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', open);
  });
  // Close on nav link click
  mobileNav.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      menuToggle.classList.remove('open');
    });
  });
  // Close on outside click
  document.addEventListener('click', e => {
    if (!mobileNav.contains(e.target) && !menuToggle.contains(e.target)) {
      mobileNav.classList.remove('open');
      menuToggle.classList.remove('open');
    }
  });
}

// ─── Back to top ───
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ─── Scroll reveal ───
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  els.forEach(el => io.observe(el));
}
document.addEventListener('DOMContentLoaded', initReveal);

// ─── Lightbox ───
let lbImages = [];
let lbIndex  = 0;

const lbOverlay = document.getElementById('lightbox');
const lbImg     = document.getElementById('lbImg');
const lbCounter = document.getElementById('lbCounter');
const lbPrev    = document.getElementById('lbPrev');
const lbNext    = document.getElementById('lbNext');
const lbClose   = document.getElementById('lbClose');

function openLightbox(images, startIndex = 0) {
  lbImages = images;
  lbIndex  = startIndex;
  showLbImage();
  lbOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function showLbImage() {
  const url = getDriveFullImageUrl(lbImages[lbIndex]);
  lbImg.src = url;
  lbImg.alt = `صورة ${lbIndex + 1}`;
  if (lbCounter) lbCounter.textContent = lbImages.length > 1 ? `${lbIndex + 1} / ${lbImages.length}` : '';
  if (lbPrev) lbPrev.style.display = lbImages.length > 1 ? 'flex' : 'none';
  if (lbNext) lbNext.style.display = lbImages.length > 1 ? 'flex' : 'none';
}

function closeLightbox() {
  lbOverlay && lbOverlay.classList.remove('open');
  document.body.style.overflow = '';
  if (lbImg) lbImg.src = '';
}

if (lbClose)   lbClose.addEventListener('click', closeLightbox);
if (lbOverlay) lbOverlay.addEventListener('click', e => { if (e.target === lbOverlay) closeLightbox(); });
if (lbPrev)    lbPrev.addEventListener('click', () => { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; showLbImage(); });
if (lbNext)    lbNext.addEventListener('click', () => { lbIndex = (lbIndex + 1) % lbImages.length; showLbImage(); });

document.addEventListener('keydown', e => {
  if (!lbOverlay || !lbOverlay.classList.contains('open')) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowRight') { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; showLbImage(); }
  if (e.key === 'ArrowLeft')  { lbIndex = (lbIndex + 1) % lbImages.length; showLbImage(); }
});

/** Called by elements with data-lb attribute */
function handleLbClick(e) {
  const el = e.currentTarget;
  try {
    const images = JSON.parse(el.dataset.lb);
    const index  = parseInt(el.dataset.lbIndex || '0');
    openLightbox(images, index);
  } catch {}
}

// ─── Card Builders ───

/**
 * Build a news card HTML string.
 * The `news.image` field stores image URLs joined by |||
 */
function buildNewsCard(n) {
  const images  = parseImages(n.image);
  const hasImg  = images.length > 0;
  const imgUrls = JSON.stringify(images).replace(/"/g, '&quot;');

  let imgHtml = '';
  if (hasImg) {
    const displayUrl = getDriveThumbUrl(images[0]);
    imgHtml = `
      <div class="news-img-wrap" data-lb="${imgUrls}" data-lb-index="0" role="button" tabindex="0" aria-label="فتح الصورة">
        <img src="${displayUrl}" alt="${escHtml(n.title)}" loading="lazy"
             referrerpolicy="no-referrer"
             onerror="this.parentElement.innerHTML='<div class=\\'news-img-placeholder\\'>📰</div>'" />
        <span class="news-category">${escHtml(n.category || 'أخبار')}</span>
        ${images.length > 1 ? `<span class="news-img-count">🖼 ${images.length}</span>` : ''}
      </div>`;
  } else {
    imgHtml = `<div class="news-img-placeholder">📰 <span class="news-category" style="position:relative;top:0;right:0;margin-top:.5rem;">${escHtml(n.category || 'أخبار')}</span></div>`;
  }

  let contentHtml = '';
  if (n.content) {
    if (n.content.length > 120) {
      const shortText = truncate(n.content, 120);
      contentHtml = `
        <div class="news-content-wrap">
          <p class="news-excerpt short-text">${escHtml(shortText)}</p>
          <p class="news-excerpt full-text" style="display:none; text-align:justify;">${escHtml(n.content).replace(/\n/g, '<br>')}</p>
          <button class="btn-read-more" onclick="toggleReadMore(this)" style="background:none; border:none; color:var(--green); font-weight:700; cursor:pointer; padding:0; margin-top:.4rem; font-size:.82rem; font-family:inherit;">عرض المزيد ←</button>
        </div>`;
    } else {
      contentHtml = `<p class="news-excerpt" style="text-align:justify;">${escHtml(n.content).replace(/\n/g, '<br>')}</p>`;
    }
  }

  return `
    <article class="news-card reveal">
      ${imgHtml}
      <div class="news-body">
        <div class="news-date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formatDateAr(n.created_at)}
        </div>
        ${n.title ? `<h3 class="news-title">${escHtml(n.title)}</h3>` : ''}
        ${contentHtml}
      </div>
    </article>`;
}

function toggleReadMore(btn) {
  const wrap = btn.closest('.news-content-wrap');
  const shortText = wrap.querySelector('.short-text');
  const fullText = wrap.querySelector('.full-text');
  if (fullText.style.display === 'none') {
    fullText.style.display = 'block';
    shortText.style.display = 'none';
    btn.textContent = 'عرض أقل ↑';
  } else {
    fullText.style.display = 'none';
    shortText.style.display = 'block';
    btn.textContent = 'عرض المزيد ←';
  }
}

/**
 * Build a download card HTML string.
 * Detects image vs PDF from file_url.
 */
function buildDlCard(d) {
  const url       = d.file_url || '';
  const thumbUrl  = getDriveThumbUrl(url);
  const fullUrl   = getDriveFullImageUrl(url);
  const openUrl   = getDriveOpenUrl(url);
  const dlUrl     = getDriveDownloadUrl(url);
  const isImg     = isImageUrl(url);
  const isPdf     = !isImg;

  const typeLabels = { books: 'كتاب', exams: 'امتحان', results: 'نتيجة' };
  const typeIcons  = { books: 'book', exams: 'exam', result: 'result' };

  let mediaHtml = '';
  if (isImg) {
    mediaHtml = `
      <img src="${thumbUrl}" alt="${escHtml(d.title)}" class="dl-card-img"
           data-lb='["${fullUrl}"]' data-lb-index="0"
           loading="lazy" referrerpolicy="no-referrer"
           onerror="this.style.display='none'" />`;
  }

  let iconClass = 'pdf';
  if (d.type === 'books')   iconClass = 'book';
  if (d.type === 'exams')   iconClass = 'exam';
  if (d.type === 'results') iconClass = 'result';

  return `
    <div class="dl-card reveal">
      <div class="dl-card-top">
        <div class="dl-icon ${isImg ? 'image' : iconClass}">
          ${isImg ? '🖼️' : (isPdf ? '📄' : '📁')}
        </div>
        <div class="dl-info">
          <div class="dl-title">${escHtml(d.title)}</div>
          ${d.description ? `<div class="dl-desc">${escHtml(truncate(d.description, 80))}</div>` : ''}
        </div>
      </div>
      ${mediaHtml}
      <div class="dl-tags">
        ${d.type  ? `<span class="dl-tag type">${typeLabels[d.type] || d.type}</span>` : ''}
        ${d.stage ? `<span class="dl-tag stage">${escHtml(d.stage)}</span>` : ''}
      </div>
      <div class="dl-actions">
        ${isImg
          ? `<button class="btn btn-green btn-sm" data-lb='["${fullUrl}"]' data-lb-index="0">🔍 عرض الصورة</button>`
          : `<a href="${openUrl}" target="_blank" rel="noopener" class="btn btn-green btn-sm">📂 فتح الملف</a>
             <a href="${dlUrl}"  target="_blank" rel="noopener" class="btn btn-ghost btn-sm">⬇️ تحميل</a>`}
      </div>
    </div>`;
}

// ─── Helpers ───
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Attach event listeners after dynamic DOM changes
document.addEventListener('click', e => {
  const el = e.target.closest('[data-lb]');
  if (el && !e.defaultPrevented) {
    e.preventDefault();
    try {
      const images = JSON.parse(el.dataset.lb.replace(/&quot;/g, '"'));
      const index  = parseInt(el.dataset.lbIndex || '0');
      openLightbox(images, index);
    } catch {}
  }
});


