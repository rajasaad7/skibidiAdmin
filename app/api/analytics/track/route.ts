import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events, metadata } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Prepare events for database insertion
    const eventsToInsert = events.map(event => ({
      session_id: event.sessionId,
      user_id: event.userId,
      event_type: event.eventType,
      event_data: event.data || {},
      url: event.url,
      path: event.path,
      timestamp: new Date(event.timestamp).toISOString(),
      ip_address: ip,
      user_agent: userAgent,
      is_active: metadata?.isActive ?? true
    }));

    // Insert events into database
    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert(eventsToInsert);

    if (insertError) {
      console.error('Error inserting analytics events:', insertError);
      return NextResponse.json(
        { error: 'Failed to store events' },
        { status: 500 }
      );
    }

    // Update or insert active session
    if (metadata) {
      const { error: sessionError } = await supabase
        .from('analytics_sessions')
        .upsert({
          session_id: metadata.sessionId,
          user_id: metadata.userId,
          is_active: metadata.isActive,
          last_activity: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent
        }, {
          onConflict: 'session_id'
        });

      if (sessionError) {
        console.error('Error updating session:', sessionError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
