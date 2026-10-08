import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = 'https://kitsuneapi.vercel.app/api/v2';

function autoplayUrl(url) {
  if (!url) return '';
  const embedUrl = new URL(url);
  embedUrl.searchParams.set('autoplay', '1');
  embedUrl.searchParams.set('autoPlay', '1');
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
      return new URL(item.iframe).hostname !== 'flixera.co';
    } catch {
      return false;
    }
  });
}

function dubFallbackServers(servers) {
  return servers.map((item) => ({
    ...item,
    iframe: item.iframe.replace(/\/sub(?=[/?]|$)/, '/dub'),
  }));
}

function Header({ back = false, onSearch }) {
  const [keyword, setKeyword] = useState('');
  return (
    <header className={back ? 'watch-header' : 'topbar'}>
      <a className="brand" href="/">
        <span className="brand-mark">K</span>
        <span>Kitsunewave</span>
      </a>
      {back ? <a className="watch-back" href="/">← Back to browse</a> : (
        <form className="search" onSubmit={(event) => { event.preventDefault(); onSearch?.(keyword); }}>
          <input aria-label="Search anime" placeholder="Search anime..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <button aria-label="Search" type="submit">⌕</button>
        </form>
      )}
    </header>
  );
}

function Poster({ item, className = '' }) {
  return item?.poster ? <img loading="lazy" className={className} src={item.poster} alt={item.title || 'Anime'} /> : null;
}

function Card({ item }) {
  return (
    <a className="card" href={`/detail.html?id=${encodeURIComponent(item.id)}`}>
      <div className="poster">
        <Poster item={item} />
        {item.episodes?.sub && <span className="badge">{item.episodes.sub} eps</span>}
      </div>
      <h3>{item.title || 'Untitled'}</h3>
      <p>{[item.type, item.duration].filter(Boolean).join(' · ')}</p>
    </a>
  );
}

function Rail({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="section-heading"><h2>{title}</h2></div>
      <div className="rail">{items.map((item) => <Card item={item} key={item.id} />)}</div>
    </section>
  );
}

function HomeSkeleton() {
  return <div className="home-loading" aria-busy="true" aria-label="Loading anime">
    <section className="hero hero-skeleton">
      <div className="skeleton-hero-copy"><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-title skeleton-title-short" /><span className="skeleton skeleton-description" /><span className="skeleton skeleton-description skeleton-description-short" /><div className="skeleton-actions"><span className="skeleton skeleton-button" /><span className="skeleton skeleton-button" /></div></div>
    </section>
    <section className="content"><div className="rails-skeleton">{[1, 2, 3].map((rail) => <section className="skeleton-rail" key={rail}><div className="section-heading"><span className="skeleton skeleton-heading" /></div><div className="skeleton-cards">{[1, 2, 3, 4, 5, 6].map((card) => <span className="skeleton skeleton-card" key={card} />)}</div></section>)}</div></section>
  </div>;
}

function DetailSkeleton() {
  return <div className="detail-skeleton" aria-busy="true" aria-label="Loading anime details"><div className="skeleton-detail-hero"><div className="skeleton-detail-poster" /><div className="skeleton-detail-copy"><span /><span /><span /><span /><span /></div></div><div className="skeleton-detail-section"><span /><span /><span /></div><div className="skeleton-detail-section"><span /><span /><span /></div></div>;
}

function WatchSkeleton() {
  return <div className="watch-skeleton" aria-busy="true" aria-label="Loading watch page"><div className="skeleton-watch-layout"><aside className="skeleton-panel skeleton-episodes" /><section className="skeleton-panel skeleton-player" /><aside className="skeleton-panel skeleton-related" /></div><div className="skeleton-watch-details"><div className="skeleton-poster" /><div className="skeleton-copy"><span /><span /><span /><span /></div></div></div>;
}

