// Entirely fictional mock data used to render the README screenshots.
// None of these titles, characters or articles refer to real productions.

const SYNOPSES = [
  "When a lantern-keeper's apprentice discovers a nine-tailed fox sleeping beneath the village shrine, she is pulled into a centuries-old bargain between the moon and the tides. To keep her home safe she must travel the old pilgrim roads, gathering six fox-fire embers before the autumn festival ends. Along the way she meets rivals, rogues and gods who all want the same flame — and none of them agree on what should be done with it.",
  "In a city that never sees daylight, a retired courier takes one last delivery: a sealed paper lantern that hums a lullaby. Chased by rival guilds and a sentient streetcar, he has until dawn to decide whether to deliver it, destroy it, or listen to what it is trying to say.",
  "Five students at a seaside academy for tide-callers discover that the school's famous clock tower runs backwards every full moon. A quiet mystery slowly becomes a story about friendship, the cost of memory, and the courage to let a summer end.",
  "A tired detective and her talking umbrella solve small, strange cases in a rain-soaked market town. Every client leaves a little lighter — and every case quietly points toward the one mystery she has been avoiding for years.",
  "After the last airship in the sky-forge fleet is decommissioned, a crew of misfit engineers decides to build one more — in secret, from scrap, and in time for the harvest wind.",
];

const T = (id, title, type, duration, sub, dub, extra = {}) => ({
  id,
  title,
  type,
  duration,
  episodes: { sub, dub },
  ...extra,
});

export const CATALOG = [
  T("moonlit-fox-chronicles-101", "Moonlit Fox Chronicles", "TV", "24m", 24, 24),
  T("neon-ronin-midnight-circuit-102", "Neon Ronin: Midnight Circuit", "TV", "23m", 12, 12),
  T("tidebound-academy-103", "Tidebound Academy", "TV", "24m", 13, 0),
  T("skyforge-brigade-104", "Skyforge Brigade", "TV", "25m", 26, 20),
  T("the-cartographers-last-spring-105", "The Cartographer's Last Spring", "Movie", "1h 48m", 1, 1),
  T("ember-and-ash-cafe-106", "Ember & Ash Café", "TV", "22m", 12, 12),
  T("paper-lantern-detective-107", "Paper Lantern Detective", "TV", "24m", 24, 0),
  T("starlight-dojo-108", "Starlight Dojo", "TV", "24m", 50, 50),
  T("hollow-bell-village-109", "Hollow Bell Village", "ONA", "18m", 8, 0),
  T("clockwork-kingdom-zero-110", "Clockwork Kingdom Zero", "TV", "24m", 25, 25),
  T("sakura-signal-111", "Sakura Signal", "TV", "23m", 12, 0),
  T("crimson-tide-express-112", "Crimson Tide Express", "Movie", "2h 02m", 1, 1),
  T("lantern-festival-quartet-113", "Lantern Festival Quartet", "OVA", "30m", 4, 0),
  T("mecha-koi-rising-114", "Mecha Koi Rising", "TV", "24m", 24, 24),
  T("whisperwind-express-115", "Whisperwind Express", "TV", "24m", 13, 0),
  T("orbit-ramen-116", "Orbit Ramen", "ONA", "12m", 10, 10),
  T("winter-garden-of-glass-117", "Winter Garden of Glass", "Movie", "1h 31m", 1, 0),
  T("samurai-cats-inc-118", "Samurai Cats Inc.", "TV", "22m", 12, 12),
  T("aether-courier-119", "Aether Courier", "TV", "24m", 24, 24),
  T("violet-hour-orchestra-120", "Violet Hour Orchestra", "TV", "24m", 12, 0),
  T("kitsune-station-9-121", "Kitsune Station 9", "TV", "24m", 12, 12),
  T("dragonfly-summer-122", "Dragonfly Summer", "Special", "45m", 1, 0),
  T("echoes-of-tsukimi-123", "Echoes of Tsukimi", "Movie", "1h 55m", 1, 1),
  T("iron-petal-gunslingers-124", "Iron Petal Gunslingers", "TV", "24m", 24, 24),
];

const poster = (item) => ({ ...item, poster: `/mock/poster/${item.id}.svg` });
export const byId = (id) => CATALOG.find((c) => c.id === id);
const pick = (idxs) => idxs.map((i) => poster(CATALOG[i % CATALOG.length]));

export const JAPANESE = {
  "moonlit-fox-chronicles-101": "月夜の狐年代記",
  "neon-ronin-midnight-circuit-102": "ネオン浪人 真夜中回路",
  "tidebound-academy-103": "潮縛り学園",
};

