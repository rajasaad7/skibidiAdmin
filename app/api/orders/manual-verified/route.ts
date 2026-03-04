import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const { orderId, manualVerified } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Update the manualVerified field
    const { error } = await supabase
      .from('marketplace_orders')
      .update({ manualVerified: manualVerified })
      .eq('_id', orderId);

    if (error) {
      console.error('Error updating manual verification:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Manual verification updated successfully'
    });

  } catch (error) {
    console.error('Error updating manual verification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update manual verification' },
      { status: 500 }
    );
  }
}
