import { NextRequest, NextResponse } from 'next/server';
import { fetchDapaBatch, RAPIDAPI_DAPA_MAX_URLS } from '@/lib/rapidapi-dapa-service';
import { checkAuth } from '@/lib/auth';

// googleapis needs the Node.js runtime (not edge). Each call is short
// (list = one read; chunk = one fetch + one write), but allow headroom.
export const runtime = 'nodejs';
export const maxDuration = 60;

// RapidAPI "Bulk Moz DA PA SS Checker": up to 500 URLs per request and the plan
// quota counts REQUESTS, so send the biggest batch the function timeout allows.
// Override with RAPIDAPI_DAPA_BATCH_SIZE (lower it if a chunk call times out).
// The client reads this value from the `list` response, so nothing to keep in sync.
const BATCH_SIZE = Math.min(
  RAPIDAPI_DAPA_MAX_URLS,
  Math.max(1, Number(process.env.RAPIDAPI_DAPA_BATCH_SIZE) || RAPIDAPI_DAPA_MAX_URLS)
);

// Sheet layout (tab "2"): A=Domain, B=DR, C=DA, D=Spam Score
const SHEET_TAB = '2';
const DOMAIN_COL = 'A';
const DA_COL = 'C';
const SS_COL = 'D';
const HEADER_ROWS = 1;

const REFILL = new Set(['', 'ERROR', 'N/A', 'NA']);
const needsFill = (v: any) =>
  REFILL.has(String(v == null ? '' : v).trim().toUpperCase());

// Only real domains go to the API: skip placeholder rows ("-", "N/A", "...") and
// anything without a dot-separated label (the API answers junk like "-" with a score).
const PLACEHOLDER_DOMAINS = new Set(['-', '--', '—', '–', 'N/A', 'NA', 'NONE', 'NULL', '.']);
const looksLikeDomain = (raw: string) => {
  const d = raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  if (!d || PLACEHOLDER_DOMAINS.has(d.toUpperCase())) return false;
  return /^[a-z0-9\u00a1-\uffff-]+(\.[a-z0-9\u00a1-\uffff-]+)+$/.test(d);
};

async function getSheets() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  const { google } = await import('googleapis');
  const credentials = JSON.parse(serviceAccountKey);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1ActmOwcI92VRa-LH4KGu4FehzSPcApTuPNp_9k7bdXk';
  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId };
}