export function home() {
  const spotlight = pick([0, 1, 3, 9, 7]).map((item, i) => ({
    ...item,
    rank: i + 1,
    synopsis: SYNOPSES[i % SYNOPSES.length].slice(0, 230) + "…",
  }));
  return {
    spotlight,
    trending: pick([0, 1, 3, 7, 9, 13, 17, 18, 20, 23, 5, 2]),
    topAiring: pick([3, 9, 13, 18, 7, 0, 20, 23, 1, 14, 17, 5]),
    mostPopular: pick([7, 0, 3, 23, 13, 1, 9, 18, 17, 5, 20, 14]),
    latestEpisode: pick([14, 5, 1, 20, 17, 2, 6, 10, 8, 15, 19, 21]),
    newAdded: pick([21, 19, 15, 10, 6, 2, 8, 22, 16, 11, 12, 4]),
    latestCompleted: pick([4, 11, 12, 16, 22, 8, 6, 2, 10, 15, 19, 21]),
    top10: {
      today: pick([0, 3, 7, 9, 1, 13, 18, 23, 17, 20]),
      week: pick([3, 0, 9, 7, 13, 1, 20, 18, 23, 17]),
      month: pick([7, 9, 0, 3, 18, 1, 13, 17, 20, 23]),
    },
  };
}

export const TOP_SEARCH = [
  "Moonlit Fox Chronicles",
  "Skyforge Brigade",
  "Starlight Dojo",
  "Neon Ronin",
  "Orbit Ramen",
  "Samurai Cats Inc.",
  "Aether Courier",
];

export const GENRES = [
  "action", "adventure", "comedy", "drama", "fantasy", "horror", "mecha",
  "music", "mystery", "romance", "sci-fi", "slice-of-life", "sports", "supernatural",
];

export const FILTER_OPTIONS = {
  type: ["all", "movie", "tv", "ova", "ona", "special"],
  status: ["all", "finished_airing", "currently_airing", "not_yet_aired"],
  rated: ["all", "g", "pg", "pg_13", "r", "r_plus"],
  score: ["all", "appalling", "bad", "average", "good", "great", "masterpiece"],
  season: ["all", "spring", "summer", "fall", "winter"],
  language: ["all", "sub", "dub", "sub_dub"],
  sort: ["default", "recently_added", "recently_updated", "score", "name_az", "released_date", "most_watched"],
  genres: GENRES,
};

export function listPage(items, page, totalPages = 12) {
  const p = Number(page) || 1;
  const start = (p * 5) % CATALOG.length;
  const rotated = [...CATALOG.slice(start), ...CATALOG.slice(0, start)];
  const response = (items || rotated).slice(0, 24).map(poster);
  return {
    response,
    pageInfo: { currentPage: p, totalPages, hasNextPage: p < totalPages },
  };
}

export const listFor = (query, page) => {
  if (query === "movie") {
    const movies = CATALOG.filter((c) => c.type === "Movie");
    const filler = CATALOG.filter((c) => c.type !== "Movie").slice(0, 3);
    return listPage([...movies, ...filler].map((m, i) => (i < movies.length ? m : { ...m, type: "Movie", duration: "1h 40m", episodes: { sub: 1, dub: 0 } })), page, 6);
  }
  return listPage(null, page);
};

export function search(keyword, page) {
  const k = String(keyword || "").toLowerCase();
  const hits = CATALOG.filter((c) => c.title.toLowerCase().includes(k));
  const extra = CATALOG.filter((c) => !hits.includes(c));
  return listPage([...hits, ...extra].slice(0, 12), page, 3);
}

export function suggestions(keyword) {
  const k = String(keyword || "").toLowerCase();
  return CATALOG.filter((c) => c.title.toLowerCase().includes(k)).slice(0, 6).map(({ id, title }) => ({ id, title }));
}

export function anime(id) {
  const base = byId(id) || CATALOG[0];
  const idx = CATALOG.indexOf(base);
  const withPoster = poster(base);
  return {
    ...withPoster,
    japanese: JAPANESE[base.id] || "狐火の物語",
    status: idx % 5 === 4 ? "Finished Airing" : "Currently Airing",
    rating: "PG-13",
    MAL_score: (7.4 + ((idx * 7) % 18) / 10).toFixed(2),
    synopsis: SYNOPSES[idx % SYNOPSES.length] + " " + "Mock synopsis for documentation screenshots only.",
    premiered: ["Fall 2026", "Summer 2026", "Spring 2026", "Winter 2026"][idx % 4],
    studios: ["Lanternworks", "Studio Hoshikage"][idx % 2 ? 0 : 1] ? [["Lanternworks", "Studio Hoshikage"][idx % 2]] : ["Lanternworks"],
    genres: [GENRES[idx % GENRES.length], GENRES[(idx + 3) % GENRES.length], GENRES[(idx + 6) % GENRES.length], "supernatural"].map((g) => g.replace(/(^|-)(\w)/g, (m, a, b) => (a ? " " : "") + b.toUpperCase())),
    related: pick([idx + 1, idx + 5]),
    recommended: pick([idx + 2, idx + 7, idx + 9, idx + 11, idx + 13, idx + 15]),
    mostPopular: pick([idx + 3, idx + 4, idx + 8]),
  };
}

