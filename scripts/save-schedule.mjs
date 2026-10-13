// Saves the anime release schedule into public/history.json so releases stay available
// after the API drops them (it only keeps the current week).
//
//   node scripts/save-schedule.mjs
//
// Env: UPSTREAM_API  base URL of the anime API (default https://kitsuneapi.vercel.app/api/v2)
//      DAYS_BACK     how many days back to request (default 7)
//      KEEP_DAYS     days of history to keep in the file (default 30); older days are dropped
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.UPSTREAM_API || "https://kitsuneapi.vercel.app/api/v2").replace(/\/+$/, "");
const DAYS_BACK = Number(process.env.DAYS_BACK || 7);
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 30);
const FILE = path.join("public", "history.json");

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

async function get(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const body = await res.json();
  if (!body.success || !body.data) throw new Error(`Unexpected response from ${url}`);
  return body.data;
}

async function loadHistory() {
  try {
    return JSON.parse(await readFile(FILE, "utf8")).data || {};
  } catch {
    return {};
  }
}

const start = new Date();
start.setUTCDate(start.getUTCDate() - DAYS_BACK);

const urls = [`${BASE}/schedules`, `${BASE}/schedules?date=${iso(start)}`];
const results = await Promise.allSettled(urls.map(get));
results.forEach((r, i) => r.status === "rejected" && console.warn("Failed:", r.reason.message));
if (results.every((r) => r.status === "rejected")) {
  console.error("Could not reach the schedule API, leaving history unchanged.");
  process.exit(1);
}

const history = await loadHistory();
let added = 0;

results.forEach((r) => {
  if (r.status !== "fulfilled") return;
  Object.entries(r.value).forEach(([day, shows]) => {
    if (!Array.isArray(shows) || !shows.length) return;
    const list = (history[day] ||= []);
    shows.forEach((show) => {
      if (!show.id || !show.episode) return;
      const known = list.find((x) => x.id === show.id && x.episode === show.episode);
      const entry = { id: show.id, title: show.title, time: show.time, episode: show.episode };
      if (known) Object.assign(known, entry);
      else {
        list.push(entry);
        added += 1;
      }
    });
  });
});

// Drop days older than KEEP_DAYS so the file stays small; the app only shows the last 7 days
const cutoff = new Date();
cutoff.setUTCDate(cutoff.getUTCDate() - KEEP_DAYS);
const oldest = iso(cutoff);

// Oldest day first; the app sorts by air time itself
const sorted = Object.fromEntries(
  Object.keys(history)
    .sort()
    .filter((day) => day >= oldest && history[day].length)
    .map((day) => [day, history[day]]),
);

await mkdir(path.dirname(FILE), { recursive: true });
await writeFile(FILE, JSON.stringify({ updated: new Date().toISOString(), data: sorted }, null, 1) + "\n");
console.log(`Saved ${added} new release(s). Days stored: ${Object.keys(sorted).length}`);
