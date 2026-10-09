// Server-side proxy: hides the upstream API URL and blocks direct visits.
// vercel.json rewrites /api/* to this function as /api/proxy?path=*
export default async function handler(req, res) {
  // Allow only requests made by YOUR page. Two signals, either is enough:
  //  1) Sec-Fetch-Site=same-origin (set by browsers for same-site fetch calls)
  //  2) Referer host matches this site (fallback if the header is stripped)
  // Typing the URL in the address bar has neither, so it gets blocked.
  const sfs = req.headers['sec-fetch-site'];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let refererHost = '';
  try {
    refererHost = new URL(req.headers.referer || '').host;
  } catch {}
  const allowed = sfs === 'same-origin' || (refererHost && refererHost === host);
  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: `Forbidden (sec-fetch-site: ${sfs || 'none'}, referer: ${refererHost || 'none'}, host: ${host})`,
    });
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

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, message: 'Upstream error' });
  }
}