function SearchResults({ keyword, onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!keyword.trim()) return;
    setItems(null);
    request(`/search?keyword=${encodeURIComponent(keyword)}&page=1`).then((data) => setItems(data.response || [])).catch((err) => setError(err.message));
  }, [keyword]);
  return <section className="search-view content"><div className="section-heading"><h2>Results for “{keyword}”</h2><button className="button secondary" onClick={onClose}>Back to browse</button></div>{error ? <p className="loading">{error}</p> : !items ? <div className="skeleton-cards search-skeleton">{[1, 2, 3, 4, 5, 6].map((item) => <span className="skeleton skeleton-card" key={item} />)}</div> : <div className="filter-results">{items.map((item) => <Card item={item} key={item.id} />)}</div>}</section>;
}

function Schedule() {
  const [schedule, setSchedule] = useState(null);
  const [date, setDate] = useState('');
  useEffect(() => { request('/schedules').then((data) => { setSchedule(data); setDate(Object.keys(data)[0] || ''); }).catch(() => setSchedule({})); }, []);
  const shows = schedule?.[date] || [];
  if (!schedule) return <section className="schedule-section content" aria-busy="true"><div className="section-heading"><span className="skeleton skeleton-heading" /></div><div className="schedule-loading"><span className="skeleton schedule-loading-line" /><span className="skeleton schedule-loading-line schedule-loading-short" /></div></section>;
  return <section className="schedule-section content"><div className="section-heading"><div><span className="section-kicker">Plan your watchlist</span><h2>Anime schedule</h2></div></div><div className="schedule-tabs">{Object.keys(schedule).map((item) => <button className={`schedule-tab${item === date ? ' active' : ''}`} key={item} onClick={() => setDate(item)}><strong>{item === Object.keys(schedule)[0] ? 'Today' : new Date(`${item}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</strong><small>{item}</small></button>)}</div><div className="schedule-list active">{shows.length ? shows.map((show) => <a className="schedule-item" href={`/detail.html?id=${encodeURIComponent(show.id)}`} key={`${show.id}-${show.episode}`}><span className="schedule-time">{show.time || 'TBA'}</span><span className="schedule-info"><strong>{show.title}</strong><small>Episode {show.episode || 'TBA'}</small></span><span className="schedule-arrow">→</span></a>) : <p className="schedule-empty">No releases scheduled for this day.</p>}</div></section>;
}

function FilterPanel({ onResults }) {
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({ type: 'all', status: 'all', sort: 'default', genres: [] });
  useEffect(() => { request('/filter/options').then(setOptions).catch(() => setOptions({})); }, []);
  if (!options) return <section className="content" aria-busy="true"><div className="filter-loading"><span className="skeleton skeleton-filter-line" /><span className="skeleton skeleton-filter-line" /><span className="skeleton skeleton-filter-line skeleton-filter-line-short" /></div></section>;
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const apply = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(form).forEach(([key, value]) => { if (Array.isArray(value) ? value.length : value && value !== 'all' && value !== 'default') params.set(key, Array.isArray(value) ? value.join(',') : value); });
    request(`/filter?${params}`).then((data) => onResults(data.response || [])).catch(() => onResults([]));
  };
  return <section className="content"><form className="filter-grid" onSubmit={apply}>{['type', 'status', 'rated', 'score', 'season', 'language', 'sort'].map((name) => <label className="filter-field" key={name}><span>{name}</span><select value={form[name] || 'all'} onChange={(event) => update(name, event.target.value)}>{(options[name] || ['all']).map((value) => <option value={value} key={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>)}<label className="filter-field"><span>Genres</span><select multiple value={form.genres} onChange={(event) => update('genres', [...event.target.selectedOptions].map((option) => option.value))}>{(options.genres || []).map((genre) => <option value={genre} key={genre}>{genre}</option>)}</select></label><button className="button" type="submit">Apply filters</button></form></section>;
}

function Home() {
  const [home, setHome] = useState(null);
  const [error, setError] = useState('');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [filtering, setFiltering] = useState(false);
  const [filtered, setFiltered] = useState(null);

  useEffect(() => {
    request('/home').then(setHome).catch((err) => setError(err.message));
  }, []);

  const spotlight = home?.spotlight || [];
  const featured = spotlight[featuredIndex];
  useEffect(() => {
    if (spotlight.length < 2) return undefined;
    const timer = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % spotlight.length), 6000);
    return () => window.clearInterval(timer);
  }, [spotlight.length]);

  return (
    <>
      <Header onSearch={(keyword) => setSearch(keyword.trim())} />
      <main id="home">
        <section className={`hero${!home && !error ? ' hero-skeleton' : ''}`} style={featured?.poster ? { '--hero-image': `url("${featured.poster}")` } : undefined}>
          {featured ? (
            <div className="hero-copy">
              <div className="eyebrow">Featured · #{featured.rank || featuredIndex + 1}</div>
              <h1>{featured.title}</h1>
              <div className="hero-meta">{[featured.type, featured.duration, featured.episodes?.sub && `${featured.episodes.sub} episodes`].filter(Boolean).join(' • ')}</div>
              <p>{featured.synopsis || 'Find your next favorite anime and start watching today.'}</p>
              <div className="actions">
                <a className="button" href={`/watch.html?id=${encodeURIComponent(featured.id)}`}>Watch now <span>▶</span></a>
                <a className="button secondary" href={`/detail.html?id=${encodeURIComponent(featured.id)}`}>View details <span>→</span></a>
              </div>
            </div>
          ) : error ? <div className="loading">{error}</div> : <div className="skeleton-hero-copy"><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-title skeleton-title-short" /><span className="skeleton skeleton-description" /><span className="skeleton skeleton-description skeleton-description-short" /><div className="skeleton-actions"><span className="skeleton skeleton-button" /><span className="skeleton skeleton-button" /></div></div>}
        </section>
        {search ? <SearchResults keyword={search} onClose={() => setSearch('')} /> : filtering ? <FilterPanel onResults={(items) => { setFiltered(items); setFiltering(false); }} /> : <section className="content">
          {filtered ? <><div className="section-heading"><h2>Filtered anime</h2><button className="button secondary" onClick={() => setFiltered(null)}>Back to browse</button></div><div className="filter-results">{filtered.map((item) => <Card item={item} key={item.id} />)}</div></> : error ? <p className="loading">{error}</p> : home ? (
            <div className="content-with-sidebar">
              <div className="anime-rails">
                <Rail title="Trending now" items={home.trending} />
                <Rail title="Top airing" items={home.topAiring} />
                <Rail title="Most popular" items={home.mostPopular} />
                <Rail title="New episodes" items={home.latestEpisode} />
                <Rail title="New additions" items={home.newAdded} />
                <Rail title="Just completed" items={home.latestCompleted} />
              </div>
              <aside className="content-sidebar">
                <div className="section-heading"><h2>Top anime</h2></div>
                {(home.top10?.today || []).slice(0, 5).map((item, index) => <a className="top-anime-item" href={`/detail.html?id=${encodeURIComponent(item.id)}`} key={item.id}><span className="top-anime-rank">{String(index + 1).padStart(2, '0')}</span><Poster item={item} /><span className="top-anime-info"><strong>{item.title}</strong><small>{item.type || 'Anime'}</small></span></a>)}
                <div className="section-heading"><h2>Explore genres</h2></div>
                <div className="genres">{(home.genres || []).map((genre) => <button className="genre" type="button" onClick={() => setSearch(genre)} key={genre}>{genre}</button>)}</div>
                <button className="button secondary" type="button" onClick={() => setFiltering(true)}>Open filters</button>
              </aside>
            </div>
          ) : <div className="rails-skeleton" aria-busy="true">{[1, 2, 3].map((rail) => <section className="skeleton-rail" key={rail}><div className="section-heading"><span className="skeleton skeleton-heading" /></div><div className="skeleton-cards">{[1, 2, 3, 4, 5, 6].map((card) => <span className="skeleton skeleton-card" key={card} />)}</div></section>)}</div>}
        </section>}
      </main>
      {!search && !filtering && <Schedule />}
      {!search && !filtering && <footer><div className="footer-inner"><div className="footer-heading"><span className="section-kicker">Browse alphabetically</span><strong>Anime A-Z</strong></div><div className="az-list">{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => <button className="az-letter" type="button" key={letter} onClick={() => setSearch(letter)}>{letter}</button>)}</div><p>Powered by Kitsunewave · For personal use</p></div></footer>}
    </>
  );
}

function Detail() {
  const id = new URLSearchParams(location.search).get('id');
  const [anime, setAnime] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return setError('An anime ID is required');
    request(`/anime/${encodeURIComponent(id)}`).then((data) => {
      setAnime(data);
      document.title = `${data.title || 'Anime details'} — Kitsunewave`;
    }).catch((err) => setError(err.message));
  }, [id]);
  if (error) return <><Header back /><main id="detail-page-content"><div className="watch-loading">{error}</div></main></>;
  if (!anime) return <><Header back /><main id="detail-page-content"><DetailSkeleton /></main></>;
  return (
    <>
      <Header back />
      <main id="detail-page-content">
        <section className="detail-hero">
          <div className="detail-hero-inner">
            <div className="detail-page-poster"><Poster item={anime} /></div>
            <div className="detail-page-copy">
              <div className="eyebrow">{anime.type || 'Anime'} · {anime.status || 'Available'}</div>
              <h1>{anime.title || 'Untitled'}</h1>
              <div className="detail-page-meta">{[anime.type, anime.status, anime.rating, anime.duration, anime.MAL_score && `Score ${anime.MAL_score}`].filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div>
              <p className="detail-lead">{anime.synopsis || 'No synopsis available.'}</p>
              <div className="actions"><a className="button" href={`/watch.html?id=${encodeURIComponent(id)}`}>Watch now <span>▶</span></a></div>
            </div>
          </div>
        </section>
        <section className="detail-facts">
          <div className="detail-fact-group"><h2>Anime information</h2><div className="detail-fact-grid">
            <div><strong>Japanese</strong><span>{anime.japanese || 'Not available'}</span></div>
            <div><strong>Premiered</strong><span>{anime.premiered || 'Not available'}</span></div>
            <div><strong>Episodes</strong><span>SUB {anime.episodes?.sub || 0} · DUB {anime.episodes?.dub || 0}</span></div>
            <div><strong>Studios</strong><span>{anime.studios?.join(', ') || 'Not available'}</span></div>
          </div></div>
          <div className="detail-fact-group"><h2>Genres</h2><div className="detail-tags">{(anime.genres || ['Not available']).map((genre) => <span key={genre}>{genre}</span>)}</div></div>
        </section>
      </main>
    </>
  );
}

function Watch() {
  const id = new URLSearchParams(location.search).get('id');
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [language, setLanguage] = useState('sub');
  const [serverGroups, setServerGroups] = useState({});
  const [server, setServer] = useState(null);
  const [player, setPlayer] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return setError('An anime ID is required');
    Promise.all([request(`/anime/${encodeURIComponent(id)}`), request(`/episodes/${encodeURIComponent(id)}`)])
      .then(([details, list]) => { setAnime(details); setEpisodes(list); setSelected(list.find((episode) => episode.sub) || list[0]); })
      .catch((err) => setError(err.message));
  }, [id]);
  useEffect(() => {
    if (!selected) return;
    const loadServers = async () => {
      const queryFor = (type) => {
        const query = new URLSearchParams({ type });
        if (selected.aniId) query.set('ani', selected.aniId);
        if (selected.malId) query.set('mal', selected.malId);
        return query;
      };
      const results = await Promise.allSettled(['sub', 'dub'].map((type) => request(`/servers/${encodeURIComponent(selected.id)}?${queryFor(type)}`)));
      const groups = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.servers?.length) {
          const servers = embeddedServers(result.value.servers);
          if (servers.length) groups[index === 0 ? 'sub' : 'dub'] = servers;
        }
      });
      if (!groups.dub && groups.sub) groups.dub = dubFallbackServers(groups.sub);
      setServerGroups(groups);
      const available = groups[language] || groups.sub || groups.dub || [];
      setServer(available.find((item) => /^s-?2$/i.test(item.serverName || '')) || available[0] || null);
    };
    loadServers().catch((err) => setError(err.message));
  }, [selected, language]);
  useEffect(() => { setPlayer(autoplayUrl(server?.iframe)); }, [server]);
  const visibleEpisodes = episodes.filter((episode) => language === 'dub' ? episode.dub : episode.sub);
  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    const nextEpisode = episodes.find((episode) => nextLanguage === 'dub' ? episode.dub : episode.sub);
    if (nextEpisode) setSelected(nextEpisode);
  };
  const hasDub = episodes.some((episode) => episode.dub);
  const related = [...(anime?.related || []), ...(anime?.recommended || []), ...(anime?.mostPopular || [])].filter((item, index, list) => item.id && list.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 10);
  return <><Header back /><main id="watch-page-content">{error ? <div className="watch-loading">{error}</div> : !anime ? <WatchSkeleton /> : <>
    <div className="watch-layout">
      <aside className="episode-sidebar">
        <div className="watch-selectors"><button className={`watch-select${language === 'sub' ? ' active' : ''}`} type="button" onClick={() => changeLanguage('sub')}>SUB</button>{hasDub && <button className={`watch-select${language === 'dub' ? ' active' : ''}`} type="button" onClick={() => changeLanguage('dub')}>DUB</button>}</div>
        <div className="episode-heading"><span className="section-kicker">{language.toUpperCase()} episodes</span><strong>{visibleEpisodes.length} available</strong></div>
        <div className="episodes">{visibleEpisodes.map((episode) => <button className={`episode${selected?.id === episode.id ? ' active' : ''}`} title={episode.title} key={`${language}-${episode.id}`} onClick={() => setSelected(episode)}>{episode.episodeNumber}{episode.isFiller ? ' · filler' : ''}</button>)}</div>
      </aside>
      <section className="watch-main">
        <div className="player-notice">You are watching <strong>{anime.title}</strong>. If the current server does not work, try another server below.</div>
        <div className="watch-player">{player ? <iframe key={player} src={player} title="Anime player" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen loading="eager" referrerPolicy="origin" /> : <div className="loading">Loading player...</div>}</div>
        <div className="server-list">{Object.entries(serverGroups).map(([type, group]) => <div className={`server-row server-row-${type}`} key={type}><strong className="server-label">{type === 'sub' ? 'CC' : '🎙'} <span>{type.toUpperCase()}:</span></strong><div className="server-options">{group.map((item) => <button className={`server-button${server?.serverId === item.serverId ? ' active' : ''}`} type="button" key={item.serverId} onClick={() => { setLanguage(type); setServer(item); }}>{item.serverName}</button>)}</div></div>)}</div>
      </section>
      <aside className="related-sidebar"><h3>Related anime</h3><div className="related-list">{related.length ? related.map((item) => <a className="related-item" href={`/watch.html?id=${encodeURIComponent(item.id)}`} key={item.id}><Poster item={item} className="related-poster" /><span><strong>{item.title || 'Untitled'}</strong><small>{[item.type, item.duration].filter(Boolean).join(' · ') || 'Anime'}</small></span></a>) : <p className="loading">No related anime found.</p>}</div></aside>
    </div>
    <section className="detail-info"><div className="detail-poster-wrap"><Poster item={anime} className="detail-poster" /><span className="detail-poster-label">Now streaming</span></div><div className="detail-copy"><div className="eyebrow">{anime.type || 'Anime'} · {anime.status || 'Available'}</div><h2>{anime.title || 'Untitled'}</h2><div className="meta">{[anime.type, anime.status, anime.MAL_score && `Score ${anime.MAL_score}`].filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div><div className="synopsis"><h3>Synopsis</h3><p>{anime.synopsis || 'No synopsis available.'}</p></div></div></section>
  </>}</main></>;
}

function App() {
  if (location.pathname.endsWith('detail.html')) return <Detail />;
  if (location.pathname.endsWith('watch.html')) return <Watch />;
  return <Home />;
}

createRoot(document.getElementById('root')).render(<App />);
