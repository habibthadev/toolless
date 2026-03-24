import { layout, nav } from "./layout.ts";
import type { Link } from "../lib/db.ts";

const icons = {
  link: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  click: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>`,
  trend: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  external: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  empty: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  alertError: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  alertSuccess: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
};

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export function dashboardPage(userName: string, links: Link[], error?: string, success?: string) {
  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const avgClicks = links.length > 0 ? Math.round(totalClicks / links.length) : 0;

  return layout(
    `
    ${nav(true, userName)}
    
    <main style="padding-top: 64px; min-height: 100dvh;">
      <div class="container" style="padding-top: 40px; padding-bottom: 80px;">
        ${error ? `<div class="alert alert-error" role="alert">${icons.alertError}<span>${error}</span></div>` : ""}
        ${success ? `<div class="alert alert-success" role="status">${icons.alertSuccess}<span>${success}</span></div>` : ""}
        
        <header style="margin-bottom: 40px;" class="fade-in">
          <h1 style="font-size: 32px; font-weight: 600; margin-bottom: 6px;">Dashboard</h1>
          <p style="color: var(--text-secondary); font-size: 15px;">Manage and track your shortened links</p>
        </header>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 40px;" class="stats-grid fade-in stagger-1">
          <div style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--accent-subtle); border-radius: 8px; color: var(--accent-light);">
                ${icons.link}
              </div>
              <span style="font-size: 13px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">Total Links</span>
            </div>
            <div style="font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums;">${formatNumber(links.length)}</div>
          </div>
          
          <div style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--accent-subtle); border-radius: 8px; color: var(--accent-light);">
                ${icons.click}
              </div>
              <span style="font-size: 13px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">Total Clicks</span>
            </div>
            <div style="font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums;">${formatNumber(totalClicks)}</div>
          </div>
          
          <div style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--accent-subtle); border-radius: 8px; color: var(--accent-light);">
                ${icons.trend}
              </div>
              <span style="font-size: 13px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">Avg. Clicks</span>
            </div>
            <div style="font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums;">${formatNumber(avgClicks)}</div>
          </div>
        </div>
        
        <section style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 40px;" class="fade-in stagger-2">
          <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 20px;">Create new link</h2>
          <form method="POST" action="/dashboard/create">
            <div style="display: grid; gap: 16px;" class="create-form-grid">
              <div class="form-group" style="margin-bottom: 0; grid-column: 1 / -1;">
                <label class="form-label" for="targetUrl">Destination URL</label>
                <input 
                  type="url" 
                  id="targetUrl" 
                  name="targetUrl" 
                  class="form-input" 
                  placeholder="https://example.com/your-long-url"
                  required 
                  autocomplete="url"
                />
              </div>
              
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="title">Title <span style="color: var(--text-muted); font-weight: 400;">(optional)</span></label>
                <input 
                  type="text" 
                  id="title" 
                  name="title"
                  class="form-input" 
                  placeholder="Campaign name"
                />
              </div>
              
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="customCode">Custom slug <span style="color: var(--text-muted); font-weight: 400;">(optional)</span></label>
                <input 
                  type="text" 
                  id="customCode" 
                  name="customCode" 
                  class="form-input mono" 
                  placeholder="my-link"
                  pattern="[a-zA-Z0-9_-]{3,20}"
                  autocomplete="off"
                  spellcheck="false"
                />
                <p class="form-hint">3-20 characters: letters, numbers, hyphens, underscores</p>
              </div>
            </div>
            
            <div style="margin-top: 20px;">
              <button type="submit" class="btn btn-primary">
                ${icons.plus}
                Create link
              </button>
            </div>
          </form>
        </section>
        
        <section class="fade-in stagger-3">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h2 style="font-size: 18px; font-weight: 600;">Your links</h2>
            <span style="font-size: 13px; color: var(--text-muted);">${links.length} ${links.length === 1 ? "link" : "links"}</span>
          </div>
          
          ${
            links.length === 0
              ? `
            <div style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 16px; padding: 64px 24px; text-align: center;">
              <div style="color: var(--text-muted); margin-bottom: 16px;">${icons.empty}</div>
              <p style="color: var(--text-secondary); font-size: 15px; margin-bottom: 4px;">No links yet</p>
              <p style="color: var(--text-muted); font-size: 14px;">Create your first link using the form above</p>
            </div>
          `
              : `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width: 40%;">Link</th>
                    <th>Destination</th>
                    <th style="width: 100px; text-align: right;">Clicks</th>
                    <th style="width: 120px;"></th>
                  </tr>
                </thead>
                <tbody>
                  ${links
                    .map(
                      (link) => `
                    <tr>
                      <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <a href="/${link.shortCode}" target="_blank" rel="noopener" style="color: var(--accent-light); font-weight: 500; font-family: var(--font-mono); font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.15s;">
                            /${link.shortCode}
                            ${icons.external}
                          </a>
                        </div>
                        ${link.title ? `<div style="margin-top: 4px; font-size: 13px; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${link.title}</div>` : ""}
                      </td>
                      <td>
                        <div style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); font-size: 13px;">
                          ${link.targetUrl}
                        </div>
                      </td>
                      <td style="text-align: right;">
                        <span style="font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text);">${formatNumber(link.clicks)}</span>
                      </td>
                      <td>
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                          <button 
                            type="button"
                            onclick="copyLink('${link.shortCode}', this)" 
                            class="btn btn-sm btn-secondary btn-icon"
                            aria-label="Copy link"
                            title="Copy link"
                          >
                            ${icons.copy}
                          </button>
                          <form method="POST" action="/dashboard/delete/${link._id}" style="display: contents;">
                            <button 
                              type="submit" 
                              class="btn btn-sm btn-danger btn-icon" 
                              onclick="return confirm('Delete this link? This cannot be undone.')"
                              aria-label="Delete link"
                              title="Delete link"
                            >
                              ${icons.trash}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </section>
      </div>
    </main>
    
    <style>
      .stats-grid {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .create-form-grid {
        grid-template-columns: 1fr 1fr;
      }
      
      @media (max-width: 1024px) {
        .stats-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        
        .stats-grid > div:nth-child(3) {
          grid-column: 1 / -1;
        }
        
        .create-form-grid {
          grid-template-columns: 1fr !important;
        }
      }
      
      @media (max-width: 768px) {
        .stats-grid {
          grid-template-columns: 1fr !important;
        }
        
        .stats-grid > div {
          grid-column: span 1 !important;
        }
        
        .create-form-grid > div {
          grid-column: span 1 !important;
        }
      }
      
      @media (max-width: 640px) {
        .table-wrap {
          margin: 0 -16px;
          border-radius: 0;
          border-left: none;
          border-right: none;
        }
        
        thead th:nth-child(2),
        tbody td:nth-child(2) {
          display: none;
        }
      }
    </style>
    
    <script>
      function copyLink(shortCode, btn) {
        const url = location.origin + '/' + shortCode;
        navigator.clipboard.writeText(url).then(function() {
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          btn.style.background = 'var(--success-subtle)';
          btn.style.color = 'var(--success)';
          btn.style.borderColor = 'transparent';
          setTimeout(function() {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
          }, 1500);
        });
      }
    </script>
  `,
    "Dashboard - Snip"
  );
}
