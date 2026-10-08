import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import "./styles.css";

const API = "https://kitsuneapi.vercel.app/api/v2";

function autoplayUrl(url) {
  if (!url) return "";
  const embedUrl = new URL(url);
  embedUrl.searchParams.set("autoplay", "1");
  embedUrl.searchParams.set("autoPlay", "1");
  return embedUrl.toString();
}

async function request(path) {
  const response = await fetch(`${API}${path}`);
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message || `HTTP ${response.status}`);
  }
  return body.data;
}

function embeddedServers(servers) {
  return servers.filter((item) => {
    try {
      return new URL(item.iframe).hostname !== "flixera.co";
    } catch {
      return false;
    }
  });
}

function dubFallbackServers(servers) {
  return servers.map((item) => ({
    ...item,
    iframe: item.iframe.replace(/\/sub(?=[/?]|$)/, "/dub"),
  }));
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const FilterIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
);

const MENU_SECTIONS = [
  { heading: "Sections", items: [
    ["Trending now", "top-airing"], ["Top airing", "top-airing"], ["Most popular", "most-popular"],
    ["New episodes", "recently-updated"], ["New additions", "recently-added"], ["Just completed", "completed"],
  ] },
  { heading: "Browse", items: [
    ["Most favorite", "most-favorite"], ["Top upcoming", "top-upcoming"],
    ["Subbed anime", "subbed-anime"], ["Dubbed anime", "dubbed-anime"],
    ["TV series", "tv"], ["OVA", "ova"], ["ONA", "ona"], ["Specials", "special"], 
  ] },
];

