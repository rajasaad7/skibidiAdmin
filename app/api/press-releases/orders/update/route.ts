import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, action, ...data } = body;

    if (!orderId || !action) {
      return NextResponse.json({ success: false, error: 'Order ID and action are required' }, { status: 400 });
    }

    let updateData: any = {};
    const now = new Date().toISOString();

    switch (action) {
      case 'start_writing':
        updateData = {
          articleWritingStartedAt: now,
          status: 'article_writing'
        };
        break;

      case 'submit_article':
        if (!data.articleGoogleDocsLink) {
          return NextResponse.json({ success: false, error: 'Article Google Docs link is required' }, { status: 400 });
        }
        // Update the articleSubmittedAt timestamp on every submission (including resubmissions)
        updateData = {
          articleGoogleDocsLink: data.articleGoogleDocsLink,
          articleSubmittedAt: now,
          status: 'article_submitted'
        };
        break;

      case 'approve_article':
        updateData = {
          articleApprovedAt: now,
          status: 'article_approved'
        };
        break;

      case 'submit_published':
        if (!data.publishedUrl) {
          return NextResponse.json({ success: false, error: 'Published URL is required' }, { status: 400 });
        }
        updateData = {
          publishedUrl: data.publishedUrl,
          publishedAt: now,
          submittedAt: now,
          status: 'submitted'
        };
        break;

      case 'complete_order':
        updateData = {
          completedAt: now,
          status: 'completed'
        };
        break;

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    // Update the order
    const { data: order, error } = await supabase
      .from('press_release_orders')
      .update({
        ...updateData,
        updatedAt: now
      })
      .eq('_id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
