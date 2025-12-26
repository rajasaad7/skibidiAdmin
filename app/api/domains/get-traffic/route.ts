import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDomainTraffic } from '@/lib/dataforseo-service';

export async function POST(request: NextRequest) {
  try {
    const { domainIds } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    // Get API credentials from environment variables
    const apiLogin = process.env.DATAFORSEO_LOGIN;
    const apiPassword = process.env.DATAFORSEO_PASSWORD;

    if (!apiLogin || !apiPassword) {
      return NextResponse.json(
        { success: false, error: 'DataForSEO API credentials not configured' },
        { status: 500 }
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
        // Get traffic from DataForSEO
        const trafficResult = await getDomainTraffic(
          domain.domainName || domain.url,
          apiLogin,
          apiPassword
        );

        // Update the domain with traffic data
        if (trafficResult.organicTraffic !== null) {
          const { error: updateError } = await supabase
            .from('domains')
            .update({
              "organicTraffic": Math.round(trafficResult.organicTraffic),
              updatedAt: new Date().toISOString(),
            })
            .eq('_id', domain._id);

          if (updateError) {
            results.push({
              domainId: domain._id,
              domainName: domain.domainName || domain.url,
              success: false,
              error: updateError.message,
            });
          } else {
            results.push({
              domainId: domain._id,
              domainName: domain.domainName || domain.url,
              success: true,
              organicTraffic: trafficResult.organicTraffic,
            });
          }
        } else {
          results.push({
            domainId: domain._id,
            domainName: domain.domainName || domain.url,
            success: false,
            error: trafficResult.error || 'Failed to fetch traffic data',
          });
        }

        // Delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.push({
          domainId: domain._id,
          domainName: domain.domainName || domain.url,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error in get-traffic API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch traffic data' },
      { status: 500 }
    );
  }
}
