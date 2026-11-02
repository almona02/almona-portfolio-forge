/* Apply the saved palette before first paint. Keep in sync with AppThemeProvider. */
(function () {
  var preference = 'system';
  try {
    var saved = localStorage.getItem('theme');
    if (saved === null) {
      var legacy = JSON.parse(localStorage.getItem('almona_fabricator_ui_preferences') || 'null');
      var previous = legacy && legacy.state && legacy.state.theme;
      if (previous === 'light' || previous === 'dark') saved = previous;
    }
    if (saved === 'light' || saved === 'dark' || saved === 'system') preference = saved;
    // Normalize corrupt preferences so the provider cannot restore an unknown class.
    if (saved !== null) localStorage.setItem('theme', preference);
  } catch (_) { /* Restricted storage must not block rendering. */ }
  var dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(dark ? 'dark' : 'light');
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
})();
