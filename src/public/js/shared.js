// ── API Helper ────────────────────────────────────────────────────────────────
async function api(url, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      toast(err.error || 'Request failed', 'error');
      return null;
    }
    return res.json();
  } catch (e) {
    console.error(e);
    toast('Network error', 'error');
    return null;
  }
}

// ── Toast Notifications ───────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = 'all 0.3s'; }, 2800);
  setTimeout(() => el.remove(), 3200);
}
