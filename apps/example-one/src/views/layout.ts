export function layout(content: string, title = "Snip") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --bg: #0a0a0a;
      --bg-subtle: #111111;
      --bg-muted: #171717;
      --bg-elevated: #1c1c1c;
      --border: rgba(255, 255, 255, 0.06);
      --border-subtle: rgba(255, 255, 255, 0.04);
      --border-focus: rgba(59, 130, 246, 0.5);
      --text: #fafafa;
      --text-secondary: #a1a1a1;
      --text-muted: #525252;
      --accent: #3b82f6;
      --accent-light: #60a5fa;
      --accent-dark: #1e40af;
      --accent-subtle: rgba(59, 130, 246, 0.12);
      --accent-glow: rgba(59, 130, 246, 0.25);
      --error: #f43f5e;
      --error-subtle: rgba(244, 63, 94, 0.12);
      --success: #10b981;
      --success-subtle: rgba(16, 185, 129, 0.12);
      --font-sans: 'Outfit', system-ui, -apple-system, sans-serif;
      --font-mono: 'Geist Mono', 'SF Mono', Consolas, monospace;
      --ease: cubic-bezier(0.4, 0, 0.2, 1);
      --ease-out: cubic-bezier(0, 0, 0.2, 1);
    }
    
    html[data-theme="light"] {
      --bg: #ffffff;
      --bg-subtle: #f9fafb;
      --bg-muted: #f3f4f6;
      --bg-elevated: #eeeff5;
      --border: rgba(0, 0, 0, 0.06);
      --border-subtle: rgba(0, 0, 0, 0.04);
      --text: #111827;
      --text-secondary: #6b7280;
      --text-muted: #9ca3af;
    }
    
    @media (prefers-color-scheme: light) {
      html:not([data-theme]) {
        --bg: #ffffff;
        --bg-subtle: #f9fafb;
        --bg-muted: #f3f4f6;
        --bg-elevated: #eeeff5;
        --border: rgba(0, 0, 0, 0.06);
        --border-subtle: rgba(0, 0, 0, 0.04);
        --text: #111827;
        --text-secondary: #6b7280;
        --text-muted: #9ca3af;
      }
    }
    
    html {
      scroll-behavior: smooth;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    
    body {
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.6;
      font-weight: 400;
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.025em;
      text-wrap: balance;
    }
    
    code, pre, .mono {
      font-family: var(--font-mono);
    }
    
    a {
      color: inherit;
      text-decoration: none;
    }
    
    button {
      font-family: inherit;
    }

    .container {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 24px;
    }
    
    @media (min-width: 640px) {
      .container { padding: 0 32px; }
    }
    
    @media (min-width: 1024px) {
      .container { padding: 0 48px; }
    }

    .nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background: rgba(10, 10, 10, 0.85);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border-bottom: 1px solid var(--border);
    }
    
    html[data-theme="light"] .nav {
      background: rgba(255, 255, 255, 0.85);
    }
    
    @media (prefers-color-scheme: light) {
      html:not([data-theme]) .nav {
        background: rgba(255, 255, 255, 0.85);
      }
    }
    
    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      gap: 24px;
    }
    
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 18px;
      letter-spacing: -0.02em;
      transition: opacity 0.2s var(--ease);
    }
    
    .nav-brand:hover {
      opacity: 0.8;
    }
    
    .nav-brand svg {
      width: 28px;
      height: 28px;
    }
    
    .nav-menu {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .nav-link {
      padding: 8px 14px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      border-radius: 8px;
      transition: color 0.15s var(--ease), background 0.15s var(--ease);
    }
    
    .nav-link:hover {
      color: var(--text);
      background: var(--bg-muted);
    }
    
    .nav-link:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }
    
    .nav-user {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
    }
    
    .nav-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    
    .nav-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      padding: 0 18px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      transition: transform 0.15s var(--ease), background 0.15s var(--ease), box-shadow 0.15s var(--ease), opacity 0.15s var(--ease);
      white-space: nowrap;
      user-select: none;
    }
    
    .btn:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }
    
    .btn:active {
      transform: scale(0.98);
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background: var(--accent);
      color: white;
      font-weight: 600;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: var(--accent-light);
      box-shadow: 0 0 24px var(--accent-glow);
    }
    
    .btn-secondary {
      background: var(--bg-muted);
      color: var(--text);
      border: 1px solid var(--border);
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: var(--bg-elevated);
      border-color: rgba(255, 255, 255, 0.1);
    }
    
    .btn-ghost {
      background: transparent;
      color: var(--text-secondary);
    }
    
    .btn-ghost:hover:not(:disabled) {
      color: var(--text);
      background: var(--bg-muted);
    }
    
    .btn-danger {
      background: var(--error-subtle);
      color: var(--error);
      border: 1px solid transparent;
    }
    
    .btn-danger:hover:not(:disabled) {
      background: var(--error);
      color: white;
    }
    
    .btn-sm {
      height: 34px;
      padding: 0 12px;
      font-size: 13px;
      border-radius: 8px;
    }
    
    .btn-lg {
      height: 48px;
      padding: 0 28px;
      font-size: 15px;
      border-radius: 12px;
    }
    
    .btn-icon {
      width: 40px;
      padding: 0;
    }
    
    .btn-icon.btn-sm {
      width: 34px;
    }

    .card {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }
    
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    
    .form-input {
      width: 100%;
      height: 44px;
      padding: 0 14px;
      font-size: 14px;
      font-family: inherit;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
    }
    
    .form-input::placeholder {
      color: var(--text-muted);
    }
    
    .form-input:hover:not(:focus) {
      border-color: rgba(255, 255, 255, 0.1);
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-subtle);
    }
    
    .form-hint {
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      font-size: 14px;
      margin-bottom: 20px;
      animation: alertIn 0.25s var(--ease-out);
    }
    
    @keyframes alertIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .alert-error {
      background: var(--error-subtle);
      color: var(--error);
      border: 1px solid rgba(244, 63, 94, 0.2);
    }
    
    .alert-success {
      background: var(--success-subtle);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    
    .alert svg {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    thead {
      background: var(--bg-muted);
      position: sticky;
      top: 0;
      z-index: 1;
    }
    
    thead th {
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    
    tbody td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle);
      vertical-align: middle;
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    tbody tr {
      transition: background 0.1s var(--ease);
    }
    
    tbody tr:hover {
      background: var(--bg-subtle);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    .fade-in {
      animation: fadeIn 0.5s var(--ease-out);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .stagger-1 { animation-delay: 0.05s; }
    .stagger-2 { animation-delay: 0.1s; }
    .stagger-3 { animation-delay: 0.15s; }
    .stagger-4 { animation-delay: 0.2s; }

    @media (max-width: 1024px) {
      .container { padding: 0 24px; }
    }

    @media (max-width: 768px) {
      .hide-mobile { display: none !important; }
      .nav-inner { height: 56px; gap: 12px; }
      .nav-brand span { display: none; }
      .btn-lg { height: 44px; padding: 0 20px; font-size: 14px; }
      .container { padding: 0 16px; }
    }
    
    @media (max-width: 480px) {
      .nav-name { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>
<body>
  ${content}
  
  <script>
    (function() {
      const html = document.documentElement;
      const toggle = document.getElementById('theme-toggle');
      const lightIcon = document.querySelector('.theme-icon-light');
      const darkIcon = document.querySelector('.theme-icon-dark');
      
      function getTheme() {
        const stored = localStorage.getItem('theme');
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      function setTheme(theme) {
        const isDark = theme === 'dark';
        html.setAttribute('data-theme', theme);
        html.style.colorScheme = theme;
        localStorage.setItem('theme', theme);
        if (lightIcon && darkIcon) {
          lightIcon.style.display = isDark ? 'none' : 'block';
          darkIcon.style.display = isDark ? 'block' : 'none';
        }
      }
      
      const currentTheme = getTheme();
      setTheme(currentTheme);
      
      if (toggle) {
        toggle.addEventListener('click', function() {
          const current = html.getAttribute('data-theme') || 'dark';
          setTheme(current === 'dark' ? 'light' : 'dark');
        });
      }
    })();
  </script>
</body>
</html>`;
}

const logoSvg = `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="28" height="28" rx="7" fill="url(#logo-grad)"/>
  <path d="M9 14h4m0 0h4m-4 0v-4m0 4v4" stroke="white" stroke-width="2" stroke-linecap="round"/>
  <defs>
    <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
      <stop stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1e40af"/>
    </linearGradient>
  </defs>
</svg>`;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function nav(isAuthenticated = false, userName?: string) {
  const initials = userName ? getInitials(userName) : "";

  return `
  <nav class="nav" role="navigation" aria-label="Main navigation">
    <div class="container">
      <div class="nav-inner">
        <a href="/" class="nav-brand" aria-label="Snip home">
          ${logoSvg}
          <span>Snip</span>
        </a>
        <div class="nav-menu">
          ${
            isAuthenticated
              ? `
            <a href="/dashboard" class="nav-link">Dashboard</a>
            <div class="nav-user">
              <div class="nav-avatar" aria-hidden="true">${initials}</div>
              <span class="nav-name">${userName}</span>
            </div>
            <form action="/logout" method="POST">
              <button type="submit" class="btn btn-sm btn-ghost" aria-label="Sign out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span class="hide-mobile">Sign Out</span>
              </button>
            </form>
          `
              : `
            <a href="/login" class="nav-link">Sign In</a>
            <a href="/register" class="btn btn-sm btn-primary">Get Started</a>
          `
          }
          <button id="theme-toggle" class="btn btn-sm btn-secondary" aria-label="Toggle theme" title="Toggle light/dark mode">
            <svg class="theme-icon-light" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg class="theme-icon-dark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </nav>`;
}
