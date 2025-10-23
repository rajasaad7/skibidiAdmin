import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.SPEEDYINDEX_API_KEY;
    const apiUrl = process.env.SPEEDYINDEX_API_URL || 'https://api.speedyindex.com';

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'SpeedyIndex API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${apiUrl}/v2/account`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const balance = data.balance || {};
      return NextResponse.json({
        success: true,
        balance: {
          google_indexer: balance.indexer || 0,
          google_checker: balance.checker || 0
        },
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
    console.error('Error fetching SpeedyIndex balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SpeedyIndex balance' },
      { status: 500 }
    );
  }
}
