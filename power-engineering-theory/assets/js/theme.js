/* ============================================================
   Theme Toggle — Dark / Light
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'pet-theme';

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Apply immediately (before content paint)
  applyTheme(getPreferred());

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;

    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-label', 'Toggle dark/light theme');

    function updateAria() {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      toggle.setAttribute('aria-checked', current === 'light' ? 'true' : 'false');
    }
    updateAria();

    toggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      updateAria();
    });

    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle.click();
      }
    });
  });
})();
