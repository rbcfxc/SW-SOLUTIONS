(function () {
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  let state = {
    content: null,
    recentOrders: [],
    categoryFilter: 'all',
    searchQuery: '',
    dirty: false,
  };

  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  let toastTimer;
  function showToast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function markDirty(isDirty = true) {
    state.dirty = isDirty;
    const pill = $('#unsaved-pill');
    if (pill) pill.hidden = !isDirty;
  }

  // Theme
  const themeBtn = $('#admin-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('metsing-theme', next); } catch (e) {}
    });
  }

  // Tabs
  $$('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      $$('.admin-tab').forEach((t) => {
        t.classList.toggle('active', t === btn);
        t.setAttribute('aria-selected', String(t === btn));
      });
      $$('.admin-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${target}`));
    });
  });

  async function checkSession() {
    const res = await fetch('/api/admin/session', { cache: 'no-store' });
    const data = await res.json();
    if (data.authenticated) {
      await loadDashboard();
    } else {
      document.body.classList.add('is-login-view');
      $('#admin-login-view').hidden = false;
      $('#admin-dashboard-view').hidden = true;
      $('#admin-logout-btn').hidden = true;
      if (data.usingDefaultPassword) $('#default-pw-alert').hidden = false;
    }
  }

  async function loadDashboard() {
    const res = await fetch('/api/admin/content', { cache: 'no-store' });
    if (res.status === 401) {
      document.body.classList.add('is-login-view');
      $('#admin-login-view').hidden = false;
      $('#admin-dashboard-view').hidden = true;
      $('#admin-logout-btn').hidden = true;
      return;
    }
    const data = await res.json();
    if (!data.ok) return showToast(data.error || 'Failed to load content');

    state.content = data.content;
    state.recentOrders = data.recentOrders || [];
    document.body.classList.remove('is-login-view');
    $('#admin-login-view').hidden = true;
    $('#admin-dashboard-view').hidden = false;
    $('#admin-logout-btn').hidden = false;
    if (data.usingDefaultPassword) $('#dash-default-pw-banner').hidden = false;
    if (data.dataFile) {
      const modeLabel = data.githubConfigured
        ? 'Permanent (auto-synced to GitHub)'
        : data.hasPersistentDisk
          ? 'Permanent (Render Disk)'
          : 'Temporary on free Render — add GITHUB_TOKEN in Render Environment Variables to make edits permanent across restarts';
      $('#data-file-path').textContent = `Storage: ${modeLabel} (${data.dataFile})`;
    }
    updateLastSavedLabel();
    renderAllEditors();
    markDirty(false);
  }

  function updateLastSavedLabel() {
    const el = $('#last-saved-info');
    if (!el || !state.content) return;
    if (state.content.updatedAt) {
      const d = new Date(state.content.updatedAt);
      el.textContent = `Last published: ${d.toLocaleString('en-ZA')}`;
    } else {
      el.textContent = 'Loaded live content';
    }
  }

  // Login
  $('#admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#login-error');
    const pw = $('#admin-password').value;
    errEl.textContent = '';
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      errEl.textContent = data.error || 'Incorrect password.';
      return;
    }
    $('#admin-password').value = '';
    await loadDashboard();
    showToast('Signed in to Metsing.store Admin');
  });

  // Logout
  $('#admin-logout-btn').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    state.content = null;
    document.body.classList.add('is-login-view');
    $('#admin-dashboard-view').hidden = true;
    $('#admin-login-view').hidden = false;
    $('#admin-logout-btn').hidden = true;
    showToast('Signed out');
  });

  // Render All Editors
  function renderAllEditors() {
    renderProductsEditor();
    renderHomepageEditor();
    renderTestimonialsEditor();
    renderFaqsEditor();
    renderSettingsEditor();
    renderOrders();
  }

  /* ---------------- PRODUCTS EDITOR ---------------- */
  function renderProductsEditor() {
    const list = $('#products-list');
    if (!list || !state.content) return;
    const q = state.searchQuery.trim().toLowerCase();
    const items = state.content.products.filter((p) => {
      if (state.categoryFilter !== 'all' && p.category !== state.categoryFilter) return false;
      if (q && !`${p.name} ${p.id} ${p.description || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });

    if (!items.length) {
      list.innerHTML = '<p class="admin-muted">No products match this filter.</p>';
      return;
    }

    list.innerHTML = items.map((p) => {
      const idx = state.content.products.indexOf(p);
      const isNiche = p.category === 'niche';
      const hasFeatures = Array.isArray(p.features);
      return `
      <div class="product-edit-card ${p.hidden ? 'is-hidden' : ''}" data-pidx="${idx}">
        <div class="pec-head">
          <span class="pec-cat">${esc(p.category)}${p.group ? ` · ${esc(p.group)}` : ''}</span>
          <div style="display:flex;gap:.65rem;align-items:center">
            <label class="toggle-row" style="font-size:.8rem">
              <input type="checkbox" data-pf="hidden" ${p.hidden ? 'checked' : ''} />
              <span>Hidden</span>
            </label>
            <button type="button" class="btn-danger-txt" data-pdel="${idx}">Delete</button>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Name</label>
            <input type="text" data-pf="name" value="${esc(p.name)}" />
          </div>
          <div class="field">
            <label>Price (ZAR)</label>
            <input type="number" min="0" step="1" data-pf="price" value="${Number(p.price) || 0}" />
          </div>
        </div>

        ${isNiche ? `
        <div class="field-row">
          <div class="field"><label>Card Label</label><input type="text" data-pf="label" value="${esc(p.label || '')}" /></div>
          <div class="field"><label>Emoji</label><input type="text" data-pf="emoji" value="${esc(p.emoji || '🛍️')}" /></div>
        </div>` : `
        <div class="field-row">
          <div class="field"><label>Icon / Emoji</label><input type="text" data-pf="icon" value="${esc(p.icon || '')}" /></div>
          <div class="field"><label>Unit (e.g. /month)</label><input type="text" data-pf="unit" value="${esc(p.unit || '')}" /></div>
        </div>`}

        <div class="field-row">
          <div class="field"><label>Badge (e.g. Best value)</label><input type="text" data-pf="badge" value="${esc(p.badge || '')}" /></div>
          <div class="field"><label>Compare-At Price (optional)</label><input type="number" min="0" step="1" data-pf="compareAt" value="${p.compareAt ? Number(p.compareAt) : ''}" /></div>
        </div>

        <div class="field">
          <label>Description</label>
          <textarea rows="2" data-pf="description">${esc(p.description || '')}</textarea>
        </div>

        ${hasFeatures ? `
        <div class="field">
          <label>Features (one per line)</label>
          <textarea rows="4" data-pf="features">${esc((p.features || []).join('\n'))}</textarea>
        </div>` : ''}

        <div style="display:flex;gap:1rem;flex-wrap:wrap">
          <label class="toggle-row" style="font-size:.82rem">
            <input type="checkbox" data-pf="from" ${p.from ? 'checked' : ''} />
            <span>Show "From" price</span>
          </label>
          ${p.category === 'package' ? `
          <label class="toggle-row" style="font-size:.82rem">
            <input type="checkbox" data-pf="featured" ${p.featured ? 'checked' : ''} />
            <span>Featured card</span>
          </label>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  $('#cat-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    state.categoryFilter = btn.dataset.cat;
    $$('#cat-filters .pill').forEach((b) => b.classList.toggle('active', b === btn));
    renderProductsEditor();
  });

  $('#product-search').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderProductsEditor();
  });

  $('#products-list').addEventListener('input', (e) => {
    const card = e.target.closest('[data-pidx]');
    if (!card) return;
    const idx = Number(card.dataset.pidx);
    const p = state.content.products[idx];
    const field = e.target.dataset.pf;
    if (!p || !field) return;

    if (e.target.type === 'checkbox') {
      p[field] = e.target.checked;
      if (field === 'hidden') card.classList.toggle('is-hidden', p.hidden);
    } else if (field === 'price' || field === 'compareAt') {
      const val = e.target.value.trim();
      if (field === 'compareAt' && !val) delete p.compareAt;
      else p[field] = Number(val) || 0;
    } else if (field === 'features') {
      p.features = e.target.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    } else {
      p[field] = e.target.value;
    }
    markDirty(true);
  });

  $('#products-list').addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-pdel]');
    if (!delBtn) return;
    const idx = Number(delBtn.dataset.pdel);
    const p = state.content.products[idx];
    if (!p) return;
    if (!confirm(`Delete "${p.name}"?`)) return;
    state.content.products.splice(idx, 1);
    markDirty(true);
    renderProductsEditor();
  });

  $('#add-product-btn').addEventListener('click', () => {
    const cat = state.categoryFilter !== 'all' ? state.categoryFilter : 'addon';
    const id = `custom-${Date.now().toString(36)}`;
    const newItem = {
      id,
      category: cat,
      name: 'New Service / Product',
      price: 500,
      icon: '✨',
      description: 'Describe what is included.',
    };
    if (cat === 'package') newItem.features = ['Feature 1', 'Feature 2'];
    if (cat === 'niche') {
      newItem.label = 'New Niche';
      newItem.emoji = '🛍️';
      newItem.mini = ['✨', '📦', '⭐'];
      newItem.bg = '#E5ECE8';
      newItem.ink = '#0B3D2E';
    }
    if (cat === 'service') newItem.group = 'key';
    state.content.products.unshift(newItem);
    markDirty(true);
    renderProductsEditor();
    showToast('Added new item at the top of the list');
  });

  /* ---------------- HOMEPAGE EDITOR ---------------- */
  function renderHomepageEditor() {
    const c = state.content;
    const ann = c.settings.announcement || (c.settings.announcement = { enabled: false, text: '', linkText: '', linkUrl: '' });
    $('#ann-enabled').checked = Boolean(ann.enabled);
    $('#ann-text').value = ann.text || '';
    $('#ann-link-text').value = ann.linkText || '';
    $('#ann-link-url').value = ann.linkUrl || '';

    const h = c.hero || {};
    $('#hero-eyebrow').value = h.eyebrow || '';
    $('#hero-title-prefix').value = h.titlePrefix || '';
    $('#hero-title-highlight').value = h.titleHighlight || '';
    $('#hero-subtext').value = h.subtext || '';
    $('#hero-cta').value = h.primaryCta || '';

    const stats = h.stats || [];
    $('#hero-stats-inputs').innerHTML = stats.map((s, i) => `
      <div class="admin-subcard">
        <div class="field"><label>Stat ${i + 1} Value</label><input type="text" data-stat="${i}" data-sf="value" value="${esc(s.value)}" /></div>
        <div class="field"><label>Stat ${i + 1} Label</label><input type="text" data-stat="${i}" data-sf="label" value="${esc(s.label)}" /></div>
      </div>`).join('');

    $('#trust-inputs').innerHTML = (c.trust || []).map((t, i) => `
      <div class="field-row">
        <div class="field"><label>Icon ${i + 1}</label><input type="text" data-trust="${i}" data-tf="icon" value="${esc(t.icon)}" /></div>
        <div class="field"><label>Text ${i + 1}</label><input type="text" data-trust="${i}" data-tf="text" value="${esc(t.text)}" /></div>
      </div>`).join('');

    const ps = c.packagesSection || {};
    $('#pkg-eyebrow').value = ps.eyebrow || '';
    $('#pkg-title').value = ps.title || '';
    $('#pkg-subtitle').value = ps.subtitle || '';

    const fc = c.finalCta || {};
    $('#cta-title').value = fc.title || '';
    $('#cta-subtitle').value = fc.subtitle || '';
    $('#cta-btn').value = fc.primaryBtn || '';

    const hw = c.howItWorks || {};
    $('#how-eyebrow').value = hw.eyebrow || '';
    $('#how-title').value = hw.title || '';
    $('#how-steps-inputs').innerHTML = (hw.steps || []).map((s, i) => `
      <div class="admin-subcard">
        <div class="field"><label>Step ${i + 1} Title</label><input type="text" data-step="${i}" data-stf="title" value="${esc(s.title)}" /></div>
        <div class="field"><label>Step ${i + 1} Description</label><textarea rows="2" data-step="${i}" data-stf="text">${esc(s.text)}</textarea></div>
      </div>`).join('');
  }

  $('#tab-homepage').addEventListener('input', (e) => {
    const c = state.content;
    if (!c) return;
    const id = e.target.id;
    if (id === 'ann-enabled') c.settings.announcement.enabled = e.target.checked;
    else if (id === 'ann-text') c.settings.announcement.text = e.target.value;
    else if (id === 'ann-link-text') c.settings.announcement.linkText = e.target.value;
    else if (id === 'ann-link-url') c.settings.announcement.linkUrl = e.target.value;
    else if (id === 'hero-eyebrow') c.hero.eyebrow = e.target.value;
    else if (id === 'hero-title-prefix') c.hero.titlePrefix = e.target.value;
    else if (id === 'hero-title-highlight') c.hero.titleHighlight = e.target.value;
    else if (id === 'hero-subtext') c.hero.subtext = e.target.value;
    else if (id === 'hero-cta') c.hero.primaryCta = e.target.value;
    else if (id === 'pkg-eyebrow') c.packagesSection.eyebrow = e.target.value;
    else if (id === 'pkg-title') c.packagesSection.title = e.target.value;
    else if (id === 'pkg-subtitle') c.packagesSection.subtitle = e.target.value;
    else if (id === 'cta-title') c.finalCta.title = e.target.value;
    else if (id === 'cta-subtitle') c.finalCta.subtitle = e.target.value;
    else if (id === 'cta-btn') c.finalCta.primaryBtn = e.target.value;
    else if (id === 'how-eyebrow') c.howItWorks.eyebrow = e.target.value;
    else if (id === 'how-title') c.howItWorks.title = e.target.value;
    else if (e.target.dataset.stat !== undefined) {
      c.hero.stats[Number(e.target.dataset.stat)][e.target.dataset.sf] = e.target.value;
    } else if (e.target.dataset.trust !== undefined) {
      c.trust[Number(e.target.dataset.trust)][e.target.dataset.tf] = e.target.value;
    } else if (e.target.dataset.step !== undefined) {
      c.howItWorks.steps[Number(e.target.dataset.step)][e.target.dataset.stf] = e.target.value;
    }
    markDirty(true);
  });

  /* ---------------- TESTIMONIALS & FAQ ---------------- */
  function renderTestimonialsEditor() {
    const tm = state.content.testimonials || { eyebrow: 'Testimonials', title: '', items: [] };
    $('#tm-eyebrow').value = tm.eyebrow || '';
    $('#tm-title').value = tm.title || '';
    $('#testimonials-editor').innerHTML = (tm.items || []).map((t, i) => `
      <div class="admin-subcard" data-tmidx="${i}">
        <div class="pec-head">
          <strong>Testimonial #${i + 1}</strong>
          <button type="button" class="btn-danger-txt" data-tmdel="${i}">Remove</button>
        </div>
        <div class="field-row">
          <div class="field"><label>Customer Name</label><input type="text" data-tmf="name" value="${esc(t.name)}" /></div>
          <div class="field"><label>Role / City</label><input type="text" data-tmf="role" value="${esc(t.role)}" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Initials</label><input type="text" data-tmf="avatar" value="${esc(t.avatar || '')}" /></div>
          <div class="field"><label>Stars (1-5)</label><input type="number" min="1" max="5" data-tmf="stars" value="${Number(t.stars) || 5}" /></div>
        </div>
        <div class="field"><label>Quote</label><textarea rows="2" data-tmf="quote">${esc(t.quote)}</textarea></div>
      </div>`).join('');
  }

  function renderFaqsEditor() {
    const fq = state.content.faqs || { eyebrow: 'FAQ', title: '', items: [] };
    $('#faq-eyebrow').value = fq.eyebrow || '';
    $('#faq-title').value = fq.title || '';
    $('#faqs-editor').innerHTML = (fq.items || []).map((f, i) => `
      <div class="admin-subcard" data-fqidx="${i}">
        <div class="pec-head">
          <strong>FAQ #${i + 1}</strong>
          <button type="button" class="btn-danger-txt" data-fqdel="${i}">Remove</button>
        </div>
        <div class="field"><label>Question</label><input type="text" data-fqf="q" value="${esc(f.q)}" /></div>
        <div class="field"><label>Answer</label><textarea rows="3" data-fqf="a">${esc(f.a)}</textarea></div>
      </div>`).join('');
  }

  $('#tab-social').addEventListener('input', (e) => {
    const c = state.content;
    if (e.target.id === 'tm-eyebrow') c.testimonials.eyebrow = e.target.value;
    else if (e.target.id === 'tm-title') c.testimonials.title = e.target.value;
    else if (e.target.id === 'faq-eyebrow') c.faqs.eyebrow = e.target.value;
    else if (e.target.id === 'faq-title') c.faqs.title = e.target.value;
    else if (e.target.dataset.tmf) {
      const idx = Number(e.target.closest('[data-tmidx]').dataset.tmidx);
      const val = e.target.dataset.tmf === 'stars' ? Number(e.target.value) || 5 : e.target.value;
      c.testimonials.items[idx][e.target.dataset.tmf] = val;
    } else if (e.target.dataset.fqf) {
      const idx = Number(e.target.closest('[data-fqidx]').dataset.fqidx);
      c.faqs.items[idx][e.target.dataset.fqf] = e.target.value;
    }
    markDirty(true);
  });

  $('#tab-social').addEventListener('click', (e) => {
    if (e.target.id === 'add-testimonial-btn') {
      state.content.testimonials.items.push({ stars: 5, quote: 'Great service!', name: 'Customer Name', role: 'Store Owner · SA', avatar: 'CN' });
      markDirty(true);
      renderTestimonialsEditor();
    } else if (e.target.dataset.tmdel !== undefined) {
      state.content.testimonials.items.splice(Number(e.target.dataset.tmdel), 1);
      markDirty(true);
      renderTestimonialsEditor();
    } else if (e.target.id === 'add-faq-btn') {
      state.content.faqs.items.push({ q: 'New question?', a: 'Answer here.' });
      markDirty(true);
      renderFaqsEditor();
    } else if (e.target.dataset.fqdel !== undefined) {
      state.content.faqs.items.splice(Number(e.target.dataset.fqdel), 1);
      markDirty(true);
      renderFaqsEditor();
    }
  });

  /* ---------------- SETTINGS EDITOR ---------------- */
  function renderSettingsEditor() {
    const s = state.content.settings || {};
    $('#set-wa-num').value = s.whatsappNumber || '';
    $('#set-wa-display').value = s.whatsappDisplay || '';
    $('#set-email').value = s.email || '';
    $('#set-currency').value = s.currency || 'R';
    $('#set-footer-tag').value = s.footerTag || '';
  }

  $('#tab-settings').addEventListener('input', (e) => {
    const s = state.content.settings;
    if (e.target.id === 'set-wa-num') s.whatsappNumber = e.target.value.replace(/\D/g, '');
    else if (e.target.id === 'set-wa-display') s.whatsappDisplay = e.target.value;
    else if (e.target.id === 'set-email') s.email = e.target.value.trim();
    else if (e.target.id === 'set-currency') s.currency = e.target.value;
    else if (e.target.id === 'set-footer-tag') s.footerTag = e.target.value;
    markDirty(true);
  });

  /* ---------------- RECENT ORDERS ---------------- */
  function renderOrders() {
    const list = $('#orders-list');
    if (!list) return;
    if (!state.recentOrders.length) {
      list.innerHTML = '<p class="admin-muted">No Stitch online orders recorded in this server session yet.</p>';
      return;
    }
    list.innerHTML = state.recentOrders.map((o) => `
      <div class="admin-subcard">
        <div class="pec-head">
          <strong>${esc(o.externalReference || o.id)}</strong>
          <strong>R${Number(o.totalZAR || 0)}</strong>
        </div>
        <div class="admin-muted" style="margin:0">
          ${esc(o.customer?.name || '')} &middot; ${esc(o.customer?.phone || '')} &middot; ${esc(o.customer?.email || '')}
        </div>
        <div>${(o.items || []).map((i) => `${esc(i.name)} &times; ${i.qty}`).join(', ')}</div>
      </div>`).join('');
  }

  $('#refresh-orders-btn').addEventListener('click', loadDashboard);

  /* ---------------- SAVE & PUBLISH ---------------- */
  $('#save-all-btn').addEventListener('click', async () => {
    const btn = $('#save-all-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.content),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save');
      state.content = data.content;
      markDirty(false);
      updateLastSavedLabel();
      if (data.persistedToGitHub) {
        showToast('✓ Live website updated & saved permanently to GitHub!');
      } else if (data.githubError) {
        showToast(`Saved live, but GitHub sync failed: ${data.githubError}`);
      } else {
        showToast('✓ Live website updated! (Add GITHUB_TOKEN in Render for permanent storage)');
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & Publish Live';
    }
  });

  /* ---------------- BACKUP & RESTORE ---------------- */
  $('#export-json-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metsing-site-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#import-json-input').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.products)) throw new Error('Invalid backup JSON file.');
      state.content = parsed;
      renderAllEditors();
      markDirty(true);
      showToast('Backup loaded! Click "Save & Publish Live" to apply.');
    } catch (err) {
      showToast(err.message);
    }
    e.target.value = '';
  });

  $('#reset-defaults-btn').addEventListener('click', async () => {
    if (!confirm('Reset all products, prices and homepage text back to original defaults?')) return;
    const res = await fetch('/api/admin/reset', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      state.content = data.content;
      renderAllEditors();
      markDirty(false);
      updateLastSavedLabel();
      showToast('Reset to original defaults.');
    } else {
      showToast(data.error || 'Reset failed.');
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  checkSession();
})();
