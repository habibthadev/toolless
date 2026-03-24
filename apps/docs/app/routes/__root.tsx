import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import * as React from "react";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import "@/styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const ogImage =
    "https://toollessdb.dev/api/og?title=Toolless&description=File-based%20document%20database%20for%20Node.js%20with%20a%20MongoDB-compatible%20API";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <title>Toolless - File-based Document Database</title>
        <meta
          name="description"
          content="A file-based document database for Node.js with a MongoDB-compatible API, CLI tools, and visual Studio interface."
        />
        <meta
          name="keywords"
          content="database, document, embedded, file-based, json, mongodb, nosql, nodejs, typescript"
        />
        <meta name="author" content="Habib Adebayo" />
        <meta property="og:title" content="Toolless - File-based Document Database" />
        <meta
          property="og:description"
          content="A file-based document database for Node.js with a MongoDB-compatible API."
        />
        <meta property="og:url" content="https://toollessdb.dev" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Toolless - File-based Document Database" />
        <meta
          name="twitter:description"
          content="A file-based document database for Node.js with a MongoDB-compatible API."
        />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:creator" content="@habibthadev" />
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen antialiased">
        <RootProvider>{children}</RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
