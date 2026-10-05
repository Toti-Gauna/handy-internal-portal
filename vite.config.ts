import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/handy-internal-portal/" : "/",
  appType: "spa",
  server: {
    host: "127.0.0.1",
  },
});
