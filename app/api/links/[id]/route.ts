import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: linkId } = await params;

  try {
    const body = await request.json();
    const { url, disabled, projectId } = body;

    const updateData: any = {};
    if (url !== undefined) updateData.url = url;
    if (disabled !== undefined) updateData.disabled = disabled;
    if (projectId !== undefined) updateData.projectId = projectId;

    const { data, error } = await supabase
      .from('links')
      .update(updateData)
      .eq('_id', linkId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update link', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: linkId } = await params;

  try {
    const { error } = await supabase
      .from('links')
      .delete()
      .eq('_id', linkId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Link deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete link', details: error?.message },
      { status: 500 }
    );
  }
}
