import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { orderId, status, revisionRemarks } = await request.json();

    const updateData: any = { status };

    if (status === 'revision_requested' && revisionRemarks) {
      updateData.revisionRemarks = revisionRemarks;
    }

    const { error } = await supabase
      .from('marketplace_orders')
      .update(updateData)
      .eq('_id', orderId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
