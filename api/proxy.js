import articleHandler from './news-article.js';

// Server-side proxy: hides the upstream API URL and blocks direct visits.
// vercel.json rewrites /api/* to this function as /api/proxy?path=*
export default async function handler(req, res) {
  // CORS: let your other projects call this API from the browser.
  // Set ALLOWED_ORIGINS in Vercel, comma-separated, e.g.
  //   https://my-client.vercel.app,https://other.example.com
  // localhost/127.0.0.1 are always allowed for local testing.
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  if (origin && (isLocal || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'X-Kitsune-Client');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Allow only requests made by YOUR page. Any one of these signals is enough:
  //  1) X-Kitsune-Client header, which the frontend adds to every request
  //  2) Sec-Fetch-Site=same-origin
  //  3) Referer host matches this site
  // Typing the URL in the address bar has none of these, so it gets blocked.
  const sfs = req.headers['sec-fetch-site'];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let refererHost = '';
  try {
    refererHost = new URL(req.headers.referer || '').host;
  } catch {}
  const hasClientHeader = req.headers['x-kitsune-client'] === 'web';
  const allowed =
    hasClientHeader || sfs === 'same-origin' || (refererHost && refererHost === host);
  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: `Forbidden (sec-fetch-site: ${sfs || 'none'}, referer: ${refererHost || 'none'}, host: ${host})`,
    });
  }

  // Full news article text is scraped by its own function (not the upstream API).
  if (new URL(req.url, 'http://localhost').searchParams.get('path') === 'news-article') {
    return articleHandler(req, res);
  }

  const base = (process.env.UPSTREAM_API || '').replace(/\/+$/, '');
  if (!base) {
    return res.status(500).json({ success: false, message: 'UPSTREAM_API is not set' });
  }

  const url = new URL(req.url, 'http://localhost');
  const pathParam = url.searchParams.get('path') || '';
  url.searchParams.delete('path');
  const rest = '/' + pathParam.replace(/^\/+/, '');
  const target = base + rest + (url.search || '');

  try {
    const upstream = await fetch(target, { headers: { Accept: 'application/json' } });
    const body = await upstream.text();

    let json;
    try {
      json = JSON.parse(body);
    } catch {
      return res.status(upstream.status === 200 ? 502 : upstream.status).json({
        success: false,
        message: `Upstream returned ${upstream.status} for ${rest}`,
      });
    }

    // private = browser cache only. A shared CDN cache would serve the JSON to
    // address-bar visitors too, bypassing the check above.
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, message: 'Upstream error' });
  }
}
