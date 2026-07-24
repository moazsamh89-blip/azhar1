// ============================================================
//  admin.js – Admin Panel Logic
//  معهد بنين المنصورة النموذجي ع/ث
// ============================================================

// ─── State ───
let editingNewsId     = null;
let editingDlId       = null;

// ─── Auth ───
async function checkAuth() {
  const user = await getCurrentUser();
  if (!user) {
    document.getElementById('adminLogin').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
    const loginEmail = document.getElementById('loginEmail');
    if (loginEmail && !loginEmail.value) loginEmail.value = await getAdminEmail();
  } else {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    document.getElementById('adminUserEmail').textContent = user.email;
    loadPanel('news');
  }
}

onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    document.getElementById('adminUserEmail').textContent = session.user.email;
    loadPanel('news');
  } else if (event === 'SIGNED_OUT') {
    document.getElementById('adminLogin').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
  }
});

// ─── Force logout everywhere when the password changes ───
// If the admin password gets changed (from this tab or any other tab/
// device), every other open session should stop working and be sent back
// to the login screen automatically instead of silently keeping the old
// (now-invalid) session alive.
let _sessionWatchInterval = null;

async function runSessionWatch() {
  const user = await getCurrentUser();
  if (!user) return;
  await watchSessionVersion();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') runSessionWatch();
});
window.addEventListener('focus', runSessionWatch);

// Same-browser tabs get notified instantly: signOut()/bumpSessionVersion()
// write to localStorage, which fires a 'storage' event in every *other* tab.
window.addEventListener('storage', e => {
  if (e.key === 'azhar_admin_session_version' || e.key === 'azhar_admin_session') {
    runSessionWatch();
  }
});

// Other devices are caught by periodic polling.
if (!_sessionWatchInterval) {
  _sessionWatchInterval = setInterval(runSessionWatch, 20000);
}

document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');
  const err      = document.getElementById('loginError');
  btn.disabled   = true;
  btn.textContent = 'جارٍ تسجيل الدخول...';
  err.style.display = 'none';
  try {
    await signIn(email, password);
  } catch (ex) {
    err.style.display = 'flex';
    err.textContent = '⚠️ ' + (ex.message === 'Invalid login credentials' ? 'بريد إلكتروني أو كلمة مرور خاطئة' : ex.message);
    btn.disabled = false;
    btn.textContent = 'تسجيل الدخول';
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  if (confirm('هل تريد تسجيل الخروج؟')) await signOut();
});

// ─── Panel Navigation ───
function loadPanel(name) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
  const panel = document.getElementById('panel-' + name);
  const item  = document.querySelector(`[data-panel="${name}"]`);
  if (panel) panel.classList.add('active');
  if (item)  item.classList.add('active');
  document.getElementById('panelTitle').textContent = item?.dataset.label || '';

  if      (name === 'news')     loadNewsPanel();
  else if (name === 'downloads') loadDlPanel();
  else if (name === 'sheikh')   loadSheikhPanel();
  else if (name === 'about')    loadAboutPanel();
  else if (name === 'logo')     loadLogoPanel();
  else if (name === 'security') loadSecurityPanel();
  else if (name === 'supabase') loadSupabasePanel();
}

document.querySelectorAll('.admin-nav-item').forEach(item => {
  item.addEventListener('click', () => loadPanel(item.dataset.panel));
});

// ═══════════════════════════════════════════
//  NEWS PANEL
// ═══════════════════════════════════════════

