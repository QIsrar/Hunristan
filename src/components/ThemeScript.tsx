export function ThemeScript() {
  const script = `
    (function() {
      function getStoredTheme() {
        try {
          const stored = localStorage.getItem('theme');
          return stored && ['dark', 'light', 'auto'].includes(stored) ? stored : 'auto';
        } catch {
          return 'auto';
        }
      }
      
      function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      function resolveTheme(theme) {
        return theme === 'auto' ? getSystemTheme() : theme;
      }
      
      function applyTheme(resolved) {
        if (resolved === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      const theme = getStoredTheme();
      const resolved = resolveTheme(theme);
      applyTheme(resolved);
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
