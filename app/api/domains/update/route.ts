import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated or are system-managed
    const fieldsToRemove = ['_id', 'userId', 'verificationToken', 'createdAt', 'updatedAt', 'totalOrders', 'completedOrders', 'averageRating', 'totalReviews', 'seoMetricsUpdatedAt', 'verifiedAt', 'featuredUntil', 'featuredStartedAt', 'featuredPaymentId', 'featuredPosition', 'examplePosts', 'additionalInfo', 'publisherOfferings'];
    fieldsToRemove.forEach(field => delete updateData[field]);

    // Set updatedAt timestamp
    updateData.updatedAt = new Date().toISOString();

    // Update the domain
    const { data, error } = await supabase
      .from('domains')
      .update(updateData)
      .eq('_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating domain:', error);
      return NextResponse.json(
        { error: 'Failed to update domain', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      domain: data
    });

  } catch (error) {
    console.error('Error in domain update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
