import { NextRequest, NextResponse } from 'next/server';

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

    const apiKey = process.env.SPEEDYINDEX_API_KEY;
    const apiUrl = process.env.SPEEDYINDEX_API_URL || 'https://api.speedyindex.com';

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'SpeedyIndex API key not configured' },
        { status: 500 }
      );
    }

    // Create a checker task with the URL
    const response = await fetch(`${apiUrl}/v2/task/google/checker/create`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Quick Check - ${new Date().toISOString()}`,
        urls: [url]
      })
    });

    if (response.ok) {
      const data = await response.json();

      if (data.code === 0) {
        return NextResponse.json({
          success: true,
          taskId: data.task_id,
          type: data.type,
          message: 'Check task created successfully. Checking indexation status...'
        });
      } else if (data.code === 1) {
        return NextResponse.json(
          { success: false, error: 'Insufficient balance - need to top up' },
          { status: 402 }
        );
      } else if (data.code === 2) {
        return NextResponse.json(
          { success: false, error: 'Server overloaded - retry later' },
          { status: 503 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: `Unknown error code: ${data.code}` },
          { status: 500 }
        );
      }
    } else {
      const errorText = await response.text();
      console.error('SpeedyIndex API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `SpeedyIndex API error: ${response.status}` },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error checking URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check URL' },
      { status: 500 }
    );
  }
}