export function episodes(id) {
  const base = byId(id) || CATALOG[0];
  const total = Math.min(Math.max(base.episodes.sub, 1), 24);
  const dubCount = Math.min(base.episodes.dub, total);
  const titles = [
    "The Fox Beneath the Shrine", "Six Embers", "Pilgrim Roads", "A Bargain at Low Tide",
    "The Lantern Keeper's Debt", "Festival Eve", "Whispers in the Cedar Grove", "The Moon Remembers",
    "Rain on the Red Bridge", "A Door Made of Fog", "Nine Tails, One Promise", "Autumn's Last Light",
  ];
  return Array.from({ length: total }, (_, i) => ({
    id: `${base.id}?ep=${i + 1}`,
    episodeNumber: i + 1,
    title: titles[i % titles.length],
    isFiller: i === 6 && total > 12,
    sub: true,
    dub: i < dubCount,
    aniId: 1000 + i,
    malId: 2000 + i,
  }));
}

export const CHARACTERS = [
  ["Hinata Aoi", "Main"], ["Kuro, the Nine-Tailed", "Main"], ["Master Reiji", "Supporting"],
  ["Captain Miyu Shirogane", "Supporting"], ["Tsubame", "Supporting"], ["Old Man Gen", "Supporting"],
].map(([name, role], i) => ({ id: `c${i + 1}`, name, role, imageUrl: `/mock/avatar/c${i + 1}.svg` }));

export const CHARACTER_BIO = {
  c1: "A cheerful, stubborn lantern-keeper's apprentice who would rather fix a problem than wait for permission. (Fictional mock profile used for documentation screenshots.)",
};

export const SCHEDULE_BASE = [
  ["00:30", "Moonlit Fox Chronicles", 14], ["01:00", "Skyforge Brigade", 18], ["09:30", "Neon Ronin: Midnight Circuit", 7],
  ["10:00", "Orbit Ramen", 5], ["12:00", "Starlight Dojo", 41], ["14:30", "Aether Courier", 11],
  ["17:00", "Samurai Cats Inc.", 6], ["19:30", "Mecha Koi Rising", 16], ["21:00", "Iron Petal Gunslingers", 9],
  ["22:30", "Ember & Ash Café", 4], ["23:00", "Kitsune Station 9", 3],
];

export function schedules(start = new Date("2026-10-10T00:00:00")) {
  const out = {};
  for (let d = 0; d < 7; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    out[key] = SCHEDULE_BASE.filter((_, i) => (i + d) % 3 !== 2).map(([time, title, ep]) => {
      const item = CATALOG.find((c) => c.title === title) || CATALOG[0];
      return { id: item.id, title, time, episode: ep + d };
    });
  }
  return out;
}

export const NEWS = [
  ["300101", "“Moonlit Fox Chronicles” Season 2 Confirmed for Spring With New Key Visual", "Oct 9, 2026"],
  ["300102", "Skyforge Brigade Film Announces Theatrical Release and Opening Theme Artist", "Oct 9, 2026"],
  ["300103", "Lanternworks Reveals Cast for “Tidebound Academy” Tide-Caller Club", "Oct 8, 2026"],
  ["300104", "Starlight Dojo Marks 50th Episode With Special Broadcast Event", "Oct 8, 2026"],
  ["300105", "“Orbit Ramen” Short Anime Gets a Second Season and Collaboration Menu", "Oct 7, 2026"],
  ["300106", "Violet Hour Orchestra Concert Tour Dates Announced for Winter", "Oct 7, 2026"],
  ["300107", "Paper Lantern Detective Manga Surpasses 2 Million Copies in Circulation", "Oct 6, 2026"],
  ["300108", "Studio Hoshikage Teases New Original Anime Project in Anniversary Video", "Oct 6, 2026"],
].map(([id, title, uploadedAt]) => ({
  id,
  title,
  uploadedAt,
  thumbnail: `/mock/news/${id}.svg`,
  url: `/news/2026-10-09/mock-article.${id}`,
  description: "Mock news summary used for documentation screenshots.",
}));

export const ARTICLE = {
  "300101": [
    "The official website for the television anime “Moonlit Fox Chronicles” announced on Friday that a second season is in production and will premiere in Spring 2027. A new key visual featuring the nine-tailed fox Kuro and apprentice Hinata Aoi was also unveiled.",
    "The main staff and cast are returning. Director Akane Mizuhara will oversee the series at Lanternworks, with scripts by Daichi Fujimori and character designs by Rina Yamashiro.",
    "A new teaser trailer previews the pilgrim road arc, in which the heroes travel north to retrieve the final fox-fire ember. The teaser ends with the line “The festival is only the beginning.”",
    "The first season followed a lantern-keeper's apprentice who discovers a sleeping fox spirit beneath her village shrine. It streamed weekly throughout Fall 2026.",
    "Source: Kitsunewave mock newsroom (fictional content for documentation purposes)",
  ],
};
export const DEFAULT_ARTICLE = [
  "This is a fictional news article used to demonstrate the Kitsunewave news reader in the README screenshots. No real publication, studio or production is referenced.",
  "Production details, cast announcements and release dates in this mock feed are invented placeholders.",
  "Source: Kitsunewave mock newsroom (fictional content for documentation purposes)",
];
