import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(__dirname, "src/star-quest.ts"),
      formats: ["es"],
      fileName: () => "star-quest.mjs"
    },
    rollupOptions: {
      output: {
        assetFileNames: "star-quest.[ext]"
      }
    }
  }
});