function MenuDrawer({ open, onClose, onList, onRandom }) {
  const [genres, setGenres] = useState([]);
  useEffect(() => {
    if (!open || genres.length) return;
    request("/genres").then((data) => setGenres(Array.isArray(data) ? data : [])).catch(() => setGenres([]));
  }, [open, genres.length]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("menu-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("menu-open");
    };
  }, [open, onClose]);
  const listLink = (title, query, label = title) => (
    <a
      key={`${title}-${query}`}
      href={`/?list=${encodeURIComponent(query)}&title=${encodeURIComponent(title)}`}
      onClick={(event) => {
        if (!onList) return;
        event.preventDefault();
        onList(title, query);
        onClose();
      }}
    >
      <span>{label}</span>
    </a>
  );
  return createPortal(
    <div className={`menu-drawer${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="menu-backdrop" onClick={onClose} />
      <nav className="menu-panel" aria-label="Site menu">
        <div className="menu-head">
          <strong>Menu</strong>
          <button type="button" className="menu-close" aria-label="Close menu" onClick={onClose}>×</button>
        </div>
        <div className="menu-group">
          <a href="/" onClick={onClose}><span>Home</span></a>
          <a href="/movie.html" onClick={onClose}><span>Movies</span></a>
          <a href="/news.html" onClick={onClose}><span>News</span></a>
          <a href="/#schedule" onClick={onClose}><span>Anime schedule</span></a>
          {onRandom && (
            <a href="#random" onClick={(event) => { event.preventDefault(); onClose(); onRandom(); }}><span>Random anime</span></a>
          )}
        </div>
        {MENU_SECTIONS.map((group) => (
          <div className="menu-group" key={group.heading}>
            <h3>{group.heading}</h3>
            {group.items.map(([title, query]) => listLink(title, query))}
          </div>
        ))}
        {genres.length > 0 && (
          <div className="menu-group menu-genres">
            <h3>Explore genres</h3>
            {genres.map((genre) => listLink(`${genre} anime`, `genre/${encodeURIComponent(genre)}`, genre))}
          </div>
        )}
      </nav>
    </div>,
    document.body,
  );
}

function Header({ back = false, onSearch, onOpenFilters, onRandom, onList }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    const term = keyword.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      request(`/suggestion?keyword=${encodeURIComponent(term)}`)
        .then((data) => setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [keyword]);
  return (
    <header className={back ? "watch-header" : "topbar"}>
      <button
        type="button"
        className="burger"
        aria-label="Open menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      >
        <span /><span /><span />
      </button>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onList={onList} onRandom={onRandom} />
      <a className="brand" href="/">
        <img className="brand-logo" src="/kitsune-logo.png" alt="" width="53" height="56" />
        <span>Kitsunewave</span>
      </a>
      {back ? (
        <a className="watch-back" href="/">
          ← Back to browse
        </a>
      ) : (
        <>
        <div className="search-wrap">
          <form
            className="search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setSuggestions([]);
              onSearch?.(keyword);
            }}
          >
            <span className="search-lead" aria-hidden="true"><SearchIcon /></span>
            <input
              aria-label="Search anime"
              placeholder="Search anime..."
              autoComplete="off"
              enterKeyHint="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            {keyword && (
              <button className="search-clear" aria-label="Clear search" type="button" onClick={() => { setKeyword(""); setSuggestions([]); }}>×</button>
            )}
            <button className="filter-button" aria-label="Open filters" title="Filters" type="button" onClick={onOpenFilters}>
              <FilterIcon />
            </button>
            <button className="search-submit" aria-label="Search" type="submit"><span className="search-submit-text">Search</span><span className="search-submit-icon"><SearchIcon /></span></button>
          </form>
          {suggestions.length > 0 && (
            <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
              {suggestions.map((item) => (
                <button
                  type="button"
                  key={item.id || item.title}
                  onClick={() => {
                    const title = item.title || item.name || "";
                    setKeyword(title);
                    setSuggestions([]);
                    onSearch?.(title);
                  }}
                >
                  {item.title || item.name || "Anime"}
                </button>
              ))}
            </div>
          )}
        </div>
        <a className="section-link news-link" href="/movie.html">Movies</a>
        <a className="section-link news-link" href="/news.html">News</a>
        <button className="section-link random-link" type="button" onClick={onRandom}>Random anime</button>
        </>
      )}
    </header>
  );
}

function Poster({ item, className = "" }) {
  return item?.poster ? (
    <img
      loading="lazy"
      className={className}
      src={item.poster}
      alt={item.title || "Anime"}
    />
  ) : null;
}

function Card({ item }) {
  return (
    <a className="card" href={`/detail.html?id=${encodeURIComponent(item.id)}`}>
      <div className="poster">
        <Poster item={item} />
        {item.episodes?.sub && (
          <span className="badge">{item.episodes.sub} eps</span>
        )}
      </div>
      <h3>{item.title || "Untitled"}</h3>
      <p>{[item.type, item.duration].filter(Boolean).join(" · ")}</p>
    </a>
  );
}

function Rail({ title, items = [], query, onViewAll }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="section-heading">
        <h2>{title}</h2>
        {query && (
          <button
            className="section-link"
            type="button"
            onClick={() => onViewAll?.(title, query)}
          >
            View all <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
      <div className="rail">
        {items.map((item) => (
          <Card item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function TopAnime({ top10 }) {
  const [period, setPeriod] = useState("today");
  const periods = [
    ["today", "Today"],
    ["week", "Week"],
    ["month", "Month"],
  ];
  const items = top10?.[period] || [];

  return (
    <section className="top-anime" aria-labelledby="top-anime-heading">
      <div className="top-anime-heading">
        <h2 id="top-anime-heading">Top anime</h2>
        <span className="top-anime-icon" aria-hidden="true">
          ✦
        </span>
      </div>
      <div className="top-anime-tabs" role="tablist" aria-label="Top anime period">
        {periods.map(([value, label]) => (
          <button
            className={`top-anime-tab${period === value ? " active" : ""}`}
            type="button"
            role="tab"
            aria-selected={period === value}
            onClick={() => setPeriod(value)}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="top-anime-list active" role="tabpanel">
        {items.length ? (
          items.slice(0, 10).map((item, index) => (
            <a
              className="top-anime-item"
              href={`/detail.html?id=${encodeURIComponent(item.id)}`}
              key={`${period}-${item.id}`}
            >
              <span className="top-anime-rank">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Poster item={item} />
              <span className="top-anime-info">
                <strong>{item.title || "Untitled"}</strong>
                <small>{item.type || "Anime"}</small>
              </span>
            </a>
          ))
        ) : (
          <p className="top-anime-empty">No rankings available.</p>
        )}
      </div>
    </section>
  );
}

function Pagination({ pageInfo, onPageChange }) {
  const totalPages = Math.max(1, Number(pageInfo?.totalPages) || 1);
  const currentPage = Math.min(
    totalPages,
    Math.max(1, Number(pageInfo?.currentPage) || 1),
  );

  if (totalPages <= 1) return null;

  const startPage =
    totalPages <= 5
      ? 1
      : Math.min(Math.max(currentPage - 2, 1), totalPages - 4);
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => startPage + index,
  );

  return (
    <nav className="pagination" aria-label="Results pages">
      <button
        className="pagination-button"
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      {pages[0] > 1 && <span className="pagination-ellipsis">…</span>}
      {pages.map((page) => (
        <button
          className={`pagination-page${page === currentPage ? " active" : ""}`}
          type="button"
          aria-current={page === currentPage ? "page" : undefined}
          onClick={() => onPageChange(page)}
          key={page}
        >
          {page}
        </button>
      ))}
      {pages.at(-1) < totalPages && <span className="pagination-ellipsis">…</span>}
      <button
        className="pagination-button"
        type="button"
        disabled={currentPage === totalPages || !pageInfo?.hasNextPage}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}

function ListResults({ title, query }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setData(null);
    setError("");
    request(`/animes/${query}?page=${page}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [query, page]);

  useEffect(() => setPage(1), [query]);

  return (
    <section className="list-results content">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {error ? (
        <p className="loading">{error}</p>
      ) : !data ? (
        <div className="filter-results search-skeleton">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <span className="skeleton skeleton-card" key={item} />
          ))}
        </div>
      ) : (
        <div className="filter-results">
          {(data.response || []).map((item) => (
            <Card item={item} key={item.id} />
          ))}
        </div>
      )}
      {data && <Pagination pageInfo={data.pageInfo} onPageChange={setPage} />}
    </section>
  );
}

const BROWSE_LISTS = [
  ["Most favorite", "most-favorite"], ["Top upcoming", "top-upcoming"],
  ["Subbed anime", "subbed-anime"], ["Dubbed anime", "dubbed-anime"],
  ["Movies", "movie"], ["TV series", "tv"], ["OVA", "ova"],
  ["ONA", "ona"], ["Specials", "special"],
];