// Who is calling: logged on EVERY request (before the auth gate) so the Netlify
// function log identifies the client behind each RapidAPI call.
function describeCaller(request: NextRequest, mode: string, itemCount: number) {
  const h = request.headers;
  // True client IP: behind Cloudflare the real visitor is in cf-connecting-ip
  // (x-nf-client-connection-ip / the last x-forwarded-for hop is the proxy, which
  // collapses every caller onto one shared address).
  const ip =
    h.get('cf-connecting-ip') ||
    h.get('true-client-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    h.get('x-nf-client-connection-ip') ||
    'unknown';
  const ua = (h.get('user-agent') || '').slice(0, 160);
  const referer = h.get('referer') || '';
  return `mode=${mode} items=${itemCount} ip=${ip} referer="${referer}" ua="${ua}"`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'list';
    const itemCount = Array.isArray(body.items) ? body.items.length : 0;
    const caller = describeCaller(request, mode, itemCount);

    // Admin-only: this route spends RapidAPI quota, it must never be callable anonymously.
    if (!(await checkAuth())) {
      console.warn(`[update-da-sheet] DENIED (no admin session) ${caller}`);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[update-da-sheet] ${caller}`);

    // Kill switch: set RAPIDAPI_DAPA_DISABLED=true in the Netlify env to stop all vendor calls.
    if (mode === 'chunk' && process.env.RAPIDAPI_DAPA_DISABLED === 'true') {
      console.warn(`[update-da-sheet] BLOCKED by RAPIDAPI_DAPA_DISABLED ${caller}`);
      return NextResponse.json(
        { success: false, error: 'DA updater is disabled (RAPIDAPI_DAPA_DISABLED).' },
        { status: 503 }
      );
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'RAPIDAPI_KEY not configured in environment.' },
        { status: 500 }
      );
    }

    const { sheets, spreadsheetId } = await getSheets();

    // ── Mode 1: return the work-list (rows needing DA/SS) ──
    if (mode === 'list') {
      const { data: read } = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_TAB}!${DOMAIN_COL}:${SS_COL}`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
      const rows = read.values || [];

      const pending: { rowNumber: number; domain: string }[] = [];
      for (let r = HEADER_ROWS; r < rows.length; r++) {
        const row = rows[r] || [];
        const domain = String(row[0] || '').trim(); // col A
        if (!domain || !looksLikeDomain(domain)) continue;
        const da = row[2]; // col C
        const ss = row[3]; // col D
        if (needsFill(da) || needsFill(ss)) {
          pending.push({ rowNumber: r + 1, domain });
        }
      }

      return NextResponse.json({ success: true, pending, batchSize: BATCH_SIZE });
    }

    // ── Mode 2: process a single chunk (≤ BATCH_SIZE items) ──
    if (mode === 'chunk') {
      const items: { rowNumber: number; domain: string }[] = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return NextResponse.json({ success: true, results: [] });
      }
      if (items.length > BATCH_SIZE) {
        return NextResponse.json(
          { success: false, error: `Chunk too large (${items.length} > ${BATCH_SIZE})` },
          { status: 400 }
        );
      }

      const domains = items.map((x) => x.domain);
      const vendorStarted = Date.now();
      const batchResults = await fetchDapaBatch(domains, apiKey);
      const vendorMs = Date.now() - vendorStarted;
      const vendorSummary = batchResults.reduce(
        (acc, r) => {
          if (r.error) { acc.error++; acc.firstError = acc.firstError || r.error; }
          else if (r.found) acc.found++;
          else acc.notFound++;
          return acc;
        },
        { found: 0, notFound: 0, error: 0, firstError: '' as string }
      );
      console.log(
        `[update-da-sheet] vendor call urls=${domains.length} ms=${vendorMs} found=${vendorSummary.found} notFound=${vendorSummary.notFound} error=${vendorSummary.error}` +
          (vendorSummary.firstError ? ` firstError="${vendorSummary.firstError}"` : '') +
          ` rows=${items[0]?.rowNumber}-${items[items.length - 1]?.rowNumber}`
      );

      const dataUpdates: { range: string; values: any[][] }[] = [];
      const results: {
        domain: string;
        rowNumber: number;
        status: 'success' | 'notfound' | 'error';
        da?: number | string;
        spamScore?: number | string;
        error?: string;
      }[] = [];

      batchResults.forEach((res, i) => {
        const item = items[i];
        if (res.error) {
          dataUpdates.push({ range: `${SHEET_TAB}!${DA_COL}${item.rowNumber}`, values: [['ERROR']] });
          dataUpdates.push({ range: `${SHEET_TAB}!${SS_COL}${item.rowNumber}`, values: [['ERROR']] });
          results.push({ domain: item.domain, rowNumber: item.rowNumber, status: 'error', error: res.error });
        } else if (res.found) {
          const daVal = res.da === null ? 0 : res.da;
          const ssVal = res.spamScore === null ? 0 : res.spamScore;
          dataUpdates.push({ range: `${SHEET_TAB}!${DA_COL}${item.rowNumber}`, values: [[daVal]] });
          dataUpdates.push({ range: `${SHEET_TAB}!${SS_COL}${item.rowNumber}`, values: [[ssVal]] });
          results.push({ domain: item.domain, rowNumber: item.rowNumber, status: 'success', da: daVal, spamScore: ssVal });
        } else {
          // No Moz data for this domain: write 0 / 0 (user decision 2026-11-09, was N/A).
          // 0 is not in REFILL, so the row is not re-queried on the next run.
          dataUpdates.push({ range: `${SHEET_TAB}!${DA_COL}${item.rowNumber}`, values: [[0]] });
          dataUpdates.push({ range: `${SHEET_TAB}!${SS_COL}${item.rowNumber}`, values: [[0]] });
          results.push({ domain: item.domain, rowNumber: item.rowNumber, status: 'notfound', da: 0, spamScore: 0 });
        }
      });

      if (dataUpdates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: { valueInputOption: 'RAW', data: dataUpdates },
        });
      }

      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in update-da-sheet API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update DA from sheet' },
      { status: 500 }
    );
  }
}
