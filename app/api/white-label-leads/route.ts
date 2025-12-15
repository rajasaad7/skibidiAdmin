import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  try {
    // Build query
    let query = supabase
      .from('white_label_leads')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply search
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,agency_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalRes, pendingRes, contactedRes, convertedRes, rejectedRes, thisWeekRes] = await Promise.all([
      supabase.from('white_label_leads').select('id', { count: 'exact', head: true }),
      supabase.from('white_label_leads').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('white_label_leads').select('id', { count: 'exact', head: true }).eq('status', 'contacted'),
      supabase.from('white_label_leads').select('id', { count: 'exact', head: true }).eq('status', 'converted'),
      supabase.from('white_label_leads').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('white_label_leads').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
    ]);

    return NextResponse.json({
      success: true,
      leads: data,
      stats: {
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        contacted: contactedRes.count || 0,
        converted: convertedRes.count || 0,
        rejected: rejectedRes.count || 0,
        this_week: thisWeekRes.count || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching white label leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch white label leads' },
      { status: 500 }
    );
  }
}
