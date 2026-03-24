import { layout } from "./layout.ts";

const logoSvg = `<svg viewBox="0 0 32 32" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="url(#auth-logo-grad)"/>
  <path d="M10 16h5m0 0h5m-5 0v-5m0 5v5" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  <defs>
    <linearGradient id="auth-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1e40af"/>
    </linearGradient>
  </defs>
</svg>`;

const alertIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

export function loginPage(error?: string) {
  return layout(
    `
    <div style="min-height: 100dvh; display: flex; flex-direction: column;">
      <div style="position: fixed; inset: 0; z-index: -1; overflow: hidden;">
        <div style="position: absolute; top: -20%; left: -10%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%);"></div>
        <div style="position: absolute; bottom: -20%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(124, 58, 237, 0.06) 0%, transparent 70%);"></div>
      </div>
      
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px 24px;">
        <div style="width: 100%; max-width: 400px;" class="fade-in">
          <div style="text-align: center; margin-bottom: 40px;">
            <a href="/" style="display: inline-block; margin-bottom: 32px;" aria-label="Back to home">
              ${logoSvg}
            </a>
            <h1 style="font-size: 28px; font-weight: 600; margin-bottom: 8px;">
              Welcome back
            </h1>
            <p style="color: var(--text-secondary); font-size: 15px;">
              Sign in to your account to continue
            </p>
          </div>
          
          ${error ? `<div class="alert alert-error" role="alert">${alertIcon}<span>${error}</span></div>` : ""}
          
          <div class="card">
            <form method="POST" action="/login" novalidate>
              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  class="form-input" 
                  placeholder="you@company.com"
                  required 
                  autocomplete="email"
                  autofocus
                  spellcheck="false"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  class="form-input" 
                  placeholder="Enter your password"
                  required 
                  autocomplete="current-password"
                />
              </div>
              
              <button type="submit" class="btn btn-primary" style="width: 100%; height: 44px; margin-top: 8px;">
                Sign in
              </button>
            </form>
          </div>
          
          <p style="text-align: center; margin-top: 24px; color: var(--text-secondary); font-size: 14px;">
            No account yet? 
            <a href="/register" style="color: var(--accent-light); font-weight: 500; transition: color 0.15s;">
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
    "Sign In - Snip"
  );
}

export function registerPage(error?: string) {
  return layout(
    `
    <div style="min-height: 100dvh; display: flex; flex-direction: column;">
      <div style="position: fixed; inset: 0; z-index: -1; overflow: hidden;">
        <div style="position: absolute; top: -20%; left: -10%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%);"></div>
        <div style="position: absolute; bottom: -20%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(124, 58, 237, 0.06) 0%, transparent 70%);"></div>
      </div>
      
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px 24px;">
        <div style="width: 100%; max-width: 400px;" class="fade-in">
          <div style="text-align: center; margin-bottom: 40px;">
            <a href="/" style="display: inline-block; margin-bottom: 32px;" aria-label="Back to home">
              ${logoSvg}
            </a>
            <h1 style="font-size: 28px; font-weight: 600; margin-bottom: 8px;">
              Create your account
            </h1>
            <p style="color: var(--text-secondary); font-size: 15px;">
              Start shortening links in seconds
            </p>
          </div>
          
          ${error ? `<div class="alert alert-error" role="alert">${alertIcon}<span>${error}</span></div>` : ""}
          
          <div class="card">
            <form method="POST" action="/register" novalidate>
              <div class="form-group">
                <label class="form-label" for="name">Full name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  class="form-input" 
                  placeholder="Alex Rivera"
                  required 
                  autocomplete="name"
                  autofocus
                />
              </div>
              
              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  class="form-input" 
                  placeholder="you@company.com"
                  required 
                  autocomplete="email"
                  spellcheck="false"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  class="form-input" 
                  placeholder="Min. 8 characters"
                  required 
                  autocomplete="new-password"
                  minlength="8"
                />
                <p class="form-hint">
                  Use 8 or more characters with a mix of letters and numbers
                </p>
              </div>
              
              <button type="submit" class="btn btn-primary" style="width: 100%; height: 44px; margin-top: 8px;">
                Create account
              </button>
            </form>
          </div>
          
          <p style="text-align: center; margin-top: 24px; color: var(--text-secondary); font-size: 14px;">
            Already have an account? 
            <a href="/login" style="color: var(--accent-light); font-weight: 500; transition: color 0.15s;">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
    "Create Account - Snip"
  );
}