function Explore({ onList }) {
  const [genres, setGenres] = useState([]);
  const [producer, setProducer] = useState("");
  useEffect(() => {
    request("/genres").then(setGenres).catch(() => setGenres([]));
  }, []);
  return (
    <section className="explore-section">
      <div className="section-heading"><h2>Browse more anime</h2></div>
      <div className="genres">
        {BROWSE_LISTS.map(([title, query]) => (
          <button className="genre" type="button" key={query} onClick={() => onList(title, query)}>{title}</button>
        ))}
      </div>
      <div className="genres explore-genres" aria-label="Browse genres">
        {genres.map((genre) => (
          <button className="genre" type="button" key={genre} onClick={() => onList(`${genre} anime`, `genre/${encodeURIComponent(genre)}`)}>{genre}</button>
        ))}
      </div>
      <form className="producer-search" onSubmit={(event) => {
        event.preventDefault();
        if (producer.trim()) onList(`From ${producer.trim()}`, `producer/${encodeURIComponent(producer.trim())}`);
      }}>
        <input value={producer} onChange={(event) => setProducer(event.target.value)} placeholder="Browse by producer" aria-label="Producer" />
        <button className="button secondary" type="submit">Browse</button>
      </form>
    </section>
  );
}

function NewsFeed() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setData(null);
    setFailed(false);
    request(`/news?page=${page}`)
      .then((result) => setData(result || { news: [] }))
      .catch(() => {
        setFailed(true);
        setData({ news: [] });
      });
  }, [page]);
  const articles = data?.news || [];
  const pager = (
    <div className="pagination">
      <button className="pagination-button" type="button" disabled={page === 1 || !data} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page}</span>
      <button className="pagination-button" type="button" disabled={!data || articles.length === 0} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
  return (
    <section className="news-section content" aria-busy={!data}>
      <div className="section-heading">
        <div>
          <span className="section-kicker">Latest updates</span>
          <h2>Anime news</h2>
        </div>
      </div>
      {!data ? (
        <div className="news-list">
          {[1, 2, 3, 4, 5, 6].map((item) => <span className="skeleton news-skeleton" key={item} />)}
        </div>
      ) : articles.length ? (
        <>
          <div className="news-list">
            {articles.map((article, index) => (
              <a
                className="news-item"
                key={article.id || `${page}-${index}`}
                href={/^https?:/.test(article.url || "") ? article.url : `https://hianime.to${article.url || ""}`}
                target="_blank"
                rel="noreferrer"
              >
                {article.thumbnail ? <img src={article.thumbnail} alt="" loading="lazy" /> : <span className="news-thumb-empty" aria-hidden="true">K</span>}
                <span className="news-text">
                  <strong>{article.title}</strong>
                  {article.uploadedAt && <small>{article.uploadedAt}</small>}
                </span>
              </a>
            ))}
          </div>
          {pager}
        </>
      ) : (
        <>
          <p className="news-empty">{failed ? "Couldn't load the news right now. Please try again in a moment." : page > 1 ? "No more news." : "No news available right now."}</p>
          {page > 1 && pager}
        </>
      )}
    </section>
  );
}

