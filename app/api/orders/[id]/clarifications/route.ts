import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth } from '@/lib/auth';

// Returns the full clarification (buyer/publisher Q&A) thread for an order so
// the admin modal can show what was asked, what was answered, and where the
// delivery clock was frozen. Read-only; gated by the admin session cookie
// because the middleware exempts /api/* (see MIND security note).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const { data: rounds, error } = await supabase
      .from('order_clarifications')
      .select(
        '_id, roundNumber, status, question, answer, askedByUserId, answeredByUserId, statusBeforeFreeze, pausedMs, requirementChanges, askedAt, answeredAt, questionSeenAt, answerSeenAt'
      )
      .eq('orderId', id)
      .order('roundNumber', { ascending: true });

    if (error) {
      console.error('Error fetching clarifications:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clarifications' },
        { status: 500 }
      );
    }

    // Resolve the asker/answerer names in one pass so the thread reads as a
    // conversation rather than raw ids.
    const userIds = Array.from(
      new Set(
        (rounds || [])
          .flatMap((r) => [r.askedByUserId, r.answeredByUserId])
          .filter(Boolean) as string[]
      )
    );

    const usersMap = new Map<string, { fullName: string; email: string }>();
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('_id, fullName, email')
        .in('_id', userIds);
      for (const u of usersData || []) {
        usersMap.set(u._id, { fullName: u.fullName, email: u.email });
      }
    }

    const clarifications = (rounds || []).map((r) => ({
      ...r,
      askedBy: r.askedByUserId ? usersMap.get(r.askedByUserId) || null : null,
      answeredBy: r.answeredByUserId ? usersMap.get(r.answeredByUserId) || null : null,
    }));

    return NextResponse.json({ success: true, clarifications });
  } catch (error) {
    console.error('Error fetching clarifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clarifications' },
      { status: 500 }
    );
  }
}
