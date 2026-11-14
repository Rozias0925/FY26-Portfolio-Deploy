(() => {
  'use strict';
  const language = new URL(window.location.href).searchParams.get('lang') === 'en' ? 'en' : 'zh';
  window.GUIDE_LANGUAGE = language;
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-Hant';

  const toggle = document.getElementById('language-toggle');
  function updateLanguageLink() {
    const target = new URL(window.location.href);
    target.searchParams.set('lang', language === 'en' ? 'zh' : 'en');
    toggle.href = target.href;
  }
  toggle.textContent = language === 'en' ? '中文' : 'EN';
  toggle.lang = language === 'en' ? 'zh-Hant' : 'en';
  toggle.hreflang = toggle.lang;
  toggle.setAttribute('aria-label', language === 'en' ? 'Switch to Traditional Chinese' : '切換至英文');
  updateLanguageLink();
  window.addEventListener('hashchange', updateLanguageLink);

  if (language !== 'en') return;
  const text = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };
  const label = (selector, value) => document.querySelector(selector)?.setAttribute('aria-label', value);
  document.title = 'Graph-Based Portfolio API & Deployment System — ML Engineering Project Record';
  document.querySelector('meta[name="description"]').content = 'An ML engineering project record covering FastAPI, Streamlit, a synthetic graph pipeline, Docker deployment, and verified execution results.';
  text('.skip-link', 'Skip to main content');
  label('.brand', 'Project home');
  label('.page-directory', 'Page navigation');
  text('#page-previous .adjacent-label', '← Previous');
  text('#page-next .adjacent-label', 'Next →');
  text('#page-next strong', 'Project background and objectives');
  text('#directory-toggle > span:last-child', 'Contents');
  label('#directory-toggle', 'Open chapter contents');
  text('#directory-title', 'Chapter contents');
  text('.directory-heading > a', 'Project home ↗');
  text('.directory-extras a[href="#implementation"]', 'Local implementation →');
  text('.directory-extras a[href="#reproduce"]', 'Setup and reproduction →');
  document.querySelector('.directory-glossary').firstChild.textContent = 'Technical glossary ';
  text('.initial-message', 'Loading the project guide…');
  text('.site-footer a[href="https://rozias0925.github.io/FY26-Graph-Portfolio/"]', 'Factor GCN research ↗');
  text('.site-footer a[href="#chapter-9"]', 'Results and next steps ↗');
})();
