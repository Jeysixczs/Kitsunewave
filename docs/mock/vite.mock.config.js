// Dev server that replaces the real /api with local mock data.
// Used only to generate the README screenshots (see docs/mock/capture.py).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as data from "./data.js";
import { posterSvg, avatarSvg, newsThumbSvg, playerHtml } from "./art.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const send = (res, body, type = "application/json") => {
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "no-store");
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};
const ok = (res, payload) => send(res, { success: true, data: payload });

function mockApi() {
  return {
    name: "kitsune-mock-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, "http://localhost");
        const p = url.pathname;
        const q = url.searchParams;

        // ---- mock static assets ----
        let m;
        if ((m = p.match(/^\/mock\/poster\/(.+)\.svg$/))) return send(res, posterSvg(m[1]), "image/svg+xml");
        if ((m = p.match(/^\/mock\/avatar\/(.+)\.svg$/))) return send(res, avatarSvg(m[1]), "image/svg+xml");
        if ((m = p.match(/^\/mock\/news\/(.+)\.svg$/))) return send(res, newsThumbSvg(m[1]), "image/svg+xml");
        if (p.startsWith("/mock/player")) return send(res, playerHtml(q.get("label") || "Kitsune 1"), "text/html");

        // ---- mock API ----
        if (!p.startsWith("/api/")) return next();
        const route = p.replace(/^\/api/, "");

        if (route === "/home") return ok(res, data.home());
        if (route === "/top-search") return ok(res, data.TOP_SEARCH);
        if (route === "/genres") return ok(res, data.GENRES);
        if (route === "/filter/options") return ok(res, data.FILTER_OPTIONS);
        if (route === "/filter") return ok(res, data.listPage(null, q.get("page")));
        if (route === "/schedules") return ok(res, data.schedules());
        if (route === "/random") return ok(res, { id: data.CATALOG[0].id });
        if (route === "/suggestion") return ok(res, data.suggestions(q.get("keyword")));
        if (route === "/search") return ok(res, data.search(q.get("keyword"), q.get("page")));
        if (route === "/news") return ok(res, { news: Number(q.get("page") || 1) > 1 ? [] : data.NEWS });
        if (route === "/news-article") return ok(res, { paragraphs: data.ARTICLE[q.get("id")] || data.DEFAULT_ARTICLE });
        if ((m = route.match(/^\/animes\/(.+)$/))) return ok(res, data.listFor(decodeURIComponent(m[1]), q.get("page")));
        if ((m = route.match(/^\/anime\/(.+)$/))) return ok(res, data.anime(decodeURIComponent(m[1])));
        if ((m = route.match(/^\/episodes\/(.+)$/))) return ok(res, data.episodes(decodeURIComponent(m[1]).split("?")[0]));
        if ((m = route.match(/^\/servers\/(.+)$/))) {
          const type = q.get("type") === "dub" ? "dub" : "sub";
          const origin = `http://${req.headers.host}`;
          return ok(res, {
            servers: [1, 2, 3].map((n) => ({
              serverId: `${type}-${n}`,
              iframe: `${origin}/mock/player/${type}?label=Kitsune+${n}`,
            })),
          });
        }
        if ((m = route.match(/^\/schedule\/next\/(.+)$/))) return ok(res, { episode: 14, airingAt: "2026-10-17T15:30:00.000Z" });
        if ((m = route.match(/^\/characters\/(.+)$/))) {
          return ok(res, { response: data.CHARACTERS, pageInfo: { currentPage: 1, totalPages: 3, hasNextPage: true } });
        }
        if ((m = route.match(/^\/character\/(.+)$/))) {
          const c = data.CHARACTERS.find((x) => x.id === m[1]) || data.CHARACTERS[0];
          return ok(res, { name: c.name, type: "character", imageUrl: c.imageUrl, description: data.CHARACTER_BIO[c.id] || "A fictional mock character profile." });
        }
        res.statusCode = 404;
        return send(res, { success: false, message: `No mock for ${route}` });
      });
    },
  };
}

export default defineConfig({
  root,
  plugins: [react(), mockApi()],
  server: { port: 5199, strictPort: true, host: "127.0.0.1" },
  cacheDir: path.join(root, "node_modules/.vite-mock"),
});