async function loadNewsPanel() {
  const tbody = document.getElementById('newsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner" style="margin:1rem auto;"></div></td></tr>';
  const news = await getNews();
  if (!news.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">📰</div><h3>لا توجد أخبار</h3></div></td></tr>';
    return;
  }
  tbody.innerHTML = news.map(n => {
    const images = parseImages(n.image);
    const thumb  = images.length ? `<img src="${getDriveImageUrl(images[0])}" alt="صورة" referrerpolicy="no-referrer" onerror="this.src=''" />` : '—';
    return `<tr>
      <td>${thumb}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escAdm(n.title)}</td>
      <td>${escAdm(n.category || '—')}</td>
      <td>${escAdm(n.stage || '—')}</td>
      <td>${formatDateAr(n.created_at)}</td>
      <td>
        <div class="tbl-actions">
          <button class="btn btn-green btn-sm" onclick="editNews(${n.id})">✏️ تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="deleteNewsItem(${n.id})">🗑️ حذف</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openNewsModal(mode = 'add', data = null) {
  editingNewsId = data?.id || null;
  document.getElementById('newsModalTitle').textContent = mode === 'add' ? 'إضافة خبر جديد' : 'تعديل الخبر';
  document.getElementById('newsTitleInput').value       = data?.title    || '';
  document.getElementById('newsContentInput').value     = data?.content  || '';
  document.getElementById('newsCategoryInput').value    = data?.category || 'أخبار';
  document.getElementById('newsStageInput').value       = data?.stage    || '';

  // Populate image inputs
  const images = parseImages(data?.image);
  renderNewsImageInputs(images.length ? images : ['']);
  openModal('newsModal');
}

function renderNewsImageInputs(urls = ['']) {
  const wrap = document.getElementById('newsImgInputs');
  wrap.innerHTML = urls.map((url, i) => `
    <div class="img-input-row" id="imgRow${i}">
      <input type="text" class="form-control news-img-url" placeholder="رابط Google Drive للصورة ${i+1}" value="${escAdm(url)}"
             oninput="previewNewsImg(this, ${i})" />
      <button type="button" class="btn btn-danger btn-sm" onclick="removeImgRow(${i})" title="حذف">✕</button>
    </div>
    <div id="imgPreview${i}" class="img-preview" style="margin-bottom:.5rem;">
      ${url ? `<img src="${getDriveImageUrl(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" referrerpolicy="no-referrer" onerror="this.style.display='none'" />` : ''}
    </div>`).join('');
}

function previewNewsImg(input, index) {
  const url = input.value.trim();
  const prev = document.getElementById('imgPreview' + index);
  if (!prev) return;
  if (url) {
    prev.innerHTML = `<img src="${getDriveImageUrl(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`;
  } else {
    prev.innerHTML = '';
  }
}

function removeImgRow(index) {
  document.getElementById('imgRow' + index)?.remove();
  document.getElementById('imgPreview' + index)?.remove();
}

document.getElementById('addImgBtn')?.addEventListener('click', () => {
  const urls = getNewsImageUrls();
  renderNewsImageInputs([...urls, '']);
});

function getNewsImageUrls() {
  return [...document.querySelectorAll('.news-img-url')]
    .map(i => i.value.trim())
    .filter(Boolean);
}

document.getElementById('newsForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('newsSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  const payload = {
    title   : document.getElementById('newsTitleInput').value.trim()   || null,
    content : document.getElementById('newsContentInput').value.trim() || null,
    category: document.getElementById('newsCategoryInput').value       || 'أخبار',
    stage   : document.getElementById('newsStageInput').value          || null,
    image   : joinImages(getNewsImageUrls())                           || null,
  };

  try {
    if (editingNewsId) {
      await updateNews(editingNewsId, payload);
      showAdminAlert('تم تعديل الخبر بنجاح ✅', 'success');
    } else {
      await createNews(payload);
      showAdminAlert('تم إضافة الخبر بنجاح ✅', 'success');
    }
    closeModal('newsModal');
    loadNewsPanel();
  } catch (ex) {
    showAdminAlert('خطأ: ' + ex.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ';
  }
});

async function editNews(id) {
  const n = await getNewsById(id);
  if (n) openNewsModal('edit', n);
}

async function deleteNewsItem(id) {
  if (!confirm('هل تريد حذف هذا الخبر نهائياً؟')) return;
  try {
    await deleteNews(id);
    showAdminAlert('تم حذف الخبر بنجاح', 'success');
    loadNewsPanel();
  } catch (ex) {
    showAdminAlert('خطأ: ' + ex.message, 'error');
  }
}

document.getElementById('addNewsBtn')?.addEventListener('click', () => openNewsModal('add'));

// ═══════════════════════════════════════════
//  DOWNLOADS PANEL
// ═══════════════════════════════════════════

async function loadDlPanel() {
  const tbody = document.getElementById('dlTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner" style="margin:1rem auto;"></div></td></tr>';
  const items = await getDownloads();
  const typeLabels = { books: 'كتاب', exams: 'امتحان', results: 'نتيجة' };
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="icon">📁</div><h3>لا توجد تحميلات</h3></div></td></tr>';
    return;
  }
  tbody.innerHTML = items.map(d => {
    const isImg = isImageUrl(d.file_url);
    const thumb = isImg
      ? `<img src="${getDriveImageUrl(d.file_url)}" alt="صورة" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
      : `<span style="font-size:1.5rem;">📄</span>`;
    return `<tr>
      <td>${thumb}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escAdm(d.title)}</td>
      <td>${typeLabels[d.type] || d.type || '—'}</td>
      <td>${escAdm(d.stage || '—')}</td>
      <td>
        <div class="tbl-actions">
          <button class="btn btn-green btn-sm" onclick="editDl(${d.id})">✏️ تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDlItem(${d.id})">🗑️ حذف</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openDlModal(mode = 'add', data = null) {
  editingDlId = data?.id || null;
  document.getElementById('dlModalTitle').textContent   = mode === 'add' ? 'إضافة ملف جديد' : 'تعديل الملف';
  document.getElementById('dlTitleInput').value         = data?.title       || '';
  document.getElementById('dlDescInput').value          = data?.description || '';
  document.getElementById('dlTypeInput').value          = data?.type        || 'books';
  document.getElementById('dlStageInput').value         = data?.stage       || '';
  const fileUrl = data?.file_url || '';
  document.getElementById('dlUrlInput').value           = fileUrl;
  updateDlPreview(fileUrl);
  openModal('dlModal');
}

function updateDlPreview(url) {
  const prev = document.getElementById('dlPreviewArea');
  if (!url) { prev.innerHTML = ''; return; }
  if (isImageUrl(url)) {
    prev.innerHTML = `<img src="${getDriveImageUrl(url)}" class="img-preview-single" referrerpolicy="no-referrer" onerror="this.style.display='none'" alt="معاينة" />`;
  } else {
    prev.innerHTML = `<div style="padding:1rem;background:#FEE2E2;border-radius:8px;color:#DC2626;display:flex;align-items:center;gap:.5rem;">📄 ملف PDF – <a href="${getDriveOpenUrl(url)}" target="_blank" rel="noopener">فتح في Google Drive</a></div>`;
  }
}

document.getElementById('dlUrlInput')?.addEventListener('input', e => updateDlPreview(e.target.value.trim()));

document.getElementById('dlForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('dlSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  const payload = {
    title      : document.getElementById('dlTitleInput').value.trim(),
    description: document.getElementById('dlDescInput').value.trim()  || null,
    file_url   : document.getElementById('dlUrlInput').value.trim(),
    type       : document.getElementById('dlTypeInput').value         || 'books',
    stage      : document.getElementById('dlStageInput').value        || null,
  };

  if (!payload.title || !payload.file_url) {
    showAdminAlert('العنوان والرابط مطلوبان', 'error');
    btn.disabled = false;
    btn.textContent = 'حفظ';
    return;
  }

  try {
    if (editingDlId) {
      await updateDownload(editingDlId, payload);
      showAdminAlert('تم تعديل الملف بنجاح ✅', 'success');
    } else {
      await createDownload(payload);
      showAdminAlert('تم إضافة الملف بنجاح ✅', 'success');
    }
    closeModal('dlModal');
    loadDlPanel();
  } catch (ex) {
    showAdminAlert('خطأ: ' + ex.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ';
  }
});

async function editDl(id) {
  const items = await getDownloads();
  const d = items.find(x => x.id === id);
  if (d) openDlModal('edit', d);
}

async function deleteDlItem(id) {
  if (!confirm('هل تريد حذف هذا الملف نهائياً؟')) return;
  try {
    await deleteDownload(id);
    showAdminAlert('تم حذف الملف بنجاح', 'success');
    loadDlPanel();
  } catch (ex) {
    showAdminAlert('خطأ: ' + ex.message, 'error');
  }
}

document.getElementById('addDlBtn')?.addEventListener('click', () => openDlModal('add'));

// ═══════════════════════════════════════════
//  SHEIKH PANEL
// ═══════════════════════════════════════════

async function loadSheikhPanel() {
  const msg = await getSheikhMessage();
  if (msg) {
    document.getElementById('sheikhNameInput').value    = msg.sheikh_name || '';
    document.getElementById('sheikhMsgInput').value     = msg.message     || '';
    document.getElementById('sheikhImgInput').value     = msg.image       || '';
    updateSheikhImgPreview(msg.image || '');
  }
}

function updateSheikhImgPreview(url) {
  const prev = document.getElementById('sheikhImgPreview');
  if (!url) { prev.innerHTML = ''; return; }
  prev.innerHTML = `<img src="${getDriveImageUrl(url)}" class="img-preview-single" style="max-height:200px;width:auto;" referrerpolicy="no-referrer" onerror="this.style.display='none'" alt="معاينة صورة الشيخ" />`;
}

document.getElementById('sheikhImgInput')?.addEventListener('input', e => updateSheikhImgPreview(e.target.value.trim()));

document.getElementById('sheikhForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('sheikhSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  const payload = {
    sheikh_name: document.getElementById('sheikhNameInput').value.trim() || null,
    message    : document.getElementById('sheikhMsgInput').value.trim(),
    image      : document.getElementById('sheikhImgInput').value.trim()  || null,
  };

  if (!payload.message) {
    showAdminAlert('نص الكلمة مطلوب', 'error');
    btn.disabled = false;
    btn.textContent = 'حفظ التغييرات';
    return;
  }

  try {
    await upsertSheikhMessage(payload);
    showAdminAlert('تم حفظ كلمة الشيخ بنجاح ✅', 'success');
  } catch (ex) {
    showAdminAlert('خطأ: ' + ex.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ التغييرات';
  }
});

// ═══════════════════════════════════════════
//  ABOUT PANEL
// ═══════════════════════════════════════════

async function loadAboutPanel() {
  const data = await getAboutPage();
  if (data) {
    let content = data.content || '';
    if (content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        content = parsed.about_text || '';
      } catch(e) {}
    }
    document.getElementById('aboutContentInput').value = content;
  }
}

document.getElementById('aboutForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('aboutSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  const text = document.getElementById('aboutContentInput').value.trim();
  if (!text) {
    showAdminAlert('المحتوى مطلوب', 'error');
    btn.disabled = false;
    btn.textContent = 'حفظ التغييرات';
    return;
  }

  try {
    const existing = await getAboutPage();
    let logo_url = '';
    if (existing && existing.content && existing.content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(existing.content);
        logo_url = parsed.logo_url || '';
      } catch(e) {}
    }
    const payload = {
      content: JSON.stringify({
        about_text: text,
        logo_url: logo_url
      })
    };
    await upsertAboutPage(payload);
    showAdminAlert('تم حفظ محتوى الصفحة بنجاح ✅', 'success');
  } catch (ex) {
    showAdminAlert('خطأ: ' + ex.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ التغييرات';
  }
});

// ═══════════════════════════════════════════
//  LOGO PANEL
// ═══════════════════════════════════════════
async function loadLogoPanel() {
  const logoUrl = await getLogoUrl();
  document.getElementById('logoUrlInput').value = logoUrl || '';
  updateLogoPreview(logoUrl || '');
}

function updateLogoPreview(url) {
  const prev = document.getElementById('logoPreview');
  if (!url) { prev.innerHTML = ''; return; }
  prev.innerHTML = `<img src="${getDriveImageUrl(url)}" class="img-preview-single" style="max-height:120px;width:120px;object-fit:cover;border-radius:50%;border:3px solid var(--gold);box-shadow:0 4px 12px rgba(0,0,0,0.15);background:#fff;padding:4px;" referrerpolicy="no-referrer" onerror="this.style.display='none'" alt="معاينة اللوجو" />`;
}

document.getElementById('logoUrlInput')?.addEventListener('input', e => updateLogoPreview(e.target.value.trim()));

document.getElementById('logoForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('logoSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';
  const url = document.getElementById('logoUrlInput').value.trim();
  try {
    await setLogoUrl(url);
    showAdminAlert('تم حفظ اللوجو بنجاح ✅', 'success');
    loadDynamicLogo();
  } catch (ex) {
    showAdminAlert('خطأ: ' + ex.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ التغييرات';
  }
});

// ═══════════════════════════════════════════
//  SUPABASE KEYS PANEL
// ═══════════════════════════════════════════
function loadSupabasePanel() {
  const cfg = getSupabaseConfig();
  const urlInput = document.getElementById('supabaseUrlInput');
  const keyInput = document.getElementById('supabaseKeyInput');
  if (urlInput) urlInput.value = cfg.url;
  if (keyInput) keyInput.value = cfg.key;
}

document.getElementById('supabaseForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const url = document.getElementById('supabaseUrlInput').value.trim();
  const key = document.getElementById('supabaseKeyInput').value.trim();
  const btn = document.getElementById('supabaseSubmitBtn');

  if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
    showAdminAlert('⚠️ رابط المشروع غير صحيح، يجب أن يكون بالشكل https://xxxx.supabase.co', 'error');
    return;
  }
  if (key.length < 20) {
    showAdminAlert('⚠️ مفتاح API غير صحيح', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  setSupabaseConfig(url, key);
  showAdminAlert('تم حفظ المفاتيح بنجاح ✅ جارٍ إعادة التحميل...', 'success');
  setTimeout(() => window.location.reload(), 1200);
});

document.getElementById('supabaseResetBtn')?.addEventListener('click', () => {
  if (!confirm('هل تريد استعادة مفاتيح Supabase الافتراضية؟')) return;
  resetSupabaseConfig();
  showAdminAlert('تم استعادة الإعدادات الافتراضية ✅ جارٍ إعادة التحميل...', 'success');
  setTimeout(() => window.location.reload(), 1200);
});

// ═══════════════════════════════════════════
//  SECURITY PANEL
// ═══════════════════════════════════════════
async function loadSecurityPanel() {
  const emailInput = document.getElementById('adminEmailInput');
  if (emailInput) {
    emailInput.value = await getAdminEmail();
  }
}

document.getElementById('securityForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const emailInput = document.getElementById('adminEmailInput');
  const currentPass = document.getElementById('currentPasswordInput').value;
  const newPass = document.getElementById('newPasswordInput').value;
  const confirmPass = document.getElementById('confirmPasswordInput').value;
  const btn = document.getElementById('securitySubmitBtn');

  if (newPass !== confirmPass) {
    showAdminAlert('⚠️ كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error');
    return;
  }

  if (newPass.length < 6) {
    showAdminAlert('⚠️ يجب أن تتكون كلمة المرور الجديدة من 6 أحرف أو أرقام على الأقل', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  try {
    const currentUser = await getCurrentUser();
    await changeAdminCredentials(currentUser.email, currentPass, emailInput.value.trim(), newPass);
    showAdminAlert('تم تغيير بيانات الدخول بنجاح ✅ سيتم تسجيل خروج أي جلسة أخرى مفتوحة في لوحة التحكم تلقائيًا', 'success');

    // Clear inputs
    document.getElementById('currentPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';
  } catch (ex) {
    showAdminAlert('⚠️ ' + ex.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ التغييرات';
  }
});

// ─── Modal helpers ───
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal-overlay')?.classList.remove('open');
  });
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ─── Alerts ───
function showAdminAlert(msg, type = 'info') {
  const container = document.getElementById('adminAlerts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ─── Utility ───
function escAdm(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadDynamicLogo();
});
