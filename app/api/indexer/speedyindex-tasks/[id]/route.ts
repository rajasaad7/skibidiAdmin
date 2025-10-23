import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    const apiKey = process.env.SPEEDYINDEX_API_KEY;
    const apiUrl = process.env.SPEEDYINDEX_API_URL || 'https://api.speedyindex.com';

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'SpeedyIndex API key not configured' },
        { status: 500 }
      );
    }

    // POST /v2/task/google/indexer/fullreport
    const response = await fetch(`${apiUrl}/v2/task/google/indexer/fullreport`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task_id: taskId })
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        code: data.code,
        task: data.result || {},
        data: data
      });
    } else {
      const errorText = await response.text();
      console.error('SpeedyIndex API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `SpeedyIndex API error: ${response.status}` },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error fetching SpeedyIndex task details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SpeedyIndex task details' },
      { status: 500 }
    );
  }
}
