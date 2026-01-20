import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Service Account credentials not configured. Please add GOOGLE_SERVICE_ACCOUNT_KEY to your environment variables.'
      }, { status: 500 });
    }

    // Get sheet configuration from environment variables
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1ActmOwcI92VRa-LH4KGu4FehzSPcApTuPNp_9k7bdXk';
    const sheetName = process.env.GOOGLE_SHEET_NAME || '1';

    // Fetch all N/A domains
    const { data: allDomains, error } = await supabase
      .from('domains')
      .select('_id, "domainName", "domainRating", "domainAuthority", "spamScore", "organicTraffic"')
      .order('"domainName"', { ascending: true });

    if (error) throw error;

    // Filter domains where traffic, DA, DR, and SS are all 0
    const naDomains = (allDomains || []).filter(domain => {
      return domain.organicTraffic === 0 &&
             domain.domainAuthority === 0 &&
             domain.domainRating === 0 &&
             domain.spamScore === 0;
    });

    if (naDomains.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No N/A domains found'
      }, { status: 404 });
    }

    // Dynamic import googleapis only when needed
    const { google } = await import('googleapis');

    // Initialize Google Sheets API
    const credentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get existing domains using batchGet for better performance with large datasets
    const BATCH_SIZE = 10000;
    const existingDomains = new Set<string>();
    let currentRow = 1;
    let hasMoreData = true;

    // Read sheet in batches to handle 20K+ domains efficiently
    while (hasMoreData) {
      const endRow = currentRow + BATCH_SIZE - 1;
      const range = `${sheetName}!A${currentRow}:A${endRow}`;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        hasMoreData = false;
        break;
      }

      // Add domains to Set for O(1) lookup
      rows.forEach(row => {
        if (row[0]) {
          existingDomains.add(row[0]);
        }
      });

      // If we got fewer rows than BATCH_SIZE, we've reached the end
      if (rows.length < BATCH_SIZE) {
        hasMoreData = false;
      } else {
        currentRow = endRow + 1;
      }
    }

    // Filter out domains that already exist - O(n) operation with Set
    const newNADomains = naDomains.filter(
      domain => !existingDomains.has(domain.domainName)
    );

    if (newNADomains.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All N/A domains already exist in the sheet'
      }, { status: 400 });
    }

    // Prepare domain names to append (only domain names in column A)
    const values = newNADomains.map(domain => [domain.domainName]);

    // Append domain names at the end (Google Sheets will auto-find the next empty row)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${newNADomains.length} new N/A domains to sheet (${naDomains.length - newNADomains.length} already existed)`,
      count: newNADomains.length,
      totalNADomains: naDomains.length,
      alreadyExisted: naDomains.length - newNADomains.length
    });
  } catch (error: any) {
    console.error('Error uploading N/A domains to sheet:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload N/A domains to sheet' },
      { status: 500 }
    );
  }
}
