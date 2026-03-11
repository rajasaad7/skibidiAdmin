import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, status, adminNotes } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
      if (status === 'reviewed') {
        updateData.reviewedAt = new Date().toISOString();

        // Get admin user ID from email
        const adminEmail = await getAdminEmail();
        const { data: adminUser } = await supabase
          .from('users')
          .select('_id')
          .eq('email', adminEmail)
          .single();

        if (adminUser) {
          updateData.reviewedBy = adminUser._id;
        }
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const { data, error } = await supabase
      .from('moderation_requests')
      .update(updateData)
      .eq('_id', requestId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      request: data
    });
  } catch (error) {
    console.error('Error updating moderation request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update moderation request' },
      { status: 500 }
    );
  }
}
