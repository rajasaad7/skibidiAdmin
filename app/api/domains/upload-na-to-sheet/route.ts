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

    // First, get current data to find the last row
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const existingRows = getResponse.data.values || [];
    const lastRow = existingRows.length;
    const startRow = lastRow + 1;

    // Prepare domain names to append (only domain names in column A)
    const values = naDomains.map(domain => [domain.domainName]);

    // Append domain names at the end
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A${startRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${naDomains.length} N/A domains to sheet`,
      count: naDomains.length,
      startRow,
      endRow: startRow + naDomains.length - 1
    });
  } catch (error: any) {
    console.error('Error uploading N/A domains to sheet:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload N/A domains to sheet' },
      { status: 500 }
    );
  }
}
