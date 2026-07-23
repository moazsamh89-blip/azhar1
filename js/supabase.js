// ============================================================
//  Supabase Configuration & Helper Functions
//  معهد بنين المنصورة النموذجي ع/ث
// ============================================================

// Default fallback keys (used only if nothing is saved in the control panel)
// NOTE: only the PUBLISHABLE/anon key ever belongs here — it is safe for the
// browser. The SECRET key must never be placed in this file or in the admin
// panel's localStorage, since anyone visiting the site could read it.
const DEFAULT_SUPABASE_URL      = "https://iedzpsqtsywqqrvvjawv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_l9Z57vzLaGypxWiW_4WMEw_ymtUIbvS";

const SUPABASE_CONFIG_KEY = 'supabase_config';

/** Read the active Supabase URL/key — from the control panel (localStorage) if set, otherwise the defaults */
function getSupabaseConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY) || 'null');
    if (saved && saved.url && saved.key) return saved;
  } catch (e) {}
  return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY };
}

/** Save new Supabase URL/key from the control panel (takes effect after page reload) */
function setSupabaseConfig(url, key) {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }));
}

/** Clear saved keys and go back to the default project */
function resetSupabaseConfig() {
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
}

const SUPABASE_URL      = getSupabaseConfig().url;
const SUPABASE_ANON_KEY = getSupabaseConfig().key;

// Initialize Supabase client
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =================== UTILITY FUNCTIONS ===================

/** Detect if a URL points to an image */
function isImageUrl(url) {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|svg|bmp)$/.test(clean)) return true;
  if (url.includes('drive.google.com/uc') && url.includes('export=view')) return true;
  if (url.includes('lh3.googleusercontent.com')) return true;
  return false;
}

/** Detect if a URL points to a PDF */
function isPdfUrl(url) {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.pdf');
}

/**
 * Convert any Google Drive share/view link to a direct displayable image URL.
 * Works with:
 *   https://drive.google.com/file/d/FILE_ID/view
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID
 */
function getDriveImageUrl(url) {
  if (!url) return '';
  if (url.includes('lh3.googleusercontent.com') && !url.includes('/d/')) return url;
  
  let fileId = '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    fileId = match[1];
  } else {
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId) {
      fileId = matchId[1];
    }
  }
  
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return url;
}

