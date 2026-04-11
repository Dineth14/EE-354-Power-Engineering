/* ============================================================
   Sidebar Navigation & Collapsibles
   ============================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------- Mobile menu toggle ---------- */
    var menuBtn = document.querySelector('.menu-toggle');
    var sidebar = document.querySelector('.sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', function () {
        sidebar.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', sidebar.classList.contains('open'));
      });
      // Close sidebar when clicking outside on mobile
      document.addEventListener('click', function (e) {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuBtn) {
          sidebar.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    /* ---------- Menu close button (Ch2-4) ---------- */
    var closeBtn = document.querySelector('.menu-close');
    if (closeBtn && sidebar) {
      closeBtn.addEventListener('click', function () {
        sidebar.classList.remove('open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      });
    }

    /* ---------- Nav section toggle (Ch2-4) ---------- */
    var sectionToggles = document.querySelectorAll('.nav-section-toggle');
    sectionToggles.forEach(function (btn) {
      var content = btn.parentElement.querySelector('.nav-section-content');
      if (content) content.style.display = '';
      btn.setAttribute('aria-expanded', 'true');
    });

    /* ---------- Active nav link ---------- */
    var navLinks = document.querySelectorAll('.sidebar-nav a');
    var currentPath = window.location.pathname;
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') && currentPath.indexOf(link.getAttribute('href').replace(/^\.\.\//, '').replace(/^\.\//,'')) !== -1) {
        link.classList.add('active');
      }
    });

    /* ---------- Collapsible sections ---------- */
    var collapsibles = document.querySelectorAll('.collapsible');
    collapsibles.forEach(function (el) {
      var header = el.querySelector('.collapsible-header');
      if (!header) return;
      header.setAttribute('tabindex', '0');
      header.setAttribute('role', 'button');
      header.setAttribute('aria-expanded', el.classList.contains('open') ? 'true' : 'false');

      function toggle() {
        el.classList.toggle('open');
        header.setAttribute('aria-expanded', el.classList.contains('open') ? 'true' : 'false');
      }

      header.addEventListener('click', toggle);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    /* ---------- Floating TOC highlight on scroll ---------- */
    var tocLinks = document.querySelectorAll('.toc-aside a, nav.toc ol li a');
    if (tocLinks.length > 0) {
      var headings = [];
      tocLinks.forEach(function (a) {
        var id = a.getAttribute('href');
        if (id && id.startsWith('#')) {
          var el = document.getElementById(id.substring(1));
          if (el) headings.push({ el: el, link: a });
        }
      });

      function highlightToc() {
        var scrollY = window.scrollY + 120;
        var current = null;
        for (var i = 0; i < headings.length; i++) {
          if (headings[i].el.offsetTop <= scrollY) current = headings[i];
        }
        tocLinks.forEach(function (l) { l.classList.remove('active'); });
        if (current) current.link.classList.add('active');
      }

      window.addEventListener('scroll', highlightToc, { passive: true });
      highlightToc();
    }

    /* ---------- Progress tracker (landing page) ---------- */
    var progressBars = document.querySelectorAll('[data-progress-chapter]');
    progressBars.forEach(function (bar) {
      var ch = bar.getAttribute('data-progress-chapter');
      var visited = localStorage.getItem('pet-visited-' + ch);
      var fill = bar.querySelector('.fill');
      if (fill) fill.style.width = visited ? '100%' : '0%';
    });

    // Mark current chapter visited
    var chapterMeta = document.querySelector('meta[name="chapter-id"]');
    if (chapterMeta) {
      localStorage.setItem('pet-visited-' + chapterMeta.getAttribute('content'), '1');
    }
  });
})();
