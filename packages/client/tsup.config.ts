import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  globalName: "ReplayerClient",
  dts: true,
  clean: true,
  minify: true
});