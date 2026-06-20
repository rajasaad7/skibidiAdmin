// ============================================================
// dapachecker.org service — fetch DA + Spam Score for domains
// ============================================================
// API: https://www.dapachecker.org/api-docs
// Basic plan: 10,000 credits/month, 5 URLs/request, 60 URLs/minute
//
// NOTE: dapachecker's nginx returns 403 to some datacenter IPs.
// This runs server-side from the Next.js host. If you hit a 403,
// the host IP is blocked and the call must run from an allowed IP.
// ============================================================

const DAPA_API_URL = 'https://www.dapachecker.org/api/user/dapa-checker';

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
    .replace(/\/$/, '');
}

function clean(d: string): string {
  return cleanDomain(d).toLowerCase();
}

/**
 * Fetch DA + Spam Score for up to 5 domains in a single request.
 * Returns one DapaResult per input domain (always same length/order).
 */
export async function fetchDapaBatch(
  domains: string[],
  apiKey: string
): Promise<DapaResult[]> {
  const cleaned = domains.map(cleanDomain);

  let res: Response;
  try {
    res = await fetch(DAPA_API_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
      body: JSON.stringify({ urls: cleaned }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err: any) {
    const msg = `Network error: ${err.message}`;
    return cleaned.map((domain) => ({ domain, da: null, spamScore: null, found: false, error: msg }));
  }

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* not JSON (e.g. nginx 403 HTML page) */
  }

  const apiStatus = parsed && parsed.status ? parsed.status : res.status;
  const apiMsg =
    parsed && (parsed.message || parsed.error) ? `: ${parsed.message || parsed.error}` : '';

  // Map known error codes to a single error applied to every domain in the batch
  let batchError: string | null = null;
  if (apiStatus === 429 || res.status === 429) batchError = `429 Rate limit${apiMsg}`;
  else if (apiStatus === 401 || res.status === 401) batchError = `401 Auth failed${apiMsg} (check API key & subscription)`;
  else if (apiStatus === 403 || res.status === 403) batchError = `403 Forbidden${apiMsg} (host IP blocked by dapachecker)`;
  else if (apiStatus === 422 || res.status === 422) batchError = `422 Validation${apiMsg}`;
  else if (apiStatus >= 500 || res.status >= 500) batchError = `${res.status} Server error${apiMsg}`;
  else if (!parsed) batchError = `Bad response: ${text.slice(0, 120)}`;
  else if (parsed.error) batchError = `API error: ${parsed.error}`;

  if (batchError) {
    return cleaned.map((domain) => ({ domain, da: null, spamScore: null, found: false, error: batchError! }));
  }

  // Success: parsed.data is an array of { domain, site_da, spam_score, ... }
  const data: any[] = Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed) ? parsed : [];

  return cleaned.map((domain) => {
    const needle = clean(domain);
    const match =
      data.find((it) => it && clean(it.domain || it.url || it.site || '') === needle) ||
      data.find((it) => {
        const k = it && clean(it.domain || it.url || it.site || '');
        return k && (k.includes(needle) || needle.includes(k));
      });

    if (!match) {
      return { domain, da: null, spamScore: null, found: false };
    }

    let da = toNum(match.site_da ?? match.da ?? match.domain_authority);
    let ss = toNum(match.spam_score ?? match.ss);
    if (ss === -1) ss = 0; // dapachecker uses -1 for "no spam data"

    return { domain, da, spamScore: ss, found: true };
  });
}

function toNum(v: any): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
