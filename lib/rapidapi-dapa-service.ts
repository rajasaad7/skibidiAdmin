// ============================================================
// RapidAPI "Bulk Moz DA PA SS Checker" service
// (replaced dapachecker.org on 2026-11-09)
// ============================================================
// Listing: https://rapidapi.com/dapacheckerpro/api/bulk-moz-da-pa-ss-checker
// Endpoint: POST https://bulk-moz-da-pa-ss-checker.p.rapidapi.com/dapa-checker
// Body:     { "urls": ["seo.com", "fb.com", ...] }  (max 500 URLs per request)
// Plan:     Pro $20/mo (2026-11-09): 1,000 requests/month HARD limit, 1 request/second,
//           500 URLs/request, 700k URLs/month. Quota counts REQUESTS, so batch 500.
// Response: { success, message, data: { "<domain>": { domain_authority,
//             page_authority, spam_score, last_crawled, pages_crawled_from_pld,
//             fqdn, pld, url, ... } } }
//           Keys are the normalised domain (https://www.fb.com/ -> "fb.com").
//           Entries missing from `data` are reported as not found; a null
//           spam_score (never crawled) is treated as 0 by the route.
// ============================================================

const RAPIDAPI_HOST = 'bulk-moz-da-pa-ss-checker.p.rapidapi.com';
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}/dapa-checker`;

/** Hard limit of the vendor endpoint. */
export const RAPIDAPI_DAPA_MAX_URLS = 500;

export interface DapaResult {
  domain: string;
  da: number | null;
  spamScore: number | null;
  found: boolean;
  error?: string;
}

function cleanDomain(d: string): string {
  return String(d || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '');
}

function clean(d: string): string {
  return cleanDomain(d).toLowerCase();
}

function toNum(v: any): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Fetch DA + Spam Score for a batch of domains in ONE RapidAPI request
 * (caller caps the size at RAPIDAPI_DAPA_MAX_URLS).
 * Returns one DapaResult per input domain (always same length/order).
 */
export async function fetchDapaBatch(domains: string[], apiKey: string): Promise<DapaResult[]> {
  const cleaned = domains.map(cleanDomain);
  const fail = (error: string): DapaResult[] =>
    cleaned.map((domain) => ({ domain, da: null, spamScore: null, found: false, error }));

  if (cleaned.length > RAPIDAPI_DAPA_MAX_URLS) {
    return fail(`Batch too large (${cleaned.length} > ${RAPIDAPI_DAPA_MAX_URLS})`);
  }

  let res: Response;
  try {
    res = await fetch(RAPIDAPI_URL, {
      method: 'POST',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ urls: cleaned }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (err: any) {
    return fail(`Network error: ${err?.message || err}`);
  }

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* not JSON */
  }

  // RapidAPI gateway errors come as { message: "..." }; the vendor uses { success, message }.
  const apiMsg = parsed && (parsed.message || parsed.error) ? `: ${parsed.message || parsed.error}` : '';

  let batchError: string | null = null;
  if (res.status === 429) {
    // RapidAPI: "You have exceeded the MONTHLY quota ..." vs a per-second rate limit.
    batchError = /quota/i.test(apiMsg)
      ? `429 Quota exceeded${apiMsg} (upgrade the RapidAPI plan)`
      : `429 Rate limit${apiMsg}`;
  } else if (res.status === 401) batchError = `401 Auth failed${apiMsg} (check RAPIDAPI_KEY)`;
  else if (res.status === 403) batchError = `403 Forbidden${apiMsg} (not subscribed to this API?)`;
  else if (res.status === 400 || res.status === 422) batchError = `${res.status} Validation${apiMsg}`;
  else if (res.status >= 500) batchError = `${res.status} Server error${apiMsg}`;
  else if (!parsed) batchError = `Bad response: ${text.slice(0, 120)}`;
  else if (parsed.success === false) batchError = `API error${apiMsg || ': unknown'}`;

  if (batchError) return fail(batchError);

  // data is an object keyed by normalised domain; tolerate an array too.
  const raw = parsed?.data;
  const entries: Array<[string, any]> = Array.isArray(raw)
    ? raw.map((it: any) => [clean(it?.fqdn || it?.pld || it?.url || it?.domain || ''), it])
    : raw && typeof raw === 'object'
      ? Object.entries(raw).map(([k, v]) => [clean(k), v])
      : [];
  const byKey = new Map<string, any>(entries);

  return cleaned.map((domain) => {
    const needle = clean(domain);
    let match = byKey.get(needle);
    if (!match) {
      match = entries.find(([, it]) => {
        const alts = [it?.fqdn, it?.pld, it?.url].filter(Boolean).map(clean);
        return alts.includes(needle);
      })?.[1];
    }

    if (!match) return { domain, da: null, spamScore: null, found: false };

    // Trust Moz as-is: a domain Moz never crawled can still carry a real DA from its
    // backlinks (e.g. thefoxsports.co.uk DA 8 with last_crawled null), so every entry
    // present in the response counts as found. A null spam_score means 0.
    const da = toNum(match.domain_authority ?? match.da);
    const ss = toNum(match.spam_score ?? match.ss);

    return { domain, da, spamScore: ss, found: true };
  });
}
