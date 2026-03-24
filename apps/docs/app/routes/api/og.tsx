import { createFileRoute } from "@tanstack/react-router";

const SIZE = {
  width: 1200,
  height: 630,
} as const;

function getQueryValue(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : fallback;
}

export const Route = createFileRoute("/api/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Lazy load @vercel/og to avoid SSR bundle issues
        const { ImageResponse } = await import("@vercel/og");
        const url = new URL(request.url);
        const title = getQueryValue(url.searchParams.get("title"), "Toolless");
        const description = getQueryValue(
          url.searchParams.get("description"),
          "File-based document database for Node.js with a MongoDB-compatible API"
        );

        const response = new ImageResponse(
          <div
            style={{
              alignItems: "center",
              background:
                "radial-gradient(circle at 80% 20%, rgba(37,99,235,0.35), transparent 40%), #050816",
              color: "white",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "space-between",
              padding: "64px 72px",
              width: "100%",
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: 14,
                justifyContent: "flex-start",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  width: 27,
                }}
              >
                <div style={{ background: "white", height: 12, width: 12 }} />
                <div style={{ background: "white", height: 12, width: 12 }} />
                <div style={{ background: "white", height: 12, width: 12 }} />
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: -0.3,
                }}
              >
                toolless.dev
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                width: "100%",
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  letterSpacing: -1.4,
                  lineHeight: 1.04,
                  maxWidth: 1020,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 30,
                  fontWeight: 500,
                  letterSpacing: -0.3,
                  lineHeight: 1.3,
                  maxWidth: 1020,
                }}
              >
                {description}
              </div>
            </div>

            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div
                style={{
                  background: "rgba(37,99,235,0.2)",
                  border: "1px solid rgba(147,197,253,0.35)",
                  borderRadius: 999,
                  color: "rgba(219,234,254,0.95)",
                  fontSize: 24,
                  fontWeight: 600,
                  padding: "10px 18px",
                }}
              >
                MongoDB-compatible
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.62)",
                  fontSize: 22,
                  fontWeight: 500,
                }}
              >
                by Habib Adebayo
              </div>
            </div>
          </div>,
          SIZE
        );

        response.headers.set("content-type", "image/png");
        response.headers.set("cache-control", "public, max-age=0, s-maxage=86400");
        return response;
      },
    },
  },
});
