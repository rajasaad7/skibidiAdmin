import { NextRequest, NextResponse } from 'next/server';
import { fetchDapaBatch, RAPIDAPI_DAPA_MAX_URLS } from '@/lib/rapidapi-dapa-service';

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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'RAPIDAPI_KEY not configured in environment.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'list';

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
        if (!domain) continue;
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
      const batchResults = await fetchDapaBatch(domains, apiKey);

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
