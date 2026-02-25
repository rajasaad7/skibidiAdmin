import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchSheetData, findDomainInSheet } from '@/lib/google-sheets-service';

export async function POST(request: NextRequest) {
  try {
    // Get sheet configuration from environment variables
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1ActmOwcI92VRa-LH4KGu4FehzSPcApTuPNp_9k7bdXk';
    const sheetName = process.env.GOOGLE_SHEET_NAME || '1';

    // Fetch all data from sheet once
    const sheetData = await fetchSheetData(spreadsheetId, sheetName);

    if (!sheetData || sheetData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found in sheet' },
        { status: 404 }
      );
    }

    // Fetch N/A domains from database (domains where ALL 4 metrics are 0 or null)
    const { data: allDomains, error: fetchError } = await supabase
      .from('domains')
      .select('_id, "domainName", url, "domainRating", "domainAuthority", "organicTraffic", "spamScore", country');

    if (fetchError) throw fetchError;

    // Filter domains where ALL 4 metrics are 0 or null (true N/A domains)
    const naDomains = allDomains?.filter(d =>
      (d.domainRating === null || d.domainRating === 0) &&
      (d.domainAuthority === null || d.domainAuthority === 0) &&
      (d.organicTraffic === null || d.organicTraffic === 0) &&
      (d.spamScore === null || d.spamScore === 0)
    ) || [];

    console.log('Found N/A domains:', naDomains?.length || 0);
    console.log('Sheet data rows:', sheetData.length);

    if (!naDomains || naDomains.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No N/A domains found',
        summary: { total: 0, updated: 0, failed: 0 }
      });
    }

    const results = [];

    // Process each N/A domain
    for (const domain of naDomains) {
      try {
        const domainName = domain.domainName || domain.url;

        // Find matching data in sheet
        const sheetMatch = findDomainInSheet(domainName, sheetData);

        console.log(`Processing domain: ${domainName}, Found in sheet: ${!!sheetMatch}`);

        if (sheetMatch) {
          console.log(`Sheet data for ${domainName}:`, sheetMatch);

          // Check if all 4 metric fields are present in the sheet
          const hasAllFields =
            sheetMatch.dr !== null &&
            sheetMatch.da !== null &&
            sheetMatch.traffic !== null &&
            sheetMatch.spamScore !== null;

          console.log(`Has all fields: ${hasAllFields}`);

          if (hasAllFields) {
            // Update domain with complete sheet data
            const updateData: any = {
              "domainRating": sheetMatch.dr,
              "domainAuthority": sheetMatch.da,
              "organicTraffic": sheetMatch.traffic,
              "spamScore": sheetMatch.spamScore,
              country: sheetMatch.country,
              updatedAt: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
              .from('domains')
              .update(updateData)
              .eq('_id', domain._id);

            if (updateError) {
              results.push({
                domainId: domain._id,
                domainName,
                success: false,
                error: updateError.message,
              });
            } else {
              results.push({
                domainId: domain._id,
                domainName,
                success: true,
                updated: {
                  dr: sheetMatch.dr,
                  da: sheetMatch.da,
                  traffic: sheetMatch.traffic,
                  spamScore: sheetMatch.spamScore,
                  country: sheetMatch.country
                },
              });
            }
          } else {
            results.push({
              domainId: domain._id,
              domainName,
              success: false,
              error: 'Incomplete data in sheet (missing one or more: DR, DA, Traffic, SpamScore)',
            });
          }
        } else {
          results.push({
            domainId: domain._id,
            domainName,
            success: false,
            error: 'Domain not found in sheet',
          });
        }
      } catch (error: any) {
        results.push({
          domainId: domain._id,
          domainName: domain.domainName || domain.url,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        updated: successCount,
        failed: failedCount,
      }
    });
  } catch (error: any) {
    console.error('Error in sync-na-from-sheet API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync from sheet' },
      { status: 500 }
    );
  }
}
