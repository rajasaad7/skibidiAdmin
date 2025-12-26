import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchSheetData, findDomainInSheet } from '@/lib/google-sheets-service';

export async function POST(request: NextRequest) {
  try {
    const { domainIds, updateFields } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    // Default to updating all fields if not specified
    const fieldsToUpdate = updateFields || { dr: true, da: true, spamScore: true, traffic: true };

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

    // Fetch domains from database
    const { data: domains, error: fetchError } = await supabase
      .from('domains')
      .select('_id, "domainName", url')
      .in('_id', domainIds);

    if (fetchError) throw fetchError;

    if (!domains || domains.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No domains found' },
        { status: 404 }
      );
    }

    const results = [];

    // Process each domain
    for (const domain of domains) {
      try {
        const domainName = domain.domainName || domain.url;

        // Find matching data in sheet
        const sheetMatch = findDomainInSheet(domainName, sheetData);

        if (sheetMatch) {
          // Update domain with sheet data (only selected fields)
          const updateData: any = {
            updatedAt: new Date().toISOString(),
          };

          const updatedFields: any = {};

          if (fieldsToUpdate.dr && sheetMatch.dr !== null) {
            updateData.domainRating = sheetMatch.dr;
            updatedFields.dr = sheetMatch.dr;
          }
          if (fieldsToUpdate.da && sheetMatch.da !== null) {
            updateData.domainAuthority = sheetMatch.da;
            updatedFields.da = sheetMatch.da;
          }
          if (fieldsToUpdate.spamScore && sheetMatch.spamScore !== null) {
            updateData.spamScore = sheetMatch.spamScore;
            updatedFields.spamScore = sheetMatch.spamScore;
          }
          if (fieldsToUpdate.traffic && sheetMatch.traffic !== null) {
            updateData.organicTraffic = sheetMatch.traffic;
            updatedFields.traffic = sheetMatch.traffic;
          }

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
              updated: updatedFields,
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

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        updated: successCount,
        failed: results.length - successCount,
      }
    });
  } catch (error: any) {
    console.error('Error in update-from-sheet API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update from sheet' },
      { status: 500 }
    );
  }
}
