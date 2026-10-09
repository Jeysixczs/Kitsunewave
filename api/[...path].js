// Server-side proxy: hides the upstream API URL and blocks direct visits.
export default async function handler(req, res) {
  // Browsers set Sec-Fetch-Site=same-origin when YOUR page calls fetch().
  // Typing the URL in the address bar gives "none"; other sites give "cross-site".
  if (req.headers['sec-fetch-site'] !== 'same-origin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const base = process.env.UPSTREAM_API;
  if (!base) return res.status(500).json({ error: 'UPSTREAM_API is not set' });

  const rest = req.url.replace(/^\/api/, '');

  try {
    const upstream = await fetch(base + rest);
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: 'Upstream error' });
  }
}
