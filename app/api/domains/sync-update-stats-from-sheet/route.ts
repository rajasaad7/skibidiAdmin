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
    const sheetName = 'updateStats';

    // Dynamic import googleapis only when needed
    const { google } = await import('googleapis');

    // Initialize Google Sheets API
    const credentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Read all data from the updateStats sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:F`, // Columns: Domain, DR, DA, Spam Score, Traffic, Country
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found in updateStats sheet'
      }, { status: 404 });
    }

    // Parse header row to get column indices
    const headerRow = rows[0];
    const domainIdx = headerRow.findIndex((h: string) => h.toLowerCase() === 'domain');
    const drIdx = headerRow.findIndex((h: string) => h.toLowerCase() === 'dr');
    const daIdx = headerRow.findIndex((h: string) => h.toLowerCase() === 'da');
    const spamScoreIdx = headerRow.findIndex((h: string) => h.toLowerCase().includes('spam'));
    const trafficIdx = headerRow.findIndex((h: string) => h.toLowerCase() === 'traffic');
    const countryIdx = headerRow.findIndex((h: string) => h.toLowerCase() === 'country');

    if (domainIdx === -1) {
      return NextResponse.json({
        success: false,
        error: 'Domain column not found in sheet. Please ensure there is a "Domain" column.'
      }, { status: 400 });
    }

    // Process each row (skip header)
    const updates = [];
    const errors = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const domainName = row[domainIdx]?.trim();

      if (!domainName) continue;

      try {
        // Find the domain in the database
        const { data: domain, error: fetchError } = await supabase
          .from('domains')
          .select('_id, "domainName", "domainRating", "domainAuthority", "spamScore", "organicTraffic", "updateStats"')
          .eq('"domainName"', domainName)
          .single();

        if (fetchError || !domain) {
          errors.push({ domain: domainName, error: 'Domain not found in database' });
          continue;
        }

        // Only update domains that have updateStats = true
        if (!domain.updateStats) {
          errors.push({ domain: domainName, error: 'Domain does not have updateStats = true' });
          continue;
        }

        // Prepare update object
        const updateData: any = {};

        let hasUpdates = false;

        // Update DR if available
        if (drIdx !== -1 && row[drIdx] && row[drIdx].trim() !== '') {
          const dr = parseInt(row[drIdx].trim());
          if (!isNaN(dr)) {
            updateData.domainRating = dr;
            hasUpdates = true;
          }
        }

        // Update DA if available
        if (daIdx !== -1 && row[daIdx] && row[daIdx].trim() !== '') {
          const da = parseInt(row[daIdx].trim());
          if (!isNaN(da)) {
            updateData.domainAuthority = da;
            hasUpdates = true;
          }
        }

        // Update Spam Score if available
        if (spamScoreIdx !== -1 && row[spamScoreIdx] && row[spamScoreIdx].trim() !== '') {
          const spamScore = parseInt(row[spamScoreIdx].trim());
          if (!isNaN(spamScore)) {
            updateData.spamScore = spamScore;
            hasUpdates = true;
          }
        }

        // Update Traffic if available
        if (trafficIdx !== -1 && row[trafficIdx] && row[trafficIdx].trim() !== '') {
          const traffic = parseInt(row[trafficIdx].trim());
          if (!isNaN(traffic)) {
            updateData.organicTraffic = traffic;
            hasUpdates = true;
          }
        }

        // Update Country if available
        if (countryIdx !== -1 && row[countryIdx] && row[countryIdx].trim() !== '') {
          updateData.country = row[countryIdx].trim();
        }

        // Skip domains with no updates (all N/A)
        if (!hasUpdates) {
          errors.push({ domain: domainName, error: 'All stats are N/A, skipping sync' });
          continue;
        }

        // Mark updateStats as false only if we have updates
        updateData.updateStats = false;

        const { error: updateError } = await supabase
          .from('domains')
          .update(updateData)
          .eq('_id', domain._id);

        if (updateError) {
          errors.push({ domain: domainName, error: updateError.message });
          continue;
        }

        updates.push({
          domain: domainName,
          updated: {
            dr: updateData.domainRating || null,
            da: updateData.domainAuthority || null,
            spamScore: updateData.spamScore || null,
            traffic: updateData.organicTraffic || null,
            country: updateData.country || null
          }
        });
      } catch (error: any) {
        errors.push({ domain: domainName, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${updates.length} domains from updateStats sheet`,
      updatedCount: updates.length,
      updates,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error syncing updateStats from sheet:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync updateStats from sheet' },
      { status: 500 }
    );
  }
}
