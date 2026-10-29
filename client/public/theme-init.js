// Applies the saved or system theme and language before the page draws, so dark mode never
// flashes white. The full logic lives in src/lib/preferences.tsx.
(function () {
  try {
    var p = JSON.parse(localStorage.getItem('lvf.visitorPrefs') || '{}');
    var dark = p.theme === 'dark' || (p.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    if (p.language) document.documentElement.lang = p.language;
  } catch (e) {}
})();
