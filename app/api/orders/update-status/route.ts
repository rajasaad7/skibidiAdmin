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
      refundedAmount,
      // Buyer content fields
      articleTitle,
      articleContent,
      specialRequirements,
      targetUrl,
      anchorText,
      googleDocsLink
    } = await request.json();

    const updateData: any = { status };

    // Update buyer content fields if provided
    if (articleTitle !== undefined) updateData.articleTitle = articleTitle;
    if (articleContent !== undefined) updateData.articleContent = articleContent;
    if (specialRequirements !== undefined) updateData.specialRequirements = specialRequirements;
    if (targetUrl !== undefined) updateData.targetUrl = targetUrl;
    if (anchorText !== undefined) updateData.anchorText = anchorText;
    if (googleDocsLink !== undefined) updateData.googleDocsLink = googleDocsLink;

    // Update seller fields if provided
    if (publishedUrl !== undefined) updateData.publishedUrl = publishedUrl;
    if (completionNotes !== undefined) updateData.completionNotes = completionNotes;

    // Status-specific fields
    if ((status === 'revision_requested' || status === 'rejected') && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
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
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
