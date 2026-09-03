import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole, getAdminEmail } from '@/lib/auth';
import { sendTrueEmailer, formatOrderCancelledEmail } from '@/lib/email';

// POST /api/orders/cancel-refund
// Admin "Cancel & Refund" in favour of the buyer. Money + state move together
// in the SECURITY DEFINER RPC admin_cancel_order_refund_to_balance (atomic,
// idempotent, service_role only): status -> cancelled, full charge back to the
// buyer wallet ledger, reason stamped on the order + status history.
// A cancelled order never counts against the publisher (publisher_stats
// ignores it) and is hidden from the publisher's orders page in the app.
// Notifications + emails are best-effort and never fail the cancellation.
export async function POST(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if ((await getUserRole()) !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: { orderId?: string; reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!orderId) {
    return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ success: false, error: 'A reason is required' }, { status: 400 });
  }
  if (reason.length > 2000) {
    return NextResponse.json({ success: false, error: 'Reason is too long (max 2000 characters)' }, { status: 400 });
  }

  const adminEmail = await getAdminEmail();

  try {
    const { data, error } = await supabase.rpc('admin_cancel_order_refund_to_balance', {
      p_order_id: orderId,
      p_reason: reason,
      p_admin: adminEmail,
    });
    if (error) throw error;

    const result = (data || {}) as {
      success?: boolean;
      error?: string;
      status?: string;
      orderNumber?: string;
      previousStatus?: string;
      buyerId?: string | null;
      publisherId?: string | null;
      domainId?: string | null;
      refundAmount?: number;
      newBalance?: number | null;
      transactionId?: string | null;
    };

    if (!result.success) {
      const messages: Record<string, string> = {
        order_not_found: 'Order not found',
        invalid_input: 'A reason is required',
        already_cancelled: 'This order is already cancelled and refunded',
        not_cancellable: `This order cannot be cancelled from its current status (${result.status || 'unknown'}). Use the dispute or refund flow instead.`,
      };
      return NextResponse.json(
        { success: false, error: messages[result.error || ''] || 'Could not cancel this order', code: result.error },
        { status: result.error === 'order_not_found' ? 404 : 409 }
      );
    }

    const refundAmount = Number(result.refundAmount || 0);

    // Best-effort side effects: in-app notifications + emails to both parties.
    try {
      let domainName: string | null = null;
      if (result.domainId) {
        const { data: domain } = await supabase
          .from('domains')
          .select('domainName')
          .eq('_id', result.domainId)
          .maybeSingle();
        domainName = domain?.domainName || null;
      }
      const orderNumber = result.orderNumber || orderId;
      const siteLabel = domainName ? ` for ${domainName}` : '';

      const notifications: Record<string, unknown>[] = [];
      if (result.buyerId) {
        notifications.push({
          userId: result.buyerId,
          type: 'order_cancelled',
          title: refundAmount > 0 ? 'Order Cancelled & Refunded' : 'Order Cancelled',
          message: refundAmount > 0
            ? `Your order #${orderNumber}${siteLabel} was cancelled and $${refundAmount.toFixed(2)} was refunded to your LinkWatcher balance.`
            : `Your order #${orderNumber}${siteLabel} was cancelled.`,
          data: { role: 'buyer', orderId, orderNumber, actionUrl: `/marketplace/orders/${orderId}`, refundAmount },
          read: false,
        });
      }
      if (result.publisherId) {
        // No orderId / order link on purpose: the order is hidden from the publisher.
        notifications.push({
          userId: result.publisherId,
          type: 'order_cancelled',
          title: 'Order Cancelled',
          message: `Order #${orderNumber}${siteLabel} was cancelled by the Linkwatcher team. No action is needed and it does not affect your completion rate.`,
          data: { role: 'publisher', orderNumber, actionUrl: '/marketplace/publisher/orders' },
          read: false,
        });
      }
      if (notifications.length) {
        const { error: notifyError } = await supabase.from('marketplace_notifications').insert(notifications);
        if (notifyError) console.error('Cancel notification insert failed:', notifyError);
      }

      const recipients: { role: 'buyer' | 'publisher'; userId: string | null | undefined }[] = [
        { role: 'buyer', userId: result.buyerId },
        { role: 'publisher', userId: result.publisherId },
      ];
      for (const recipient of recipients) {
        if (!recipient.userId) continue;
        try {
          const { data: user } = await supabase
            .from('users')
            .select('email, fullName')
            .eq('_id', recipient.userId)
            .single();
          if (!user?.email) continue;
          await sendTrueEmailer({
            to: [{ email: user.email, ...(user.fullName ? { name: user.fullName } : {}) }],
            subject:
              recipient.role === 'buyer' && refundAmount > 0
                ? `Order #${orderNumber} cancelled and refunded`
                : `Order #${orderNumber} cancelled`,
            htmlContent: formatOrderCancelledEmail({
              role: recipient.role,
              fullName: user.fullName,
              orderNumber,
              orderId,
              domainName,
              reason,
              refundAmount: recipient.role === 'buyer' ? refundAmount : null,
            }),
            senderName: 'Linkwatcher Marketplace',
            senderEmail: 'marketplace@linkwatcher.io',
          });
        } catch (recipientError) {
          // One recipient failing must not block the other.
          console.error(`Cancel email to ${recipient.role} failed:`, recipientError);
        }
      }
    } catch (sideEffectError) {
      console.error('Cancel & Refund side effects failed:', sideEffectError);
    }

    return NextResponse.json({
      success: true,
      orderNumber: result.orderNumber,
      previousStatus: result.previousStatus,
      refundAmount,
      newBalance: result.newBalance ?? null,
      transactionId: result.transactionId ?? null,
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 });
  }
}