function News() {
  return (
    <>
      <Header back />
      <main className="content news-page">
        <NewsFeed />
      </main>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="home-loading" aria-busy="true" aria-label="Loading anime">
      <section className="hero hero-skeleton">
        <div className="skeleton-hero-copy">
          <span className="skeleton skeleton-eyebrow" />
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-title skeleton-title-short" />
          <span className="skeleton skeleton-description" />
          <span className="skeleton skeleton-description skeleton-description-short" />
          <div className="skeleton-actions">
            <span className="skeleton skeleton-button" />
            <span className="skeleton skeleton-button" />
          </div>
        </div>
      </section>
      <section className="content">
        <div className="rails-skeleton">
          {[1, 2, 3].map((rail) => (
            <section className="skeleton-rail" key={rail}>
              <div className="section-heading">
                <span className="skeleton skeleton-heading" />
              </div>
              <div className="skeleton-cards">
                {[1, 2, 3, 4, 5, 6].map((card) => (
                  <span className="skeleton skeleton-card" key={card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="detail-skeleton"
      aria-busy="true"
      aria-label="Loading anime details"
    >
      <div className="skeleton-detail-hero">
        <div className="skeleton-detail-poster" />
        <div className="skeleton-detail-copy">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="skeleton-detail-section">
        <span />
        <span />
        <span />
      </div>
      <div className="skeleton-detail-section">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function WatchSkeleton() {
  return (
    <div
      className="watch-skeleton"
      aria-busy="true"
      aria-label="Loading watch page"
    >
      <div className="skeleton-watch-layout">
        <aside className="skeleton-panel skeleton-episodes" />
        <section className="skeleton-panel skeleton-player" />
        <aside className="skeleton-panel skeleton-related" />
      </div>
      <div className="skeleton-watch-details">
        <div className="skeleton-poster" />
        <div className="skeleton-copy">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function SearchResults({ keyword, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (!keyword.trim()) return;
    setData(null);
    setError("");
    request(`/search?keyword=${encodeURIComponent(keyword)}&page=${page}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [keyword, page]);
  useEffect(() => setPage(1), [keyword]);
  return (
    <section className="search-view content">
      <div className="section-heading">
        <h2>Results for “{keyword}”</h2>
        <button className="button secondary" onClick={onClose}>
          Back to browse
        </button>
      </div>
      {error ? (
        <p className="loading">{error}</p>
      ) : !data ? (
        <div className="skeleton-cards search-skeleton">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <span className="skeleton skeleton-card" key={item} />
          ))}
        </div>
      ) : (
        <div className="filter-results">
          {(data.response || []).map((item) => (
            <Card item={item} key={item.id} />
          ))}
        </div>
      )}
      {data && <Pagination pageInfo={data.pageInfo} onPageChange={setPage} />}
    </section>
  );
}

const SCHEDULE_PREVIEW = 8;

function Schedule() {
  const [schedule, setSchedule] = useState(null);
  const [date, setDate] = useState("");
  const [expandedDays, setExpandedDays] = useState({});
  useEffect(() => {
    request("/schedules")
      .then((data) => {
        setSchedule(data);
        setDate(Object.keys(data).sort()[0] || "");
      })
      .catch(() => setSchedule({}));
  }, []);
  const dates = schedule ? Object.keys(schedule).sort() : [];
  if (!schedule)
    return (
      <section id="schedule" className="schedule-section content" aria-busy="true">
        <div className="section-heading">
          <span className="skeleton skeleton-heading" />
        </div>
        <div className="schedule-loading">
          <span className="skeleton schedule-loading-line" />
          <span className="skeleton schedule-loading-line schedule-loading-short" />
        </div>
      </section>
    );
  return (
    <section id="schedule" className="schedule-section content">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Plan your watchlist</span>
          <h2>Anime schedule</h2>
        </div>
      </div>
      <div className="schedule-tabs">
        {dates.map((item, index) => (
          <button
            className={`schedule-tab${item === date ? " active" : ""}`}
            key={item}
            onClick={() => setDate(item)}
          >
            <strong>
              {index === 0
                ? "Today"
                : new Date(`${item}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
            </strong>
            <small>
              {new Date(`${item}T00:00:00`).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </small>
          </button>
        ))}
      </div>
      <div className="schedule-lists">
        {dates.map((item) => {
          const shows = schedule[item] || [];
          const open = !!expandedDays[item];
          const visibleShows = open ? shows : shows.slice(0, SCHEDULE_PREVIEW);
          return (
            <div className={`schedule-list${item === date ? " active" : ""}`} key={item}>
              {shows.length ? (
                visibleShows.map((show, index) => (
                  <a
                    className="schedule-item"
                    href={`/detail.html?id=${encodeURIComponent(show.id)}`}
                    key={`${item}-${show.id}-${show.episode || index}`}
                  >
                    <span className="schedule-time">{show.time || "TBA"}</span>
                    <span className="schedule-info">
                      <strong>{show.title}</strong>
                      <small>Episode {show.episode || "TBA"}</small>
                    </span>
                    <span className="schedule-arrow">→</span>
                  </a>
                ))
              ) : (
                <p className="schedule-empty">No releases scheduled for this day.</p>
              )}
              {shows.length > SCHEDULE_PREVIEW && (
                <button
                  type="button"
                  className="schedule-more"
                  onClick={() => setExpandedDays((current) => ({ ...current, [item]: !open }))}
                >
                  {open ? "Show less" : `Show more (${shows.length - SCHEDULE_PREVIEW} more)`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FilterPanel({ onResults, onClose, initialGenre = "" }) {
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({
    type: "all",
    status: "all",
    sort: "default",
    genres: initialGenre ? [initialGenre] : [],
  });
  useEffect(() => {
    request("/filter/options")
      .then(setOptions)
      .catch(() => setOptions({}));
  }, []);
  const update = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));
  const apply = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(form).forEach(([key, value]) => {
      if (
        Array.isArray(value)
          ? value.length
          : value && value !== "all" && value !== "default"
      )
        params.set(key, Array.isArray(value) ? value.join(",") : value);
    });
    params.set("page", "1");
    request(`/filter?${params}`)
      .then((data) => onResults({ data, params: params.toString() }))
      .catch(() => onResults({ data: { response: [], pageInfo: null }, params: params.toString() }));
  };

  const content = !options ? (
    <div className="filter-loading" aria-busy="true">
      <span className="skeleton skeleton-filter-line" />
      <span className="skeleton skeleton-filter-line" />
      <span className="skeleton skeleton-filter-line skeleton-filter-line-short" />
    </div>
  ) : (
    <form className="filter-grid" onSubmit={apply}>
      {["type", "status", "rated", "score", "season", "language", "sort"].map(
        (name) => (
          <label className="filter-field" key={name}>
            <span>{name}</span>
            <select
              value={form[name] || "all"}
              onChange={(event) => update(name, event.target.value)}
            >
              {(options[name] || ["all"]).map((value) => (
                <option value={value} key={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        ),
      )}
      <label className="filter-field filter-genres-field">
        <span>Genres</span>
        <div className="filter-genres-list" role="group" aria-label="Select genres">
          {(options.genres || []).map((genre) => {
            const selected = form.genres.includes(genre);
            return (
              <button
                className={`genre${selected ? " selected" : ""}`}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  update(
                    "genres",
                    selected
                      ? form.genres.filter((item) => item !== genre)
                      : [...form.genres, genre],
                  )
                }
                key={genre}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </label>
      <div className="filter-actions">
        <button className="button" type="submit">
          Apply filters
        </button>
        <button className="button secondary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </form>
  );

  return (
    <div className="filter-modal-backdrop" onClick={onClose}>
      <div
        className="filter-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Filter anime"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="filter-modal-header">
          <div>
            <span className="section-kicker">Refine your watchlist</span>
            <h2>Filter anime</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label="Close filter panel"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}

function Home() {
  const [home, setHome] = useState(null);
  const [error, setError] = useState("");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [filtering, setFiltering] = useState(false);
  const [filtered, setFiltered] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [listView, setListView] = useState(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get("list");
    return query ? { query, title: params.get("title") || query.replace(/-/g, " ") } : null;
  });
  const [topSearches, setTopSearches] = useState([]);

  const loadFilteredPage = (page) => {
    if (!filtered?.params) return;
    const params = new URLSearchParams(filtered.params);
    params.set("page", String(page));
    setFiltered((current) => ({ ...current, loading: true }));
    request(`/filter?${params}`)
      .then((data) => setFiltered({ data, params: params.toString(), loading: false }))
      .catch((err) =>
        setFiltered((current) => ({ ...current, loading: false, error: err.message })),
      );
  };

  useEffect(() => {
    request("/home")
      .then(setHome)
      .catch((err) => setError(err.message));
    request("/top-search").then((data) => setTopSearches(Array.isArray(data) ? data : [])).catch(() => setTopSearches([]));
  }, []);

  const spotlight = home?.spotlight || [];
  const featured = spotlight[featuredIndex];
  useEffect(() => {
    if (spotlight.length < 2) return undefined;
    const timer = window.setInterval(
      () => setFeaturedIndex((index) => (index + 1) % spotlight.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [spotlight.length]);

  return (
    <>
      <Header
        onList={(title, query) => {
          setSearch("");
          setFiltering(false);
          setFiltered(null);
          setListView({ title, query });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onSearch={(keyword) => setSearch(keyword.trim())}
        onRandom={() => request("/random").then(({ id }) => { if (id) location.href = `/detail.html?id=${encodeURIComponent(id)}`; })}
        onOpenFilters={() => {
          setSelectedGenre("");
          setFiltering(true);
        }}
      />
      <main id="home">
        <section
          className={`hero${!home && !error ? " hero-skeleton" : ""}`}
          style={
            featured?.poster
              ? { "--hero-image": `url("${featured.poster}")` }
              : undefined
          }
        >
          {featured ? (
            <div className="hero-copy">
              <div className="eyebrow">
                Featured · #{featured.rank || featuredIndex + 1}
              </div>
              <h1>{featured.title}</h1>
              <div className="hero-meta">
                {[
                  featured.type,
                  featured.duration,
                  featured.episodes?.sub && `${featured.episodes.sub} episodes`,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
              <p>
                {featured.synopsis ||
                  "Find your next favorite anime and start watching today."}
              </p>
              <div className="actions">
                <a
                  className="button"
                  href={`/watch.html?id=${encodeURIComponent(featured.id)}`}
                >
                  Watch now <span>▶</span>
                </a>
                <a
                  className="button secondary"
                  href={`/detail.html?id=${encodeURIComponent(featured.id)}`}
                >
                  View details <span>→</span>
                </a>
              </div>
            </div>
          ) : error ? (
            <div className="loading">{error}</div>
          ) : (
            <div className="skeleton-hero-copy">
              <span className="skeleton skeleton-eyebrow" />
              <span className="skeleton skeleton-title" />
              <span className="skeleton skeleton-title skeleton-title-short" />
              <span className="skeleton skeleton-description" />
              <span className="skeleton skeleton-description skeleton-description-short" />
              <div className="skeleton-actions">
                <span className="skeleton skeleton-button" />
                <span className="skeleton skeleton-button" />
              </div>
            </div>
          )}
        </section>
        {topSearches.length > 0 && !search && !filtering && !listView && !filtered && (
          <section className="top-search-section content" aria-label="Top searches">
            <span className="section-kicker">Popular right now</span>
            <div className="genres">
              {topSearches.map((term) => {
                const title = typeof term === "string" ? term : term.title || term.name;
                return <button className="genre" type="button" key={title} onClick={() => setSearch(title || "")}>{title}</button>;
              })}
            </div>
          </section>
        )}
        {search ? (
          <SearchResults key={search} keyword={search} onClose={() => setSearch("")} />
        ) : filtering ? (
          <FilterPanel
            initialGenre={selectedGenre}
            onClose={() => {
              setSelectedGenre("");
              setFiltering(false);
            }}
            onResults={(result) => {
              setFiltered({ ...result, loading: false, error: "" });
              setSelectedGenre("");
              setFiltering(false);
            }}
          />
        ) : listView ? (
          <ListResults
            key={listView.query}
            title={listView.title}
            query={listView.query}
          />
        ) : (
          <section className="content">
            {filtered ? (
              <>
                <div className="section-heading">
                  <h2>Filtered anime</h2>
                  <button
                    className="button secondary"
                    onClick={() => setFiltered(null)}
                  >
                    Back to browse
                  </button>
                </div>
                {filtered.error ? (
                  <p className="loading">{filtered.error}</p>
                ) : filtered.loading ? (
                  <div className="filter-results search-skeleton">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <span className="skeleton skeleton-card" key={item} />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="filter-results">
                      {(filtered.data?.response || []).map((item) => (
                        <Card item={item} key={item.id} />
                      ))}
                    </div>
                    <Pagination
                      pageInfo={filtered.data?.pageInfo}
                      onPageChange={loadFilteredPage}
                    />
                  </>
                )}
              </>
            ) : error ? (
              <p className="loading">{error}</p>
            ) : home ? (
              <>
              <div className="content-with-sidebar">
                <div className="anime-rails">
                  <Rail
                    title="Trending now"
                    items={home.trending}
                    query="top-airing"
                    onViewAll={(title, query) => setListView({ title, query })}
                  />
                  <Rail
                    title="Top airing"
                    items={home.topAiring}
                    query="top-airing"
                    onViewAll={(title, query) => setListView({ title, query })}
                  />
                  <Rail
                    title="Most popular"
                    items={home.mostPopular}
                    query="most-popular"
                    onViewAll={(title, query) => setListView({ title, query })}
                  />
                  <Rail
                    title="New episodes"
                    items={home.latestEpisode}
                    query="recently-updated"
                    onViewAll={(title, query) => setListView({ title, query })}
                  />
                  <Rail
                    title="New additions"
                    items={home.newAdded}
                    query="recently-added"
                    onViewAll={(title, query) => setListView({ title, query })}
                  />
                  <Rail
                    title="Just completed"
                    items={home.latestCompleted}
                    query="completed"
                    onViewAll={(title, query) => setListView({ title, query })}
                  />
                </div>
                <aside className="content-sidebar">
                  <TopAnime top10={home.top10} />
                </aside>
              </div>
              </>
            ) : (
              <div className="rails-skeleton" aria-busy="true">
                {[1, 2, 3].map((rail) => (
                  <section className="skeleton-rail" key={rail}>
                    <div className="section-heading">
                      <span className="skeleton skeleton-heading" />
                    </div>
                    <div className="skeleton-cards">
                      {[1, 2, 3, 4, 5, 6].map((card) => (
                        <span className="skeleton skeleton-card" key={card} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      {!search && !filtering && !listView && !filtered && <Schedule />}
      {!search && !filtering && !listView && !filtered && (
        <div className="content">
          <Explore onList={(title, query) => setListView({ title, query })} />
        </div>
      )}
      {!search && !filtering && !listView && !filtered && (
        <footer className="kfooter">
          <div className="kf-torii" aria-hidden="true">
            <svg viewBox="0 0 1200 90" preserveAspectRatio="none">
              <path d="M0 90 V62 Q300 70 600 40 Q900 70 1200 62 V90 Z" fill="#0c0d14" />
              <path d="M0 62 Q300 70 600 40 Q900 70 1200 62" fill="none" stroke="url(#kfLine)" strokeWidth="2" />
              <defs>
                <linearGradient id="kfLine" x1="0" x2="1">
                  <stop offset="0" stopColor="#9c8cff" stopOpacity="0" />
                  <stop offset=".5" stopColor="#f2a7ff" />
                  <stop offset="1" stopColor="#ff9a62" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            {[0, 1, 2, 3, 4].map((n) => <i className="kf-wisp" style={{ "--n": n }} key={n} />)}
          </div>
          <div className="kf-inner">
            <div className="kf-brand">
              <a className="kf-logo" href="/">
                <img src="/kitsune-logo.png" alt="" width="46" height="48" />
                <span>Kitsune<b>wave</b></span>
              </a>
              <p>Follow the fox-fire to your next favorite anime. Stream, track and wander — one tail at a time.</p>
              <span className="kf-kanji" aria-hidden="true">狐</span>
            </div>
            <nav className="kf-col" aria-label="Footer pages">
              <h4>Wander</h4>
              <a href="/">Home</a>
              <a href="/movie.html">Movies</a>
              <a href="/news.html">News</a>
              <a href="/#schedule">Anime schedule</a>
            </nav>
            <nav className="kf-col" aria-label="Footer lists">
              <h4>Quick lists</h4>
              {[["Top airing", "top-airing"], ["Most popular", "most-popular"], ["New episodes", "recently-updated"], ["Just completed", "completed"]].map(([title, query]) => (
                <a
                  key={query}
                  href={`/?list=${encodeURIComponent(query)}&title=${encodeURIComponent(title)}`}
                  onClick={(event) => { event.preventDefault(); setListView({ title, query }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                >{title}</a>
              ))}
            </nav>
            <div className="kf-az">
              <h4>Anime A-Z</h4>
              <div className="kf-az-grid">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
                  <button
                    className="kf-letter"
                    type="button"
                    key={letter}
                    onClick={() => setListView({ title: `Anime ${letter}`, query: `az-list/${letter.toLowerCase()}` })}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="kf-bottom">
            <span>© {new Date().getFullYear()} Kitsunewave · For personal use</span>
            <span>Made with <em>🦊</em> and a little fox-fire</span>
          </div>
        </footer>
      )}
    </>
  );
}

function AnimeExtras({ animeId }) {
  const [schedule, setSchedule] = useState(null);
  const [characters, setCharacters] = useState(null);
  const [character, setCharacter] = useState(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    request(`/schedule/next/${encodeURIComponent(animeId)}`).then(setSchedule).catch(() => setSchedule(null));
  }, [animeId]);
  useEffect(() => {
    request(`/characters/${encodeURIComponent(animeId)}?page=${page}`).then(setCharacters).catch(() => setCharacters({ response: [] }));
  }, [animeId, page]);
  return <>
    {schedule && <section className="detail-section"><h2>Next episode</h2><p>{schedule.episode ? `Episode ${schedule.episode}` : "New episode"}{schedule.airingAt ? ` airs ${new Date(schedule.airingAt).toLocaleString()}` : ""}</p></section>}
    {characters?.response?.length > 0 && <section className="detail-section"><h2>Characters</h2>
      <div className="characters-grid">{characters.response.map((item) => <button className="character-card" type="button" key={item.id} onClick={() => request(`/character/${encodeURIComponent(item.id)}`).then(setCharacter).catch(() => setCharacter(null))}>
        {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" />}<span><strong>{item.name}</strong><small>{item.role}</small></span>
      </button>)}</div>
      <Pagination pageInfo={characters.pageInfo} onPageChange={setPage} />
      {character && <div className="character-profile"><strong>{character.name || character.title || "Character"}</strong><p>{character.description || character.about || "No biography available."}</p></div>}
    </section>}
  </>;
}

function Detail() {
  const id = new URLSearchParams(location.search).get("id");
  const [anime, setAnime] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return setError("An anime ID is required");
    request(`/anime/${encodeURIComponent(id)}`)
      .then((data) => {
        setAnime(data);
        document.title = `${data.title || "Anime details"} — Kitsunewave`;
      })
      .catch((err) => setError(err.message));
  }, [id]);
  if (error)
    return (
      <>
        <Header back />
        <main id="detail-page-content">
          <div className="watch-loading">{error}</div>
        </main>
      </>
    );
  if (!anime)
    return (
      <>
        <Header back />
        <main id="detail-page-content">
          <DetailSkeleton />
        </main>
      </>
    );
  return (
    <>
      <Header back />
      <main id="detail-page-content">
        <section className="detail-hero">
          {anime.poster && (
            <div
              className="detail-hero-backdrop"
              style={{ "--detail-image": `url("${anime.poster}")` }}
            />
          )}
          <div className="detail-hero-inner">
            <div className="detail-page-poster">
              <Poster item={anime} />
            </div>
            <div className="detail-page-copy">
              <div className="eyebrow">Anime details</div>
              <h1>{anime.title || "Untitled"}</h1>
              {anime.japanese && anime.japanese !== anime.title && (
                <p className="detail-alt-title">{anime.japanese}</p>
              )}
              <div className="detail-page-meta">
                {[
                  anime.type,
                  anime.status,
                  anime.rating,
                  anime.duration,
                  anime.MAL_score && `Score ${anime.MAL_score}`,
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <span key={item}>{item}</span>
                  ))}
              </div>
              <p className={`detail-lead${expanded ? " expanded" : ""}`}>
                {anime.synopsis || "No synopsis available."}
              </p>
              {(anime.synopsis || "").length > 360 && (
                <button
                  type="button"
                  className="detail-more"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
              <div className="actions">
                <a
                  className="button"
                  href={`/watch.html?id=${encodeURIComponent(id)}`}
                >
                  Watch now <span>▶</span>
                </a>
              </div>
            </div>
          </div>
        </section>
        <section className="detail-facts">
          <div className="detail-fact-group">
            <h2>Anime information</h2>
            <div className="detail-fact-grid">
              <div>
                <strong>Japanese</strong>
                <span>{anime.japanese || "Not available"}</span>
              </div>
              <div>
                <strong>Premiered</strong>
                <span>{anime.premiered || "Not available"}</span>
              </div>
              <div>
                <strong>Episodes</strong>
                <span>
                  SUB {anime.episodes?.sub || 0} · DUB{" "}
                  {anime.episodes?.dub || 0}
                </span>
              </div>
              <div>
                <strong>Studios</strong>
                <span>{anime.studios?.join(", ") || "Not available"}</span>
              </div>
            </div>
          </div>
          <div className="detail-fact-group">
            <h2>Genres</h2>
            <div className="detail-tags">
              {(anime.genres || ["Not available"]).map((genre) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>
          </div>
        </section>
        <AnimeExtras animeId={id} />
      </main>
    </>
  );
}

function Watch() {
  const id = new URLSearchParams(location.search).get("id");
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [language, setLanguage] = useState("sub");
  const [serverGroups, setServerGroups] = useState({});
  const [server, setServer] = useState(null);
  const [player, setPlayer] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return setError("An anime ID is required");
    Promise.all([
      request(`/anime/${encodeURIComponent(id)}`),
      request(`/episodes/${encodeURIComponent(id)}`),
    ])
      .then(([details, list]) => {
        setAnime(details);
        setEpisodes(list);
        setSelected(list.find((episode) => episode.sub) || list[0]);
      })
      .catch((err) => setError(err.message));
  }, [id]);
  useEffect(() => {
    if (!selected) return;
    const loadServers = async () => {
      const queryFor = (type) => {
        const query = new URLSearchParams({ type });
        if (selected.aniId) query.set("ani", selected.aniId);
        if (selected.malId) query.set("mal", selected.malId);
        return query;
      };
      const results = await Promise.allSettled(
        ["sub", "dub"].map((type) =>
          request(
            `/servers/${encodeURIComponent(selected.id)}?${queryFor(type)}`,
          ),
        ),
      );
      const groups = {};
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.servers?.length) {
          const servers = embeddedServers(result.value.servers);
          if (servers.length) groups[index === 0 ? "sub" : "dub"] = servers;
        }
      });
      if (!groups.dub && groups.sub)
        groups.dub = dubFallbackServers(groups.sub);
      setServerGroups(groups);
      const available = groups[language] || groups.sub || groups.dub || [];
      setServer(
        available.find((item) => /^s-?2$/i.test(item.serverName || "")) ||
          available[0] ||
          null,
      );
    };
    loadServers().catch((err) => setError(err.message));
  }, [selected, language]);
  useEffect(() => {
    setPlayer(autoplayUrl(server?.iframe));
  }, [server]);
  const visibleEpisodes = episodes.filter((episode) =>
    language === "dub" ? episode.dub : episode.sub,
  );
  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    const nextEpisode = episodes.find((episode) =>
      nextLanguage === "dub" ? episode.dub : episode.sub,
    );
    if (nextEpisode) setSelected(nextEpisode);
  };
  const hasDub = episodes.some((episode) => episode.dub);
  const related = [
    ...(anime?.related || []),
    ...(anime?.recommended || []),
    ...(anime?.mostPopular || []),
  ]
    .filter(
      (item, index, list) =>
        item.id &&
        list.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, 10);
  return (
    <>
      <Header back />
      <main id="watch-page-content">
        {error ? (
          <div className="watch-loading">{error}</div>
        ) : !anime ? (
          <WatchSkeleton />
        ) : (
          <>
            <div className="watch-layout">
              <aside className="episode-sidebar">
                <div className="watch-selectors">
                  <button
                    className={`watch-select${language === "sub" ? " active" : ""}`}
                    type="button"
                    onClick={() => changeLanguage("sub")}
                  >
                    SUB
                  </button>
                  {hasDub && (
                    <button
                      className={`watch-select${language === "dub" ? " active" : ""}`}
                      type="button"
                      onClick={() => changeLanguage("dub")}
                    >
                      DUB
                    </button>
                  )}
                </div>
                <div className="episode-heading">
                  <span className="section-kicker">
                    {language.toUpperCase()} episodes
                  </span>
                  <strong>{visibleEpisodes.length} available</strong>
                </div>
                <div className="episodes">
                  {visibleEpisodes.map((episode) => (
                    <button
                      className={`episode${selected?.id === episode.id ? " active" : ""}`}
                      title={episode.title}
                      key={`${language}-${episode.id}`}
                      onClick={() => setSelected(episode)}
                    >
                      {episode.episodeNumber}
                      {episode.isFiller ? " · filler" : ""}
                    </button>
                  ))}
                </div>
              </aside>
              <section className="watch-main">
                <div className="player-notice">
                  You are watching <strong>{anime.title}</strong>. If the
                  current server does not work, try another server below.
                </div>
                <div className="watch-player">
                  {player ? (
                    <iframe
                      key={player}
                      src={player}
                      title="Anime player"
                      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                      allowFullScreen
                      loading="eager"
                      referrerPolicy="origin"
                    />
                  ) : (
                    <div className="loading">Loading player...</div>
                  )}
                </div>
                <div className="server-list">
                  {Object.entries(serverGroups).map(([type, group]) => (
                    <div className={`server-row server-row-${type}`} key={type}>
                      <strong className="server-label">
                        {type === "sub" ? "CC" : "🎙"}{" "}
                        <span>{type.toUpperCase()}:</span>
                      </strong>
                      <div className="server-options">
                        {group.map((item) => (
                          <button
                            className={`server-button${server?.serverId === item.serverId ? " active" : ""}`}
                            type="button"
                            key={item.serverId}
                            onClick={() => {
                              setLanguage(type);
                              setServer(item);
                            }}
                          >
                            {item.serverName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <aside className="related-sidebar">
                <h3>Related anime</h3>
                <div className="related-list">
                  {related.length ? (
                    related.map((item) => (
                      <a
                        className="related-item"
                        href={`/watch.html?id=${encodeURIComponent(item.id)}`}
                        key={item.id}
                      >
                        <Poster item={item} className="related-poster" />
                        <span>
                          <strong>{item.title || "Untitled"}</strong>
                          <small>
                            {[item.type, item.duration]
                              .filter(Boolean)
                              .join(" · ") || "Anime"}
                          </small>
                        </span>
                      </a>
                    ))
                  ) : (
                    <p className="loading">No related anime found.</p>
                  )}
                </div>
              </aside>
            </div>
            <section className="detail-info">
              <div className="detail-poster-wrap">
                <Poster item={anime} className="detail-poster" />
                <span className="detail-poster-label">Now streaming</span>
              </div>
              <div className="detail-copy">
                <div className="eyebrow">
                  {anime.type || "Anime"} · {anime.status || "Available"}
                </div>
                <h2>{anime.title || "Untitled"}</h2>
                <div className="meta">
                  {[
                    anime.type,
                    anime.status,
                    anime.MAL_score && `Score ${anime.MAL_score}`,
                  ]
                    .filter(Boolean)
                    .map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                </div>
                <div className="synopsis">
                  <h3>Synopsis</h3>
                  <p>{anime.synopsis || "No synopsis available."}</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Movies() {
  return (
    <>
      <Header back />
      <main className="content movie-page">
        <ListResults title="Movies" query="movie" />
      </main>
    </>
  );
}

function App() {
  if (location.pathname.endsWith("detail.html")) return <Detail />;
  if (location.pathname.endsWith("watch.html")) return <Watch />;
  if (location.pathname.endsWith("news.html")) return <News />;
  if (location.pathname.endsWith("movie.html")) return <Movies />;
  return <Home />;
}

createRoot(document.getElementById("root")).render(<App />);
