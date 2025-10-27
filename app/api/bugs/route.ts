import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');

  try {
    // Build query
    let query = supabase
      .from('bug_reports')
      .select(`
        id,
        user_id,
        error_message,
        error_stack,
        component_stack,
        page_url,
        user_agent,
        browser_info,
        user_description,
        status,
        priority,
        assigned_to,
        resolved_at,
        created_at,
        updated_at,
        metadata,
        users:user_id (
          _id,
          fullName,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get stats
    const [openRes, inProgressRes, resolvedRes, highPriorityRes] = await Promise.all([
      supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('priority', 'high'),
    ]);

    return NextResponse.json({
      success: true,
      bugs: data,
      stats: {
        open: openRes.count || 0,
        in_progress: inProgressRes.count || 0,
        resolved: resolvedRes.count || 0,
        high_priority: highPriorityRes.count || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bug reports' },
      { status: 500 }
    );
  }
}
