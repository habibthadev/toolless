import { layout, nav } from "./layout.ts";

const icons = {
  bolt: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  chart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  cursor: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>`,
  shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
  globe: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  code: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  arrowRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
};

export function homePage(isAuthenticated = false, userName?: string) {
  return layout(
    `
    ${nav(isAuthenticated, userName)}
    
    <main>
      <section style="min-height: 100dvh; display: flex; align-items: center; padding-top: 64px;">
        <div class="container">
          <div style="display: grid; grid-template-columns: 1fr; gap: 64px; align-items: center;" class="hero-grid">
            <div class="fade-in" style="max-width: 560px;">
              <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 8px; background: var(--accent-subtle); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 100px; font-size: 13px; font-weight: 500; color: var(--accent-light); margin-bottom: 24px;">
                <span style="width: 6px; height: 6px; background: var(--accent); border-radius: 50%;"></span>
                ${isAuthenticated ? "Welcome back" : "Now with advanced analytics"}
              </div>
              <h1 style="font-size: clamp(40px, 6vw, 56px); font-weight: 700; line-height: 1.05; margin-bottom: 20px;">
                ${isAuthenticated ? `Ready to shorten<br/>your <span style="color: var(--accent-light);">next link</span>?` : `Short links,<br/><span style="color: var(--accent-light);">big insights</span>`}
              </h1>
              <p style="font-size: 17px; line-height: 1.7; color: var(--text-secondary); margin-bottom: 32px; max-width: 480px;">
                ${isAuthenticated ? "Create trackable short links, monitor performance, and gain insights from your audience in real-time." : "Transform long URLs into concise, trackable links. Monitor clicks, analyze traffic sources, and optimize your campaigns with real-time data."}
              </p>
              <div class="hero-cta" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                <a href="${isAuthenticated ? "/dashboard" : "/register"}" class="btn btn-lg btn-primary" style="box-shadow: 0 4px 16px -2px var(--accent-glow);">
                  ${isAuthenticated ? "Go to dashboard" : "Get started"}
                  ${icons.arrowRight}
                </a>
                ${!isAuthenticated ? `<a href="/login" class="btn btn-lg btn-secondary">Sign in</a>` : ""}
                ${!isAuthenticated ? `<span class="hero-subtext" style="font-size: 13px; color: var(--text-muted); margin-left: 8px;">No credit card required</span>` : ""}
              </div>
            </div>
            <div class="fade-in stagger-2 hero-visual" style="position: relative;">
              <div style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 16px; padding: 20px; position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent);"></div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56;"></div>
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e;"></div>
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #27ca40;"></div>
                </div>
                <div style="font-family: var(--font-mono); font-size: 13px;">
                  <div style="color: var(--text-muted); margin-bottom: 12px;">$ snip create</div>
                  <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <span style="color: var(--text-muted);">URL:</span>
                    <span style="color: var(--text-secondary);">https://example.com/very-long-path/to/resource</span>
                  </div>
                  <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <span style="color: var(--text-muted);">Code:</span>
                    <span style="color: var(--accent-light);">launch24</span>
                  </div>
                  <div style="padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border);">
                    <div style="color: var(--success); margin-bottom: 4px;">Link created</div>
                    <div style="color: var(--text);">snip.io/<span style="color: var(--accent-light);">launch24</span></div>
                  </div>
                </div>
              </div>
              <div style="position: absolute; top: 50%; right: -40px; transform: translateY(-50%); width: 200px; height: 200px; background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%); pointer-events: none; z-index: -1;"></div>
            </div>
          </div>
        </div>
      </section>

      <section style="padding: 120px 0; background: var(--bg-subtle); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
        <div class="container">
          <div style="max-width: 560px; margin-bottom: 64px;">
            <h2 style="font-size: clamp(32px, 4vw, 40px); margin-bottom: 16px;">Built for performance</h2>
            <p style="font-size: 17px; color: var(--text-secondary); line-height: 1.7;">
              Everything you need to manage, track, and optimize your links at scale.
            </p>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px;" class="features-grid">
            <div style="grid-column: span 3; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: border-color 0.2s;" class="feature-card">
              <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--accent-subtle); border-radius: 12px; color: var(--accent-light); margin-bottom: 20px;">
                ${icons.bolt}
              </div>
              <h3 style="font-size: 20px; margin-bottom: 8px;">Instant redirects</h3>
              <p style="color: var(--text-secondary); line-height: 1.6;">
                Edge-optimized infrastructure delivers sub-50ms redirects globally. No delays, no downtime.
              </p>
            </div>
            
            <div style="grid-column: span 3; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: border-color 0.2s;" class="feature-card">
              <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--accent-subtle); border-radius: 12px; color: var(--accent-light); margin-bottom: 20px;">
                ${icons.chart}
              </div>
              <h3 style="font-size: 20px; margin-bottom: 8px;">Real-time analytics</h3>
              <p style="color: var(--text-secondary); line-height: 1.6;">
                Track clicks, geographic data, referrers, and devices. Make data-driven decisions.
              </p>
            </div>
            
            <div style="grid-column: span 2; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: border-color 0.2s;" class="feature-card">
              <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--accent-subtle); border-radius: 12px; color: var(--accent-light); margin-bottom: 20px;">
                ${icons.cursor}
              </div>
              <h3 style="font-size: 20px; margin-bottom: 8px;">Custom slugs</h3>
              <p style="color: var(--text-secondary); line-height: 1.6;">
                Create memorable, branded short codes.
              </p>
            </div>
            
            <div style="grid-column: span 2; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: border-color 0.2s;" class="feature-card">
              <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--accent-subtle); border-radius: 12px; color: var(--accent-light); margin-bottom: 20px;">
                ${icons.shield}
              </div>
              <h3 style="font-size: 20px; margin-bottom: 8px;">Enterprise security</h3>
              <p style="color: var(--text-secondary); line-height: 1.6;">
                SSL encryption and DDoS protection.
              </p>
            </div>
            
            <div style="grid-column: span 2; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: border-color 0.2s;" class="feature-card">
              <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--accent-subtle); border-radius: 12px; color: var(--accent-light); margin-bottom: 20px;">
                ${icons.globe}
              </div>
              <h3 style="font-size: 20px; margin-bottom: 8px;">Global CDN</h3>
              <p style="color: var(--text-secondary); line-height: 1.6;">
                Distributed across 200+ edge locations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style="padding: 120px 0;">
        <div class="container">
          <div style="max-width: 600px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: clamp(32px, 4vw, 40px); margin-bottom: 16px;">
              ${isAuthenticated ? "Start creating" : "Ready to shorten?"}
            </h2>
            <p style="font-size: 17px; color: var(--text-secondary); margin-bottom: 32px; line-height: 1.7;">
              ${isAuthenticated ? "Open your dashboard and create your first shortened link." : "Join developers and marketers who trust Snip for their link management."}
            </p>
            <a href="${isAuthenticated ? "/dashboard" : "/register"}" class="btn btn-lg btn-primary">
              ${isAuthenticated ? "Go to dashboard" : "Create free account"}
              ${icons.arrowRight}
            </a>
          </div>
        </div>
      </section>

      <footer style="border-top: 1px solid var(--border); padding: 48px 0;">
        <div class="container">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px;">
            <div style="display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 16px;">
              <svg viewBox="0 0 28 28" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="28" height="28" rx="7" fill="url(#footer-grad)"/>
                <path d="M9 14h4m0 0h4m-4 0v-4m0 4v4" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <defs>
                  <linearGradient id="footer-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#3b82f6"/>
                    <stop offset="1" stop-color="#1e40af"/>
                  </linearGradient>
                </defs>
              </svg>
              Snip
            </div>
            <div style="font-size: 13px; color: var(--text-muted);">
              Built with Hono &amp; Toolless
            </div>
          </div>
        </div>
      </footer>
    </main>
    
    <style>
      .feature-card:hover {
        border-color: rgba(255, 255, 255, 0.12);
      }
      
      @media (prefers-color-scheme: light) {
        .feature-card:hover {
          border-color: rgba(0, 0, 0, 0.12);
        }
      }
      
      @media (min-width: 1024px) {
        .hero-grid {
          grid-template-columns: 1fr 1fr !important;
        }
      }
      
      @media (max-width: 1023px) {
        .hero-visual {
          display: none;
        }
      }
      
      @media (max-width: 768px) {
        .features-grid {
          grid-template-columns: 1fr !important;
        }
        
        .features-grid > div {
          grid-column: span 1 !important;
        }
        
        .hero-cta {
          flex-direction: column;
          align-items: stretch !important;
        }
        
        .hero-cta .btn {
          width: 100%;
        }
        
        .hero-subtext {
          margin-left: 0 !important;
          text-align: center;
        }
      }
    </style>
  `,
    "Snip - Link Shortener with Analytics"
  );
}
