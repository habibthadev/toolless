import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: {
      preset: "recommended",
    },
    minify: false,
    target: "es2022",
    esbuildOptions(options) {
      options.legalComments = "none";
    },
  },
  {
    entry: { cli: "src/cli/cli.ts" },
    outDir: "dist",
    format: ["esm"],
    dts: false,
    sourcemap: false,
    clean: false,
    splitting: false,
    treeshake: {
      preset: "recommended",
    },
    minify: true,
    target: "es2022",
    shims: true,
    esbuildOptions(options) {
      options.legalComments = "none";
      options.drop = ["debugger"];
    },
  },
]);
