import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendTrueEmailer, formatOrderDisputeEmail, formatOrderDisputeResolvedEmail } from '@/lib/email';

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
      refundedAmount,
      disputeReason
    } = await request.json();

    // Snapshot the current state before writing so we can detect a fresh
    // dispute transition (email + history stamping happen only then) and a
    // dispute settlement (disputed -> completed/refunded, emails both parties).
    let existingOrder: any = null;
    if (status === 'disputed' || status === 'completed' || status === 'refunded') {
      const { data } = await supabase
        .from('marketplace_orders')
        .select('_id, status, disputeReason, orderNumber, publisherId, buyerId, domains(domainName)')
        .eq('_id', orderId)
        .single();
      existingOrder = data;
    }

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

    if (status === 'disputed' && disputeReason) {
      updateData.disputeReason = disputeReason;
    }

    const { error } = await supabase
      .from('marketplace_orders')
      .update(updateData)
      .eq('_id', orderId);

    if (error) throw error;

    // On a fresh dispute (or a changed dispute reason): stamp the status-history
    // row with the reason and notify BOTH the publisher and the buyer by email
    // (same template, role-specific copy: publisher must fix the issue or the
    // order is refunded to the buyer). The DB trigger
    // (order_dispute_earnings_trigger) holds the credited earnings on its own.
    if (
      status === 'disputed' &&
      disputeReason &&
      existingOrder &&
      (existingOrder.status !== 'disputed' || existingOrder.disputeReason !== disputeReason)
    ) {
      try {
        const { data: histRows } = await supabase
          .from('order_status_history')
          .select('_id')
          .eq('orderId', orderId)
          .eq('newStatus', 'disputed')
          .is('reason', null)
          .order('createdAt', { ascending: false })
          .limit(1);
        if (histRows?.[0]) {
          await supabase
            .from('order_status_history')
            .update({ reason: disputeReason })
            .eq('_id', histRows[0]._id);
        }

        const recipients: { role: 'publisher' | 'buyer'; userId: string | null }[] = [
          { role: 'publisher', userId: existingOrder.publisherId },
          { role: 'buyer', userId: existingOrder.buyerId },
        ];

        for (const recipient of recipients) {
          if (!recipient.userId) continue;
          try {
            const { data: user } = await supabase
              .from('users')
              .select('email, fullName')
              .eq('_id', recipient.userId)
              .single();

            if (user?.email) {
              await sendTrueEmailer({
                to: [{ email: user.email, ...(user.fullName ? { name: user.fullName } : {}) }],
                subject: `Dispute opened on order #${existingOrder.orderNumber}`,
                htmlContent: formatOrderDisputeEmail({
                  role: recipient.role,
                  fullName: user.fullName,
                  orderNumber: existingOrder.orderNumber,
                  orderId,
                  domainName: existingOrder.domains?.domainName || null,
                  disputeReason,
                }),
                senderName: 'Linkwatcher Marketplace',
                senderEmail: 'marketplace@linkwatcher.io',
              });
            }
          } catch (recipientError) {
            // One recipient failing must not block the other.
            console.error(`Dispute email to ${recipient.role} failed:`, recipientError);
          }
        }
      } catch (notifyError) {
        // Never fail the status update because the notification side failed.
        console.error('Dispute notification failed:', notifyError);
      }
    }

    // Dispute settled (disputed -> completed or refunded): notify BOTH parties
    // with the same template. The DB trigger handles the money on its own
    // (completed releases the held earnings, refunded credits the buyer wallet).
    if (
      (status === 'completed' || status === 'refunded') &&
      existingOrder &&
      existingOrder.status === 'disputed'
    ) {
      try {
        const resolution = status as 'completed' | 'refunded';
        const recipients: { role: 'publisher' | 'buyer'; userId: string | null }[] = [
          { role: 'publisher', userId: existingOrder.publisherId },
          { role: 'buyer', userId: existingOrder.buyerId },
        ];

        for (const recipient of recipients) {
          if (!recipient.userId) continue;
          try {
            const { data: user } = await supabase
              .from('users')
              .select('email, fullName')
              .eq('_id', recipient.userId)
              .single();

            if (user?.email) {
              await sendTrueEmailer({
                to: [{ email: user.email, ...(user.fullName ? { name: user.fullName } : {}) }],
                subject:
                  resolution === 'completed'
                    ? `Dispute resolved on order #${existingOrder.orderNumber}`
                    : `Dispute resolved: order #${existingOrder.orderNumber} refunded`,
                htmlContent: formatOrderDisputeResolvedEmail({
                  role: recipient.role,
                  resolution,
                  fullName: user.fullName,
                  orderNumber: existingOrder.orderNumber,
                  orderId,
                  domainName: existingOrder.domains?.domainName || null,
                  disputeReason: existingOrder.disputeReason,
                }),
                senderName: 'Linkwatcher Marketplace',
                senderEmail: 'marketplace@linkwatcher.io',
              });
            }
          } catch (recipientError) {
            // One recipient failing must not block the other.
            console.error(`Dispute resolution email to ${recipient.role} failed:`, recipientError);
          }
        }
      } catch (notifyError) {
        // Never fail the status update because the notification side failed.
        console.error('Dispute resolution notification failed:', notifyError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