/** Get a Google Drive file open URL (for viewer) */
function getDriveOpenUrl(url) {
  if (!url) return '#';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/view`;
  return url;
}

/** Get a Google Drive direct download URL */
function getDriveDownloadUrl(url) {
  if (!url) return '#';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  return url;
}

/**
 * Parse multiple image URLs stored as ||| separated string.
 * e.g. "url1|||url2|||url3"
 */
function parseImages(imageStr) {
  if (!imageStr) return [];
  return imageStr.split('|||').map(s => s.trim()).filter(Boolean);
}

/** Join multiple image URLs into a single ||| separated string */
function joinImages(arr) {
  return arr.filter(Boolean).join('|||');
}

/** Format a timestamp as Arabic date */
function formatDateAr(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day:   'numeric'
    });
  } catch { return dateStr; }
}

/** Truncate text to a max length */
function truncate(text, max = 120) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// =================== NEWS ===================

async function getNews({ limit = null, stage = null, category = null } = {}) {
  let q = sb.from('news').select('*').order('created_at', { ascending: false });
  if (limit)    q = q.limit(limit);
  if (stage)    q = q.eq('stage', stage);
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) { console.error('[Supabase] getNews:', error); return []; }
  return data || [];
}

async function getNewsById(id) {
  const { data, error } = await sb.from('news').select('*').eq('id', id).single();
  if (error) { console.error('[Supabase] getNewsById:', error); return null; }
  return data;
}

async function createNews(payload) {
  const { data, error } = await sb.from('news').insert([payload]).select();
  if (error) throw error;
  return data;
}

async function updateNews(id, payload) {
  const { data, error } = await sb.from('news').update(payload).eq('id', id).select();
  if (error) throw error;
  return data;
}

async function deleteNews(id) {
  const { error } = await sb.from('news').delete().eq('id', id);
  if (error) throw error;
}

// =================== DOWNLOADS ===================

async function getDownloads({ limit = null, type = null, stage = null } = {}) {
  let q = sb.from('downloads').select('*').order('created_at', { ascending: false });
  if (limit) q = q.limit(limit);
  if (type)  q = q.eq('type', type);
  if (stage) q = q.eq('stage', stage);
  const { data, error } = await q;
  if (error) { console.error('[Supabase] getDownloads:', error); return []; }
  return data || [];
}

async function createDownload(payload) {
  const { data, error } = await sb.from('downloads').insert([payload]).select();
  if (error) throw error;
  return data;
}

async function updateDownload(id, payload) {
  const { data, error } = await sb.from('downloads').update(payload).eq('id', id).select();
  if (error) throw error;
  return data;
}

async function deleteDownload(id) {
  const { error } = await sb.from('downloads').delete().eq('id', id);
  if (error) throw error;
}

// =================== SHEIKH MESSAGE ===================

async function getSheikhMessage() {
  const { data, error } = await sb.from('sheikh_message').select('*').order('id', { ascending: false }).limit(1);
  if (error) { console.error('[Supabase] getSheikhMessage:', error); return null; }
  return (data && data[0]) || null;
}

async function upsertSheikhMessage(payload) {
  const existing = await getSheikhMessage();
  if (existing) {
    const { data, error } = await sb.from('sheikh_message')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id).select();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await sb.from('sheikh_message').insert([payload]).select();
    if (error) throw error;
    return data;
  }
}

// =================== ABOUT PAGE ===================

async function getAboutPage() {
  const { data, error } = await sb.from('about_page').select('*').order('id', { ascending: false }).limit(1);
  if (error) { console.error('[Supabase] getAboutPage:', error); return null; }
  return (data && data[0]) || null;
}

async function upsertAboutPage(payload) {
  const existing = await getAboutPage();
  if (existing) {
    const { data, error } = await sb.from('about_page')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id).select();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await sb.from('about_page').insert([payload]).select();
    if (error) throw error;
    return data;
  }
}

// =================== AUTH ===================

const LOCAL_AUTH_KEY = 'azhar_admin_session';

// Helper to get allowed credentials
function getAdminCredentials() {
  const email = localStorage.getItem('admin_email') || 'admin@azhar.com';
  const password = localStorage.getItem('admin_password') || '123456';
  return { email: email.trim(), password: password };
}

// Helper to set new credentials (used by the security panel)
function setAdminCredentials(email, password) {
  localStorage.setItem('admin_email', email.trim());
  localStorage.setItem('admin_password', password);
  
  // If logged in, update current session email
  const sessionStr = localStorage.getItem(LOCAL_AUTH_KEY);
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      session.user.email = email.trim();
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(session));
      if (window._authStateCallback) {
        window._authStateCallback('SIGNED_IN', session);
      }
    } catch (e) {}
  }
}

async function signIn(email, password) {
  const creds = getAdminCredentials();
  if (email.trim().toLowerCase() === creds.email.toLowerCase() && password === creds.password) {
    const session = {
      user: {
        email: creds.email,
        id: 'local-admin-id'
      }
    };
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(session));
    if (window._authStateCallback) {
      window._authStateCallback('SIGNED_IN', session);
    }
    return session;
  } else {
    throw new Error('بريد إلكتروني أو كلمة مرور خاطئة');
  }
}

async function signOut() {
  localStorage.removeItem(LOCAL_AUTH_KEY);
  if (window._authStateCallback) {
    window._authStateCallback('SIGNED_OUT', null);
  }
}

async function getCurrentUser() {
  const sessionStr = localStorage.getItem(LOCAL_AUTH_KEY);
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      return session.user;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function onAuthStateChange(cb) {
  window._authStateCallback = cb;
  const sessionStr = localStorage.getItem(LOCAL_AUTH_KEY);
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      setTimeout(() => cb('SIGNED_IN', session), 0);
    } catch (e) {}
  } else {
    setTimeout(() => cb('SIGNED_OUT', null), 0);
  }
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          if (window._authStateCallback === cb) {
            window._authStateCallback = null;
          }
        }
      }
    }
  };
}

// =================== LOGO MANAGEMENT ===================

async function getLogoUrl() {
  const data = await getAboutPage();
  if (data && data.content && data.content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(data.content);
      return parsed.logo_url || '';
    } catch(e) {}
  }
  return '';
}

async function setLogoUrl(url) {
  const existing = await getAboutPage();
  let about_text = '';
  if (existing && existing.content) {
    if (existing.content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(existing.content);
        about_text = parsed.about_text || '';
      } catch(e) {
        about_text = existing.content;
      }
    } else {
      about_text = existing.content;
    }
  }
  const payload = {
    content: JSON.stringify({
      about_text: about_text,
      logo_url: url
    })
  };
  return await upsertAboutPage(payload);
}

// ─── Shared Dynamic Logo Loader ───
async function loadDynamicLogo() {
  try {
    const logoUrl = await getLogoUrl();
    if (logoUrl) {
      const directUrl = getDriveImageUrl(logoUrl);
      
      // Update header/footer logo-emblem
      document.querySelectorAll('.logo-emblem').forEach(el => {
        el.innerHTML = `<img src="${directUrl}" alt="الشعار" style="width:100%;height:100%;object-fit:contain;" referrerpolicy="no-referrer" crossorigin="anonymous" />`;
      });
      
      // Update hero emblem
      document.querySelectorAll('.hero-emblem').forEach(el => {
        el.innerHTML = `<img src="${directUrl}" alt="شعار المعهد" referrerpolicy="no-referrer" crossorigin="anonymous" style="width:100%;height:100%;object-fit:contain;" />`;
      });
    }
  } catch (e) {
    console.error('Failed to load dynamic logo:', e);
  }
}

document.addEventListener('DOMContentLoaded', loadDynamicLogo);
