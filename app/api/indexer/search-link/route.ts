import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Search for the link in our database
    const { data: link, error } = await supabase
      .from('tool_index_links')
      .select('*')
      .eq('url', url)
      .single();

    if (error || !link) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'Link not found in the system'
      });
    }

    // Parse referenceTask if it's a string
    if (link.referenceTask && typeof link.referenceTask === 'string') {
      try {
        link.referenceTask = JSON.parse(link.referenceTask);
      } catch (e) {
        console.error('Error parsing referenceTask:', e);
      }
    }

    // Get campaign details
    const { data: campaign } = await supabase
      .from('indexer_campaigns')
      .select('name, userId, workspaceId')
      .eq('_id', link.campaignId)
      .single();

    if (campaign) {
      link.campaign = campaign;

      // Get user details
      const { data: user } = await supabase
        .from('users')
        .select('fullName, email')
        .eq('_id', campaign.userId)
        .single();

      if (user) {
        link.user = user;
      }
    }

    // Fetch SpeedyIndex task report if we have a taskId
    let speedyIndexReport = null;
    if (link.referenceTask && link.referenceTask.taskId) {
      try {
        const apiKey = process.env.SPEEDYINDEX_API_KEY;
        const apiUrl = process.env.SPEEDYINDEX_API_URL || 'https://api.speedyindex.com';

        if (apiKey) {
          const speedyResponse = await fetch(`${apiUrl}/v2/task/google/indexer/fullreport`, {
            method: 'POST',
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ task_id: link.referenceTask.taskId })
          });

          if (speedyResponse.ok) {
            const speedyData = await speedyResponse.json();
            if (speedyData.code === 0 && speedyData.result) {
              // Find this specific URL in the report
              const indexedLink = speedyData.result.indexed_links?.find((l: any) => l.url === url);
              const unindexedLink = speedyData.result.unindexed_links?.find((l: any) => l.url === url);

              speedyIndexReport = {
                taskId: link.referenceTask.taskId,
                taskTitle: speedyData.result.title,
                taskSize: speedyData.result.size,
                taskProcessedCount: speedyData.result.processed_count,
                isIndexed: !!indexedLink,
                indexedData: indexedLink || null,
                unindexedData: unindexedLink || null
              };
            }
          }
        }
      } catch (error) {
        console.error('Error fetching SpeedyIndex report:', error);
      }
    }

    return NextResponse.json({
      success: true,
      found: true,
      link: link,
      speedyIndexReport: speedyIndexReport
    });
  } catch (error) {
    console.error('Error searching for link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search for link' },
      { status: 500 }
    );
  }
}
