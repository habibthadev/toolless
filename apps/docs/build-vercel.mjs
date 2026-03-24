import { cpSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");
const outputDir = join(__dirname, ".vercel/output");

function copyDirSync(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

mkdirSync(join(outputDir, "static"), { recursive: true });
mkdirSync(join(outputDir, "functions/ssr.func"), { recursive: true });

copyDirSync(join(distDir, "client"), join(outputDir, "static"));

copyDirSync(join(distDir, "server"), join(outputDir, "functions/ssr.func"));

// Since all dependencies are bundled into server.js with ssr.noExternal: true,
// we only need a minimal package.json for ES module support
writeFileSync(
  join(outputDir, "functions/ssr.func/package.json"),
  JSON.stringify(
    {
      type: "module",
    },
    null,
    2
  )
);

writeFileSync(
  join(outputDir, "functions/ssr.func/.vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "server.js",
      launcherType: "Nodejs",
      supportsResponseStreaming: true,
    },
    null,
    2
  )
);

writeFileSync(
  join(outputDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "^/assets/(.*)$",
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
          continue: true,
        },
        {
          handle: "filesystem",
        },
        {
          src: "/(.*)",
          dest: "/ssr",
        },
      ],
    },
    null,
    2
  )
);

console.log("Vercel Build Output API prepared at .vercel/output");
