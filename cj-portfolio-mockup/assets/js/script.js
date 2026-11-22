/* CJ Portfolio: one script; page-specific code only runs on its own page (body[data-page]) */
(function () {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // localStorage wrapper: every access is wrapped in try/catch
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    }
  };

  // Feature 1: light/dark theme toggle, saved in localStorage (all pages)
  function initTheme() {
    const root = document.documentElement;
    const btn = $('#themeToggle');
    const icon = $('i', btn);
    const apply = (theme) => {
      root.setAttribute('data-bs-theme', theme);
      icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
    };
    apply(store.get('cj-theme', 'dark'));
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      store.set('cj-theme', next);
    });
  }

  // Shared by Home and About: fill the photo modal from the photo button that was clicked
  function bindPhotoModal() {
    const modal = $('#photoModal');
    modal.addEventListener('show.bs.modal', (e) => {
      const img = $('img', e.relatedTarget);
      $('#modalImg').src = img.src;
      $('#modalImg').alt = img.alt;
      $('#photoModalLabel').textContent = e.relatedTarget.dataset.caption;
    });
    return modal;
  }

  // Home page carousel: slides on its own; pauses on hover, keyboard focus, or while a photo is enlarged
  function initHomeCarousel() {
    const el = $('#heroCarousel');
    const carousel = bootstrap.Carousel.getOrCreateInstance(el, { ride: false, pause: false });
    const modal = bindPhotoModal();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let hovering = false, modalOpen = false;
    // Pause only for a real mouse hover or keyboard focus, not for taps on a phone
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
    el.addEventListener('pointerleave', () => { hovering = false; });
    el.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) hovering = true; });
    el.addEventListener('focusout', () => { hovering = false; });
    modal.addEventListener('show.bs.modal', () => { modalOpen = true; });
    modal.addEventListener('hidden.bs.modal', () => { modalOpen = false; });
    setInterval(() => {
      if (!reduceMotion && !hovering && !modalOpen && !document.hidden) carousel.next();
    }, 4500);
  }

  // Feature 2: photo modal (Home photos + About cards) uses bindPhotoModal() above

  // Feature 3: Achievements search + category filter + sort by year
  const achievements = [
    { year: 2026, title: '1st Place', event: 'Candelaria MLBB Tournament', category: 'Gaming', icon: 'bi-controller' },
    { year: 2025, title: 'Best Improved Crew', event: 'Jollibee Corporations', category: 'Work', icon: 'bi-people' },
    { year: 2024, title: 'Best in Thesis Manuscript', event: 'College of Engineering, PRMSU', category: 'Academic', icon: 'bi-journal-text' }
  ];
  function initAchievements() {
    const list = $('#achList'), empty = $('#achEmpty'), count = $('#achCount');
    const search = $('#achSearch'), cat = $('#achCategory'), sort = $('#achSort');
    function render() {
      const q = search.value.trim().toLowerCase();
      const rows = achievements
        .filter((a) => (cat.value === 'all' || a.category === cat.value) &&
          `${a.year} ${a.title} ${a.event} ${a.category}`.toLowerCase().includes(q))
        .sort((a, b) => (sort.value === 'newest' ? b.year - a.year : a.year - b.year));
      list.innerHTML = rows.map((a) => `
        <div class="d-flex align-items-center gap-3"><span class="ach-year">${a.year}</span>
        <article class="ach-card flex-grow-1"><strong>${a.title}</strong>${a.event}</article></div>`).join('');
      empty.hidden = rows.length > 0;
      count.textContent = `Showing ${rows.length} of ${achievements.length} achievements`;
    }
    [search, cat, sort].forEach((el) => el.addEventListener('input', render));
    render();
  }

  // Feature 4: Contact form validation + messages saved in localStorage
  const rules = {
    name: (v) => (!v ? 'Name is required.' : v.length < 2 ? 'Name must have at least 2 characters.' : ''),
    email: (v) => (!v ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Enter a valid email, like name@example.com.' : ''),
    message: (v) => (!v ? 'Message is required.' : v.length < 10 ? 'Message must have at least 10 characters.' : '')
  };
  function initContact() {
    const form = $('#contactForm'), ok = $('#formSuccess'), box = $('#savedMessages');
    function check(field) {
      const el = form.elements[field];
      const error = rules[field](el.value.trim());
      el.classList.toggle('is-invalid', !!error);
      el.classList.toggle('is-valid', !error);
      $(`#${field}Feedback`).textContent = error;
      return !error;
    }
    function renderMessages() {
      const msgs = store.get('cj-messages', []);
      box.replaceChildren();
      if (!msgs.length) { box.innerHTML = '<p class="text-body-secondary">No saved messages yet. Send one with the form above.</p>'; return; }
      msgs.forEach((m) => {
        const row = document.createElement('div');
        row.className = 'list-group-item d-flex justify-content-between gap-3';
        const text = document.createElement('div');
        const head = document.createElement('strong'); head.textContent = m.name;
        const meta = document.createElement('div'); meta.className = 'small text-body-secondary'; meta.textContent = `${m.email} on ${m.date}`;
        const body = document.createElement('p'); body.className = 'mb-0'; body.textContent = m.message;
        text.append(head, meta, body);
        const del = document.createElement('button');
        del.type = 'button'; del.className = 'btn btn-sm btn-outline-accent align-self-start'; del.dataset.id = m.id;
        del.innerHTML = '<i class="bi bi-trash" aria-hidden="true"></i><span class="visually-hidden">Delete message</span>';
        row.append(text, del); box.append(row);
      });
    }
    Object.keys(rules).forEach((f) => form.elements[f].addEventListener('blur', () => check(f)));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ok.hidden = true;
      const results = Object.keys(rules).map((f) => [f, check(f)]);
      const bad = results.find((r) => !r[1]);
      if (bad) { form.elements[bad[0]].focus(); return; }
      const msgs = store.get('cj-messages', []);
      msgs.unshift({ id: Date.now(), date: new Date().toLocaleString(),
        name: form.elements.name.value.trim(), email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim() });
      ok.textContent = store.set('cj-messages', msgs) ? 'Message saved. Thank you!' : 'Message sent, but this browser blocked saving it.';
      ok.hidden = false;
      form.reset();
      $$('.is-valid, .is-invalid', form).forEach((el) => el.classList.remove('is-valid', 'is-invalid'));
      renderMessages();
    });
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-id]');
      if (!btn) return;
      store.set('cj-messages', store.get('cj-messages', []).filter((m) => String(m.id) !== btn.dataset.id));
      renderMessages();
    });
    renderMessages();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const page = document.body.dataset.page;
    if (page === 'home') initHomeCarousel();
    if (page === 'about') bindPhotoModal();
    if (page === 'achievements') initAchievements();
    if (page === 'contact') initContact();
  });
})();
