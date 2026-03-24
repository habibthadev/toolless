import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "fumadocs-mdx/vite";
import * as MdxConfig from "./source.config";

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["fumadocs-ui", "fumadocs-core", "aria-hidden", /@radix-ui\/.*/],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  plugins: [
    mdx(MdxConfig),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "app",
    }),
    viteReact(),
  ],
});
