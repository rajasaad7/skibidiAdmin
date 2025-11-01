import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: domains, error } = await supabase
      .from('press_release_domains')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching press release domains:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, domains });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('press_release_domains')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating press release domain:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, domain: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { _id, ...updates } = body;

    const { data, error } = await supabase
      .from('press_release_domains')
      .update(updates)
      .eq('_id', _id)
      .select()
      .single();

    if (error) {
      console.error('Error updating press release domain:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, domain: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const _id = searchParams.get('_id');

    if (!_id) {
      return NextResponse.json({ success: false, error: 'Domain ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('press_release_domains')
      .delete()
      .eq('_id', _id);

    if (error) {
      console.error('Error deleting press release domain:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
