import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      status,
      // Core order fields
      serviceType,
      buyerId,
      publisherId,
      domainId,
      // Price fields
      basePrice,
      platformFee,
      totalPrice,
      publisherEarnings,
      contentWritingFee,
      requestContentWriting,
      // Payment fields
      paymentMethod,
      paymentStatus,
      paddleTransactionId,
      stripeTransactionId,
      stripeSessionId,
      // Buyer content fields
      articleTitle,
      articleContent,
      specialRequirements,
      targetUrl,
      anchorText,
      googleDocsLink,
      // Seller fields
      publishedUrl,
      completionNotes,
      // Admin remarks
      rejectionReason,
      refundReason,
      refundedAmount
    } = await request.json();

    const updateData: any = { status };

    // Core order fields
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    if (buyerId !== undefined) updateData.buyerId = buyerId;
    if (publisherId !== undefined) updateData.publisherId = publisherId;
    if (domainId !== undefined) updateData.domainId = domainId;

    // Price fields
    if (basePrice !== undefined) updateData.basePrice = basePrice;
    if (platformFee !== undefined) updateData.platformFee = platformFee;
    if (totalPrice !== undefined) updateData.totalPrice = totalPrice;
    if (publisherEarnings !== undefined) updateData.publisherEarnings = publisherEarnings;
    if (contentWritingFee !== undefined) updateData.contentWritingFee = contentWritingFee;
    if (requestContentWriting !== undefined) updateData.requestContentWriting = requestContentWriting;

    // Payment fields
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paddleTransactionId !== undefined) updateData.paddleTransactionId = paddleTransactionId;
    if (stripeTransactionId !== undefined) updateData.stripeTransactionId = stripeTransactionId;
    if (stripeSessionId !== undefined) updateData.stripeSessionId = stripeSessionId;

    // Buyer content fields
    if (articleTitle !== undefined) updateData.articleTitle = articleTitle;
    if (articleContent !== undefined) updateData.articleContent = articleContent;
    if (specialRequirements !== undefined) updateData.specialRequirements = specialRequirements;
    if (targetUrl !== undefined) updateData.targetUrl = targetUrl;
    if (anchorText !== undefined) updateData.anchorText = anchorText;
    if (googleDocsLink !== undefined) updateData.googleDocsLink = googleDocsLink;

    // Seller fields
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
