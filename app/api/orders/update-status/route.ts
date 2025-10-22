import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      status,
      rejectionReason,
      completionNotes,
      refundReason,
      publishedUrl,
      refundedAmount
    } = await request.json();

    const updateData: any = { status };

    if ((status === 'revision_requested' || status === 'rejected') && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    if (status === 'completed') {
      if (publishedUrl) updateData.publishedUrl = publishedUrl;
      if (completionNotes) updateData.completionNotes = completionNotes;
    }

    if ((status === 'refunded' || status === 'refund_requested') && refundReason) {
      updateData.refundReason = refundReason;
      if (refundedAmount) updateData.refundedAmount = refundedAmount;
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
