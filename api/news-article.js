// Fetches the full text of an Anime News Network article so the news page can
// show it inline. Only a numeric article id is accepted, and the host is fixed,
// so this can't be used to fetch arbitrary URLs.
const decode = (text) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const clean = (html) =>
  decode(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();

export function extractParagraphs(html) {
  // ANN wraps the story in div.KonaBody (inside div.meat).
  let start = html.search(/class="[^"]*KonaBody[^"]*"/);
  if (start === -1) start = html.search(/class="[^"]*\bmeat\b[^"]*"/);
  if (start === -1) return [];
  const tagEnd = html.indexOf('>', start);
  let slice = html.slice(tagEnd === -1 ? start : tagEnd + 1, start + 150000);

  // Cut off at the footer that follows the story.
  const end = slice.search(/Disclosure:|discuss this in the forum|<div[^>]*class="[^"]*(?:meat-footer|relatedtopics)/i);
  if (end > 0) slice = slice.slice(0, end);

  const text = slice
    .replace(/<(script|style|figcaption)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const lines = decode(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !/^Image via\b/i.test(line) && !/^posted on\b/i.test(line))
    // image alt text / filenames that leak through (e.g. "trooper1", "samurai-troopers")
    .filter((line) => !/^[\w-]+$/.test(line) || line.length > 24);

  const out = [];
  for (const line of lines) {
    if (out.length >= 80) break;
    out.push(line);
    if (/^Sources?:/i.test(line)) break;
  }
  return out;
}

export default async function handler(req, res) {
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

  // Same "only my own page" check as the main API proxy.
  const sfs = req.headers['sec-fetch-site'];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let refererHost = '';
  try {
    refererHost = new URL(req.headers.referer || '').host;
  } catch {}
  const allowed =
    req.headers['x-kitsune-client'] === 'web' ||
    sfs === 'same-origin' ||
    (refererHost && refererHost === host);
  if (!allowed) return res.status(403).json({ success: false, message: 'Forbidden' });

  const url = new URL(req.url, 'http://localhost');
  const id = url.searchParams.get('id') || '';
  if (!/^\d{3,9}$/.test(id)) {
    return res.status(400).json({ success: false, message: 'Invalid article id' });
  }

  try {
    const upstream = await fetch(`https://www.animenewsnetwork.com/.${id}`, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!upstream.ok) {
      return res.status(502).json({ success: false, message: `Source returned ${upstream.status}` });
    }
    const paragraphs = extractParagraphs(await upstream.text());
    if (!paragraphs.length) {
      return res.status(502).json({ success: false, message: 'Could not read the article' });
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).json({ success: true, data: { paragraphs } });
  } catch {
    return res.status(502).json({ success: false, message: 'Source error' });
  }
}
