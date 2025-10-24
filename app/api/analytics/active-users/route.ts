import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Get active sessions (users active in last 5 minutes)
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('analytics_sessions')
      .select('*')
      .eq('is_active', true)
      .gte('last_activity', fiveMinutesAgo)
      .order('last_activity', { ascending: false });

    if (sessionsError) {
      throw sessionsError;
    }

    // Get recent events for each active session
    const sessionIds = activeSessions?.map(s => s.session_id) || [];

    let recentEvents = [];
    if (sessionIds.length > 0) {
      const { data: events, error: eventsError } = await supabase
        .from('analytics_events')
        .select('*')
        .in('session_id', sessionIds)
        .gte('timestamp', fiveMinutesAgo)
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
      } else {
        recentEvents = events || [];
      }
    }

    // Group events by session
    const sessionsWithEvents = (activeSessions || []).map(session => {
      const sessionEvents = recentEvents.filter(e => e.session_id === session.session_id);

      // Get current page (last pageview event)
      const lastPageview = sessionEvents
        .filter(e => e.event_type === 'pageview')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      // Get activity summary
      const clickCount = sessionEvents.filter(e => e.event_type === 'click').length;
      const scrollEvents = sessionEvents.filter(e => e.event_type === 'scroll');
      const lastScroll = scrollEvents[scrollEvents.length - 1];

      return {
        sessionId: session.session_id,
        userId: session.user_id,
        isActive: session.is_active,
        lastActivity: session.last_activity,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        currentPage: lastPageview?.url || null,
        currentPath: lastPageview?.path || null,
        pageTitle: lastPageview?.event_data?.title || null,
        location: lastPageview?.event_data ? {
          country: lastPageview.event_data.timezone || null,
          language: lastPageview.event_data.language || null
        } : null,
        device: {
          screenWidth: lastPageview?.event_data?.screenWidth || null,
          screenHeight: lastPageview?.event_data?.screenHeight || null,
          viewport: lastPageview?.event_data ? {
            width: lastPageview.event_data.viewportWidth,
            height: lastPageview.event_data.viewportHeight
          } : null
        },
        activity: {
          clickCount,
          scrollDepth: lastScroll?.event_data?.depth || 0,
          lastEvent: sessionEvents[0]?.event_type || null,
          lastEventTime: sessionEvents[0]?.timestamp || null
        },
        recentEvents: sessionEvents.slice(0, 50).map(e => ({
          type: e.event_type,
          timestamp: e.timestamp,
          data: e.event_data,
          url: e.url,
          path: e.path
        }))
      };
    });

    // Get overall stats
    const stats = {
      activeUsers: sessionsWithEvents.length,
      totalEvents: recentEvents.length,
      pageviews: recentEvents.filter(e => e.event_type === 'pageview').length,
      clicks: recentEvents.filter(e => e.event_type === 'click').length,
      topPages: getTopPages(recentEvents)
    };

    return NextResponse.json({
      success: true,
      sessions: sessionsWithEvents,
      stats
    });

  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active users' },
      { status: 500 }
    );
  }
}

function getTopPages(events: any[]) {
  const pageCounts: Record<string, number> = {};

  events
    .filter(e => e.event_type === 'pageview')
    .forEach(e => {
      const path = e.path || '/';
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });

  return Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));
}
